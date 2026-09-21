const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/data/product.json"), "utf8"));
const byId = id => products.find(product => product.id === id);

test("every product belongs to Men's, Women's or both, and has sizes", () => {
  for (const product of products) {
    assert.ok(Array.isArray(product.genders) && product.genders.length > 0, `product ${product.id} has no genders`);
    assert.ok(product.genders.every(g => g === "men" || g === "women"), `product ${product.id} has an invalid gender`);
    assert.ok(Array.isArray(product.sizes) && product.sizes.length > 0, `product ${product.id} has no sizes`);
  }
});

test("Men's section is unchanged; 8 and 9 are also in Women's; 11-18 are Women's only", () => {
  const men = products.filter(product => product.genders.includes("men")).map(product => product.id);
  assert.deepEqual(men, [1, 2, 3, 4, 7, 8, 9, 10]);

  const womenOnly = products.filter(product => !product.genders.includes("men")).map(product => product.id);
  assert.deepEqual(womenOnly, [11, 12, 13, 14, 15, 16, 17, 18]);

  assert.deepEqual(byId(8).genders, ["men", "women"]);
  assert.deepEqual(byId(9).genders, ["men", "women"]);
});

test("women's pricing stays inside the agreed ranges with distinct prices and MRPs", () => {
  const clothes = products.filter(product => product.id >= 13);
  const shoes = products.filter(product => product.category === "shoes");
  assert.equal(shoes.length, 2);
  assert.equal(clothes.length, 6);

  for (const item of clothes) {
    assert.ok(item.price >= 1999 && item.price <= 3999, `${item.name} price`);
    assert.ok(item.oldPrice >= 7999 && item.oldPrice <= 9999, `${item.name} MRP`);
  }
  for (const item of shoes) {
    assert.ok(item.price >= 1999 && item.price <= 6999, `${item.name} price`);
    assert.ok(item.oldPrice >= 3999 && item.oldPrice <= 9999, `${item.name} MRP`);
  }

  const women = products.filter(product => product.id >= 11);
  assert.equal(new Set(women.map(product => product.price)).size, women.length);
  assert.equal(new Set(women.map(product => product.oldPrice)).size, women.length);
});

test("shoes use shoe sizes, clothes use S-XL, and every image exists", () => {
  for (const shoe of products.filter(product => product.category === "shoes")) {
    assert.deepEqual(shoe.sizes, ["3", "4", "5", "6", "7", "8"]);
  }
  assert.deepEqual(byId(13).sizes, ["S", "M", "L", "XL"]);

  for (const product of products) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", product.image)), `missing image ${product.image}`);
  }
});
