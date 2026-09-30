const test = require("node:test");
const assert = require("node:assert/strict");
const Store = require("../assets/js/noir-store");

test("formatINR uses Indian digit grouping", () => {
  assert.equal(Store.formatINR(2499), "₹2,499");
  assert.equal(Store.formatINR(125000), "₹1,25,000");
});

test("titleCase tidies catalogue names", () => {
  assert.equal(Store.titleCase("luxury jersey"), "Luxury Jersey");
  assert.equal(Store.titleCase("Noir BLACK Hoodie"), "Noir Black Hoodie");
  assert.equal(Store.titleCase(null), "");
});

test("categoryLabel maps known categories and title-cases the rest", () => {
  assert.equal(Store.categoryLabel("hoodie"), "Hoodies");
  assert.equal(Store.categoryLabel("scarf"), "Scarf");
});

test("parseWishlist keeps only unique positive integer ids", () => {
  assert.deepEqual(Store.parseWishlist('[1,2,2,"3",-1,0,"x",1.5]'), [1, 2, 3]);
  assert.deepEqual(Store.parseWishlist("not json"), []);
  assert.deepEqual(Store.parseWishlist('{"a":1}'), []);
  assert.deepEqual(Store.parseWishlist(null), []);
});

test("toggleInList adds a missing id and removes a saved one without mutating", () => {
  const list = [1, 2];
  assert.deepEqual(Store.toggleInList(list, 3), [1, 2, 3]);
  assert.deepEqual(Store.toggleInList(list, 2), [1]);
  assert.deepEqual(list, [1, 2]);
});

test("renderCard escapes names, shows the sale tag and old price only when they apply", () => {
  const html = Store.renderCard({ id: 7, name: '<b>hoodie</b>', price: 100, oldPrice: 200, sale: true, image: "a.png" });
  assert.ok(!html.includes("<b>"));
  assert.match(html, /n-tag/);
  assert.match(html, /₹200/);
  assert.match(html, /product\.html\?id=7/);

  const plain = Store.renderCard({ id: 8, name: "tee", price: 100, oldPrice: 100, sale: false, image: "b.png" });
  assert.ok(!plain.includes("n-tag"));
  assert.ok(!plain.includes("<s>"));
});
