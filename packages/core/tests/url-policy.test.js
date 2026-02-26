import test from "node:test";
import assert from "node:assert/strict";
import {
  isInternalPublicPage,
  normalizeUrlForCrawl,
} from "../src/url-policy.js";

test("accepts same-domain public pages", () => {
  const base = "https://agenciapoti.com.br";
  assert.equal(
    isInternalPublicPage(base, "https://agenciapoti.com.br/sobre"),
    true
  );
  assert.equal(
    isInternalPublicPage(base, "https://agenciapoti.com.br/contato"),
    true
  );
});

test("rejects blog and admin pages", () => {
  const base = "https://agenciapoti.com.br";
  assert.equal(
    isInternalPublicPage(base, "https://agenciapoti.com.br/blog/post-1"),
    false
  );
  assert.equal(
    isInternalPublicPage(base, "https://agenciapoti.com.br/admin"),
    false
  );
  assert.equal(
    isInternalPublicPage(base, "https://agenciapoti.com.br/wp-admin"),
    false
  );
});

test("does not reject public pages with similar words", () => {
  const base = "https://agenciapoti.com.br";
  assert.equal(
    isInternalPublicPage(base, "https://agenciapoti.com.br/blogueira"),
    true
  );
  assert.equal(
    isInternalPublicPage(base, "https://agenciapoti.com.br/administracao"),
    true
  );
});

test("rejects external domains", () => {
  const base = "https://agenciapoti.com.br";
  assert.equal(
    isInternalPublicPage(base, "https://outrodominio.com/sobre"),
    false
  );
});

test("normalizes duplicate query/hash urls", () => {
  const url = normalizeUrlForCrawl(
    "https://agenciapoti.com.br/sobre?utm_source=x#section"
  );
  assert.equal(url, "https://agenciapoti.com.br/sobre");
});
