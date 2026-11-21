/** Datos de un anuncio tal como se leen de la página, sin interpretar. */
export interface RawListing {
  title: string | null;
  price: string | null;
  location: string | null;
  features: string[];
  /** Líneas de la dirección (`#headerMap`): calle, barrio, distrito, municipio, provincia. */
  address: string[];
}

/** Datos que se envían a Caseo. Los campos ausentes se omiten. */
export interface Listing {
  listing_url: string;
  name?: string;
  rent?: string;
  sale_price?: string;
  location?: string;
  area_m2?: number;
  street?: string;
  municipality?: string;
  province?: string;
}

const LISTING_URL = /^https:\/\/www\.idealista\.com\/(?:[a-z]{2}\/)?inmueble\/(\d+)\/?(?:[?#].*)?$/;

/** Devuelve el identificador del anuncio si la URL es una ficha individual de Idealista. */
export function listingId(url: string | undefined): string | null {
  return url?.match(LISTING_URL)?.[1] ?? null;
}

/**
 * Se ejecuta dentro de la pestaña de Idealista mediante `scripting.executeScript`,
 * así que no puede usar nada de fuera de la función.
 */
export function readListingFromPage(): RawListing {
  const text = (selector: string) =>
    document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() || null;

  return {
    title:
      text(".main-info__title-main") ??
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() ??
      null,
    price: text(".info-data-price") ?? text(".info-data .txt-bold"),
    location: text(".main-info__title-minor"),
    features: Array.from(
      document.querySelectorAll(".info-features span, .details-property_features li"),
      (element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "",
    ),
    address: Array.from(
      document.querySelectorAll("#headerMap li"),
      (element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "",
    ).filter(Boolean),
  };
}

/** Convierte lo leído de la página en los campos que acepta Caseo. */
export function toListing(raw: RawListing, url: string): Listing {
  const id = listingId(url);
  if (!id) throw new Error("La pestaña no es la ficha de un anuncio de Idealista.");

  const listing: Listing = { listing_url: `https://www.idealista.com/inmueble/${id}/` };
  const price = raw.price?.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?\s*€/);
  const area = raw.features.map((f) => f.match(/^(\d{1,3}(?:\.\d{3})*|\d+)\s*m²/)).find(Boolean);

  if (raw.title) listing.name = raw.title.slice(0, 255);
  if (price) {
    const [, euros = "", cents] = price;
    const amount = euros.replaceAll(".", "") + (cents ? `,${cents}` : "");
    // Idealista muestra "€/mes" solo en alquileres; cualquier otro precio es de venta.
    if (/€\s*\/\s*mes/.test(raw.price ?? "")) listing.rent = amount;
    else listing.sale_price = amount;
  }
  if (raw.location) listing.location = raw.location.slice(0, 255);
  if (area) listing.area_m2 = Number((area[1] ?? "").replaceAll(".", ""));
  Object.assign(listing, toAddress(raw.address));

  return listing;
}

/**
 * `#headerMap` lista de lo más concreto a lo más general, por ejemplo:
 * "Calle del Duque de Sesto", "Barrio Goya", "Distrito Barrio de Salamanca",
 * "Madrid", "Madrid capital, Madrid". La calle no aparece si el anunciante la oculta.
 */
function toAddress(lines: string[]): Pick<Listing, "street" | "municipality" | "province"> {
  if (lines.length < 2) return {};

  const first = lines[0] ?? "";
  const province = lines.at(-1)?.split(", ").at(-1);
  const municipality = lines.at(-2);
  const hasStreet = lines.length > 2 && !/^(barrio|distrito|zona|urbanizaci[oó]n)\b/i.test(first);

  return {
    ...(hasStreet && { street: first.slice(0, 255) }),
    ...(municipality && { municipality: municipality.slice(0, 255) }),
    ...(province && { province: province.slice(0, 255) }),
  };
}
