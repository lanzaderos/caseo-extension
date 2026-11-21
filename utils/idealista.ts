/** Datos de un anuncio tal como se leen de la página, sin interpretar. */
export interface RawListing {
  title: string | null;
  price: string | null;
  location: string | null;
  features: string[];
}

/** Datos que se envían a Caseo. Los campos ausentes se omiten. */
export interface Listing {
  listing_url: string;
  name?: string;
  rent?: string;
  location?: string;
  area_m2?: number;
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
  };
}

/** Convierte lo leído de la página en los campos que acepta Caseo. */
export function toListing(raw: RawListing, url: string): Listing {
  const id = listingId(url);
  if (!id) throw new Error("La pestaña no es la ficha de un anuncio de Idealista.");

  const listing: Listing = { listing_url: `https://www.idealista.com/inmueble/${id}/` };
  const rent = raw.price?.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?\s*€/);
  const area = raw.features.map((f) => f.match(/^(\d{1,3}(?:\.\d{3})*|\d+)\s*m²/)).find(Boolean);

  if (raw.title) listing.name = raw.title.slice(0, 255);
  if (rent) {
    const [, euros = "", cents] = rent;
    listing.rent = euros.replaceAll(".", "") + (cents ? `,${cents}` : "");
  }
  if (raw.location) listing.location = raw.location.slice(0, 255);
  if (area) listing.area_m2 = Number((area[1] ?? "").replaceAll(".", ""));

  return listing;
}
