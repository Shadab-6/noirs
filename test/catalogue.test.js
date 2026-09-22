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

test("Sweatshirts are available to men and women; 8 and 9 are also in Women's; 11-18 are Women's only", () => {
  const men = products.filter(product => product.genders.includes("men")).map(product => product.id);
  assert.deepEqual(men, [1, 2, 3, 4, 23, 24, 25, 7, 8, 9, 10]);

  const womenOnly = products.filter(product => !product.genders.includes("men")).map(product => product.id);
  assert.deepEqual(womenOnly, [11, 12, 13, 14, 15, 16, 17, 18]);

  assert.deepEqual(byId(8).genders, ["men", "women"]);
  assert.deepEqual(byId(9).genders, ["men", "women"]);
});


test("all current sweatshirt display names are descriptive", () => {
  assert.deepEqual(
    products.filter(product => product.category === "sweatshirt").map(product => product.name),
    ["Sage Curve Sweatshirt", "Ivory Panel Sweatshirt", "Graphite Panel Sweatshirt", "Mocha Curve Sweatshirt", "Urban Panel Sweatshirt", "Forest Collared Zip Sweatshirt", "Forest Collared Half-Zip Sweatshirt"]
  );
});

test("replacement sweatshirt pricing stays within ₹1,999–₹3,999 with MRPs from ₹5,999–₹8,999", () => {
  const replacements = products.filter(product => [1,2,3,4].includes(product.id));
  assert.equal(replacements.length, 4);
  for (const item of replacements) {
    assert.ok(item.price >= 1999 && item.price <= 3999, `${item.name} price`);
    assert.ok(item.oldPrice >= 5999 && item.oldPrice <= 8999, `${item.name} MRP`);
  }

  const addedSweatshirts = products.filter(product => [23, 24].includes(product.id));
  assert.equal(addedSweatshirts.length, 2);
  for (const item of addedSweatshirts) {
    assert.equal(item.price, 3999, `${item.name} price`);
    assert.ok(item.oldPrice >= 5999 && item.oldPrice <= 7999, `${item.name} MRP`);
  }

  const forestHalfZip = byId(25);
  assert.equal(forestHalfZip.price, 1999);
  assert.equal(forestHalfZip.oldPrice, 3999);

  const clothes = products.filter(product => product.id >= 13 && product.id <= 18);
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

});

test("shoes use shoe sizes, clothes use S-XL, and every image exists", () => {
  for (const shoe of products.filter(product => product.category === "shoes")) {
    assert.deepEqual(shoe.sizes, ["3", "4", "5", "6", "7", "8"]);
  }
  assert.deepEqual(byId(13).sizes, ["S", "M", "L", "XL"]);
  assert.deepEqual(byId(23).sizes, ["S", "M", "L", "XL"]);

  for (const product of products) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", product.image)), `missing image ${product.image}`);
  }
});

test("legacy product IDs 1-4 are now the replacement sweatshirt cards", () => {
  const legacy = products.filter(product => [1,2,3,4].includes(Number(product.id)));
  assert.equal(legacy.length, 4);
  assert.deepEqual(legacy.map(product => product.name), [
    "Sage Curve Sweatshirt",
    "Ivory Panel Sweatshirt",
    "Graphite Panel Sweatshirt",
    "Mocha Curve Sweatshirt"
  ]);
  assert.deepEqual(legacy.map(product => product.image), [
    "assets/images/item1(1).png",
    "assets/images/item2(1).png",
    "assets/images/item3(1).png",
    "assets/images/item4(1).png"
  ]);
  for (const item of legacy) {
    assert.equal(item.category, "sweatshirt");
    assert.ok(item.price >= 1999 && item.price <= 3999);
    assert.ok(item.oldPrice >= 5999 && item.oldPrice <= 8999);
  }
  assert.ok(products.some(product => product.id === 7));
  assert.ok(products.some(product => product.id === 18));
});

test("replacement sweatshirt image filenames remain item1(1) through item4(1)", () => {
  for (const id of [1,2,3,4]) {
    const item = byId(id);
    assert.match(item.image, new RegExp(`assets/images/item${id}\\(1\\)\\.png$`));
  }
});


test("shared sweatshirt images use one canonical asset each with no retired duplicate WebP files", () => {
  const canonical = new Set([
    "assets/images/item1(1).png",
    "assets/images/item2(1).png",
    "assets/images/item3(1).png",
    "assets/images/item4(1).png"
  ]);

  for (const id of [1, 2, 3, 4]) {
    assert.ok(canonical.has(byId(id).image), `unexpected image for product ${id}: ${byId(id).image}`);
  }

  for (const retired of [
    "assets/images/sweatshirt-arc-paneled.webp",
    "assets/images/sweatshirt-contrast-curve.webp",
    "assets/images/sweatshirt-earth-tone.webp",
    "assets/images/sweatshirt-modern-curve.webp"
  ]) {
    assert.equal(fs.existsSync(path.join(__dirname, "..", retired)), false, `retired duplicate still exists: ${retired}`);
  }
});


test("new forest half-zip sweatshirt is in the current catalogue", () => {
  const item = byId(25);
  assert.ok(item, "product 25 is present");
  assert.equal(item.name, "Forest Collared Half-Zip Sweatshirt");
  assert.equal(item.price, 1999);
  assert.equal(item.oldPrice, 3999);
  assert.equal(item.category, "sweatshirt");
  assert.deepEqual(item.genders, ["men", "women"]);
  assert.deepEqual(item.sizes, ["S", "M", "L", "XL"]);
  assert.equal(item.image, "assets/images/sweatshirt-forest-zip-collar.webp");
  assert.ok(fs.existsSync(path.join(__dirname, "..", item.image)));
});
