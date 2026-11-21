import assert from "node:assert/strict";
import { test } from "node:test";

import { imageUrls, listingId } from "./idealista.ts";

test("reconoce solo fichas individuales de Idealista", () => {
  assert.equal(listingId("https://www.idealista.com/inmueble/123456/"), "123456");
  assert.equal(listingId("https://www.idealista.com/en/inmueble/42/?xtmc=1"), "42");
  assert.equal(listingId("https://www.idealista.com/alquiler-viviendas/madrid/"), null);
  assert.equal(listingId("https://www.idealista.com.evil.test/inmueble/1/"), null);
  assert.equal(listingId(undefined), null);
});

test("extrae fotos de Idealista de atributos y scripts sin repetir", () => {
  const photo = "https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/aa/1.jpg";

  assert.deepEqual(
    imageUrls([
      `${photo} 1x, https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/aa/2.webp 2x`,
      `{"imageUrl":"${photo}"}`,
      "https://evil.test/x.jpg",
      null,
    ]),
    [photo, "https://img4.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/aa/2.webp"],
  );
});
