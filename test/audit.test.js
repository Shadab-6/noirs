const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("current audit migration preserves cancelled orders and accepts shoe sizes", () => {
  const file = path.join(root, "supabase", "migrations", "20260922220000_noir_current_audit_fix.sql");
  const sql = fs.readFileSync(file, "utf8");
  assert.match(sql, /update public\.orders\s+set status = 'cancelled'/i);
  assert.match(sql, /char_length\(size\) >= 1 and char_length\(size\) <= 6/i);
});

test("product rendering escapes backend-controlled image URLs", () => {
  const file = fs.readFileSync(path.join(root, "assets", "js", "product.js"), "utf8");
  assert.match(file, /src="\$\{escapeHTML\(item\.image\)\}"/);
  assert.match(file, /src="\$\{escapeHTML\(product\.image\)\}"/);
});


test("home and API current sweatshirt sets replace retired product 24 with 25", () => {
  const home = fs.readFileSync(path.join(root, "assets", "js", "products.js"), "utf8");
  const api = fs.readFileSync(path.join(root, "assets", "js", "noir-api.js"), "utf8");
  assert.match(home, /FEATURED_SWEATSHIRT_IDS = \[19, 20, 21, 22, 23, 25\]/);
  assert.match(api, /CURRENT_SWEATSHIRT_IDS = new Set\(\[23, 25\]\)/);
  assert.doesNotMatch(home, /FEATURED_SWEATSHIRT_IDS = \[[^\]]*24/);
  assert.doesNotMatch(api, /CURRENT_SWEATSHIRT_IDS = new Set\(\[[^\]]*24/);
});


test("canonical sweatshirt catalogue has no duplicate replacement IDs", () => {
  const products = JSON.parse(fs.readFileSync(path.join(root, "assets", "data", "product.json"), "utf8"));
  const ids = new Set(products.map(p => p.id));
  assert.equal(ids.size, products.length);
  for (const id of [1, 2, 3, 4, 23, 25]) assert.ok(ids.has(id));
  for (const id of [19, 20, 21, 22]) assert.equal(ids.has(id), false);
});
