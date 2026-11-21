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

test("convierte los datos de la página en campos de Caseo", () => {
  const listing = toListing(
    {
      title: "Piso en calle Mayor",
      price: "1.250 €/mes",
      location: "Centro, Madrid",
      features: ["3 hab.", "1.020 m² construidos", "Planta 2ª"],
    },
    "https://www.idealista.com/inmueble/987/?ref=x",
  );

  assert.deepEqual(listing, {
    listing_url: "https://www.idealista.com/inmueble/987/",
    name: "Piso en calle Mayor",
    rent: "1250",
    location: "Centro, Madrid",
    area_m2: 1020,
  });
});

test("omite los campos que faltan", () => {
  const listing = toListing(
    { title: null, price: "Consultar", location: null, features: [] },
    "https://www.idealista.com/inmueble/1/",
  );

  assert.deepEqual(listing, { listing_url: "https://www.idealista.com/inmueble/1/" });
});
