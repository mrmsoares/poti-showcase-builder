import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetName, slugify } from "../src/naming.js";

test("slugify removes accents and spaces", () => {
  assert.equal(slugify("Cliente São José"), "cliente-sao-jose");
});

test("buildAssetName follows deterministic pattern", () => {
  const name = buildAssetName({
    clientName: "Acme LTDA",
    pageSlug: "contato",
    media: "image",
    viewport: "desktop",
    variant: "raw",
    index: "fold-001",
    extension: "png",
  });

  assert.equal(name, "acme-ltda__contato__image__desktop__raw__fold-001.png");
});
