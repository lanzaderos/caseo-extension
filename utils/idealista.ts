/**
 * Datos leídos de la ficha, sin interpretar. Caseo los interpreta en el
 * servidor (modo, precio, dirección, alquiler temporal…), así que mejorar la
 * interpretación no requiere publicar una nueva versión de la extensión.
 */
export interface RawListing {
  url: string;
  title: string | null;
  price: string | null;
  location: string | null;
  description: string | null;
  /** Características destacadas bajo el precio (superficie, habitaciones…). */
  features: string[];
  /** Características básicas y del edificio. */
  details: string[];
  /** Líneas de `#headerMap`: calle, barrio, distrito, municipio, provincia. */
  address: string[];
  images: string[];
}

const LISTING_URL = /^https:\/\/www\.idealista\.com\/(?:[a-z]{2}\/)?inmueble\/(\d+)\/?(?:[?#].*)?$/;

/** Devuelve el identificador del anuncio si la URL es una ficha individual de Idealista. */
export function listingId(url: string | undefined): string | null {
  return url?.match(LISTING_URL)?.[1] ?? null;
}

/** Extrae URLs de fotos de Idealista de cualquier texto (atributos, scripts…), sin repetir. */
export function imageUrls(sources: (string | null | undefined)[]): string[] {
  const pattern = /https:\/\/img\d*\.idealista\.com\/[^\s"'\\<>,]+?\.(?:jpe?g|webp|png)/gi;
  return [...new Set(sources.flatMap((source) => source?.match(pattern) ?? []))].slice(0, 1000);
}

/**
 * Se ejecuta dentro de la pestaña de Idealista mediante `scripting.executeScript`,
 * así que no puede usar nada de fuera de la función. Tolera campos ausentes.
 */
export function readListingFromPage(): RawListing {
  const clean = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() || null;
  const text = (selector: string) => clean(document.querySelector(selector)?.textContent);
  const texts = (selector: string) =>
    Array.from(document.querySelectorAll(selector), (element) => clean(element.textContent)).filter(
      (value): value is string => value !== null,
    );

  // Fotos: atributos de las imágenes y URLs presentes en los scripts de la página.
  const pattern = /https:\/\/img\d*\.idealista\.com\/[^\s"'\\<>,]+?\.(?:jpe?g|webp|png)/gi;
  const sources = [
    ...Array.from(document.querySelectorAll("img, source"), (element) =>
      ["src", "srcset", "data-src", "data-ondemand-img"].map((name) => element.getAttribute(name)),
    ).flat(),
    document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content,
    ...Array.from(document.scripts, (script) => script.textContent),
  ];
  const images = [...new Set(sources.flatMap((source) => source?.match(pattern) ?? []))];

  return {
    url: location.href,
    title:
      text(".main-info__title-main") ??
      clean(document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content),
    price: text(".info-data-price") ?? text(".info-data .txt-bold"),
    location: text(".main-info__title-minor"),
    // innerText conserva los saltos entre párrafos; textContent los junta ("GOYAUbicada").
    description:
      document
        .querySelector<HTMLElement>(".comment")
        ?.innerText?.replace(/[ \t]+/g, " ")
        .trim() || null,
    features: texts(".info-features span"),
    details: texts(".details-property_features li"),
    address: texts("#headerMap li"),
    // Cada foto aparece en varios tamaños y formatos; Caseo se queda con una URL por foto.
    images: images.slice(0, 1000),
  };
}
