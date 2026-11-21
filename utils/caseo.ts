import { storage } from "#imports";

import type { Listing } from "./idealista.ts";

/** Origen del servidor de Caseo, por ejemplo `https://caseo.midominio.com`. */
export const serverUrl = storage.defineItem<string | null>("local:serverUrl", { fallback: null });
export const token = storage.defineItem<string | null>("local:token", { fallback: null });
/** `state` de la conexión en curso; vive solo mientras el navegador está abierto. */
export const pendingState = storage.defineItem<string | null>("session:connectState", {
  fallback: null,
});

export class Unauthorized extends Error {}

/** Normaliza lo que escribe el usuario a un origen. Solo admite http en localhost. */
export function parseServerUrl(input: string): string {
  const url = new URL(/^https?:\/\//.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);

  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new Error("La dirección de Caseo debe empezar por https://");
  }

  return url.origin;
}

export function originPattern(origin: string): string {
  const url = new URL(origin);
  return `${url.protocol}//${url.hostname}/*`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const [server, bearer] = await Promise.all([serverUrl.getValue(), token.getValue()]);
  if (!server || !bearer) throw new Unauthorized();

  const response = await fetch(server + path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${bearer}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (response.status === 401) {
    await token.removeValue();
    throw new Unauthorized();
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(body) ?? `Caseo respondió ${response.status}.`);
  return body as T;
}

export const me = () => request<{ email: string }>("/api/extension/me");

export interface ImportResult {
  id: number;
  name: string;
  result: "created" | "updated";
  url: string;
}

export const importListing = (listing: Listing) =>
  request<ImportResult>("/api/extension/listings", {
    method: "POST",
    body: JSON.stringify(listing),
  });

export async function disconnect() {
  await request("/api/extension/session", { method: "DELETE" }).catch(() => undefined);
  await token.removeValue();
}

const FIELDS: Record<string, string> = {
  listing_url: "Anuncio",
  name: "Título",
  rent: "Precio",
  sale_price: "Precio",
  street: "Calle",
  municipality: "Municipio",
  province: "Provincia",
  location: "Ubicación",
  area_m2: "Superficie",
};

function errorMessage(body: unknown): string | null {
  const errors = (body as { errors?: Record<string, string[]> } | null)?.errors;
  if (!errors) return null;

  return Object.entries(errors)
    .map(([field, messages]) => `${FIELDS[field] ?? field}: ${messages.join(", ")}`)
    .join(". ");
}
