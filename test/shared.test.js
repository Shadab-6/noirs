const test = require("node:test");
const assert = require("node:assert/strict");
const Shared = require("../assets/js/noir-shared");

const percent10 = { type: "percent", value: 10, minSubtotal: 0 };
const flat500 = { type: "fixed", value: 500, minSubtotal: 0 };

test("coupon maths: percent, fixed cap, minimum subtotal, no coupon", () => {
  assert.equal(Shared.getDiscount(10000, percent10), 1000);
  assert.equal(Shared.getDiscount(10498, percent10), 1050); // rounds like the database does
  assert.equal(Shared.getDiscount(300, flat500), 300);
  assert.equal(Shared.getDiscount(5000, { ...percent10, minSubtotal: 6000 }), 0);
  assert.equal(Shared.getDiscount(5000, null), 0);
  assert.equal(Shared.getDiscount(0, percent10), 0);
});

test("shipping: free from the threshold, otherwise flat fee, express always charged", () => {
  assert.equal(Shared.getShipping(1998, "standard"), 99);
  assert.equal(Shared.getShipping(1999, "standard"), 0);
  assert.equal(Shared.getShipping(5000, "express"), 199);
  assert.equal(Shared.getShipping(0, "express"), 0);
});

test("calculate() combines subtotal, coupon and shipping", () => {
  assert.deepEqual(
    Shared.calculate({ subtotal: 8000, coupon: percent10, shippingMethod: "express" }),
    { subtotal: 8000, discount: 800, shipping: 199, total: 7399 }
  );
});

test("setShippingMethods() lets database rows override the defaults", () => {
  const original = JSON.parse(JSON.stringify(Shared.SHIPPING_METHODS));

  Shared.setShippingMethods([
    { id: "standard", label: "Standard", eta: "3–7 business days", minDays: 3, maxDays: 7, fee: 149, freeFrom: 4999 },
    { id: "express", label: "Express", eta: "1–3 business days", minDays: 1, maxDays: 3, fee: 249, freeFrom: null }
  ]);
  assert.equal(Shared.getShipping(3000, "standard"), 149);
  assert.equal(Shared.getShipping(5000, "standard"), 0);
  assert.equal(Shared.getShipping(5000, "express"), 249);

  Shared.setShippingMethods(null); // ignored
  assert.equal(Shared.getShipping(3000, "standard"), 149);

  Shared.setShippingMethods(Object.values(original)); // restore defaults
  assert.equal(Shared.getShipping(1000, "standard"), 99);
});

test("shipping methods carry numeric delivery windows", () => {
  assert.deepEqual([Shared.SHIPPING_METHODS.standard.minDays, Shared.SHIPPING_METHODS.standard.maxDays], [3, 7]);
  assert.deepEqual([Shared.SHIPPING_METHODS.express.minDays, Shared.SHIPPING_METHODS.express.maxDays], [1, 3]);
});

test("phone numbers are normalised to 10 digits or rejected", () => {
  assert.equal(Shared.normalizePhone("+91 98765-43210"), "9876543210");
  assert.equal(Shared.normalizePhone("09876543210"), "9876543210");
  assert.equal(Shared.normalizePhone("919876543210"), "9876543210");
  assert.equal(Shared.normalizePhone("1234567890"), null);
});

test("checkout field validation", () => {
  const errors = Shared.validateCheckoutFields({ email: "nope", name: "", phone: "123", address: "x", city: "", state: "", pin: "012345" });
  assert.deepEqual(Object.keys(errors).sort(), ["address", "city", "email", "name", "phone", "pin", "state"]);

  assert.deepEqual(
    Shared.validateCheckoutFields({ email: "a@b.co", name: "Al", phone: "9876543210", address: "12 Park Road", city: "Delhi", state: "Delhi", pin: "110016" }),
    {}
  );
});

test("isValidEmail accepts normal addresses and rejects malformed ones", () => {
  assert.equal(Shared.isValidEmail("  hello@noir.in "), true);
  assert.equal(Shared.isValidEmail("hello@noir"), false);
  assert.equal(Shared.isValidEmail("hello noir@x.in"), false);
  assert.equal(Shared.isValidEmail(""), false);
  assert.equal(Shared.isValidEmail("a".repeat(250) + "@x.in"), false);
});
