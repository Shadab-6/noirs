const test = require("node:test");
const assert = require("node:assert/strict");
const NoirGate = require("../assets/js/checkout-gate");

test("only known pages are accepted as the place to go after signing in", () => {
  assert.equal(NoirGate.safeNext("checkout.html"), "checkout.html");
  assert.equal(NoirGate.safeNext(" checkout.html "), "checkout.html");
  for (const bad of ["", null, undefined, "https://evil.example", "//evil.example", "/checkout.html", "javascript:alert(1)", "account.html", "../checkout.html"]) {
    assert.equal(NoirGate.safeNext(bad), "", `should reject ${bad}`);
  }
});

test("the sign in / create account links carry the mode and where to return", () => {
  assert.equal(NoirGate._accountUrl("signin", "checkout.html"), "account.html?mode=signin&next=checkout.html");
  assert.equal(NoirGate._accountUrl("create", "checkout.html"), "account.html?mode=create&next=checkout.html");
});
