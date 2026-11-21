import assert from "node:assert/strict";
import { test } from "node:test";

import { listingId, toListing } from "./idealista.ts";

test("reconoce solo fichas individuales de Idealista", () => {
  assert.equal(listingId("https://www.idealista.com/inmueble/123456/"), "123456");
  assert.equal(listingId("https://www.idealista.com/en/inmueble/42/?xtmc=1"), "42");
  assert.equal(listingId("https://www.idealista.com/alquiler-viviendas/madrid/"), null);
  assert.equal(listingId("https://www.idealista.com.evil.test/inmueble/1/"), null);
  assert.equal(listingId(undefined), null);
});

test("convierte un alquiler en campos de Caseo", () => {
  const listing = toListing(
    {
      title: "Piso en calle Mayor",
      price: "1.250 €/mes",
      location: "Centro, Madrid",
      features: ["3 hab.", "1.020 m² construidos", "Planta 2ª"],
      address: ["Barrio Centro", "Madrid", "Madrid capital, Madrid"],
    },
    "https://www.idealista.com/inmueble/987/?ref=x",
  );

  assert.deepEqual(listing, {
    listing_url: "https://www.idealista.com/inmueble/987/",
    name: "Piso en calle Mayor",
    rent: "1250",
    location: "Centro, Madrid",
    area_m2: 1020,
    municipality: "Madrid",
    province: "Madrid",
  });
});

// Datos leídos de una ficha real (https://www.idealista.com/inmueble/112450146/).
test("convierte una venta real con su dirección", () => {
  const listing = toListing(
    {
      title: "Piso en venta en Calle del Duque de Sesto",
      price: "1.500.000 €",
      location: "Goya, Madrid",
      features: ["117 m²", "3 hab.", "5ª planta exterior con ascensor", "117 m² construidos"],
      address: [
        "Calle del Duque de Sesto",
        "Barrio Goya",
        "Distrito Barrio de Salamanca",
        "Madrid",
        "Madrid capital, Madrid",
      ],
    },
    "https://www.idealista.com/inmueble/112450146/",
  );

  assert.deepEqual(listing, {
    listing_url: "https://www.idealista.com/inmueble/112450146/",
    name: "Piso en venta en Calle del Duque de Sesto",
    sale_price: "1500000",
    location: "Goya, Madrid",
    area_m2: 117,
    street: "Calle del Duque de Sesto",
    municipality: "Madrid",
    province: "Madrid",
  });
});

test("omite los campos que faltan", () => {
  const listing = toListing(
    { title: null, price: "Consultar", location: null, features: [], address: [] },
    "https://www.idealista.com/inmueble/1/",
  );

  assert.deepEqual(listing, { listing_url: "https://www.idealista.com/inmueble/1/" });
});
