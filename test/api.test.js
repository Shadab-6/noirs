const test = require("node:test");
const assert = require("node:assert/strict");

globalThis.NOIR_SUPABASE = { url: "https://example.supabase.co", key: "sb_publishable_test" };
const NoirApi = require("../assets/js/noir-api");

// Minimal fetch stub: records calls and answers from a queue of { status, body } or Error.
function stubFetch(...replies) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => JSON.stringify(reply.body), json: async () => reply.body };
  };
  return calls;
}

test.beforeEach(() => NoirApi.resetCache());

test("getProducts reads the products table with the publishable key", async () => {
  const calls = stubFetch({ status: 200, body: [{ id: 1, name: "A", price: 100, oldPrice: 200 }] });
  const products = await NoirApi.getProducts();

  assert.equal(products.length, 1);
  assert.match(calls[0].url, /^https:\/\/example\.supabase\.co\/rest\/v1\/products\?select=.*oldPrice:old_price/);
  assert.equal(calls[0].options.headers.apikey, "sb_publishable_test");
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test("getProducts falls back to the local list when Supabase is unreachable", async () => {
  stubFetch(new Error("offline"), { status: 200, body: [{ id: 9, name: "Local" }] });
  const products = await NoirApi.getProducts();
  assert.equal(products[0].name, "Local");
});

test("getShippingMethods returns null on failure so defaults stay in place", async () => {
  stubFetch({ status: 500, body: { message: "boom" } });
  assert.equal(await NoirApi.getShippingMethods(), null);
});

test("validateCoupon maps the database answer", async () => {
  const calls = stubFetch(
    { status: 200, body: { valid: true, code: "NOIR10", type: "percent", value: 10, minSubtotal: 0, discount: 1000 } },
    { status: 200, body: { valid: false, message: "Invalid coupon code." } },
    new Error("offline")
  );

  const ok = await NoirApi.validateCoupon("noir10", 10000);
  assert.deepEqual(ok.coupon, { code: "NOIR10", type: "percent", value: 10, minSubtotal: 0 });
  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/validate_coupon");
  assert.deepEqual(JSON.parse(calls[0].options.body), { p_code: "noir10", p_subtotal: 10000 });

  const bad = await NoirApi.validateCoupon("nope", 10000);
  assert.equal(bad.valid, false);
  assert.equal(bad.message, "Invalid coupon code.");

  const offline = await NoirApi.validateCoupon("noir10", 10000);
  assert.equal(offline.unreachable, true);
});

test("createOrder wraps the payload and maps success, validation errors and outages", async () => {
  const calls = stubFetch(
    { status: 200, body: { ok: true, order: { orderNumber: "NOIR-1234ABCD", total: 100 } } },
    { status: 200, body: { ok: false, error: "Please check the highlighted details.", fields: { pin: "Enter a valid 6-digit PIN code." } } },
    { status: 404, body: { message: "function not found" } },
    new Error("offline")
  );

  const placed = await NoirApi.createOrder({ items: [] });
  assert.equal(placed.order.orderNumber, "NOIR-1234ABCD");
  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/create_order");
  assert.deepEqual(JSON.parse(calls[0].options.body), { payload: { items: [] } });

  const rejected = await NoirApi.createOrder({});
  assert.equal(rejected.fields.pin, "Enter a valid 6-digit PIN code.");

  const broken = await NoirApi.createOrder({});
  assert.match(broken.error, /couldn't place your order/i);

  const offline = await NoirApi.createOrder({});
  assert.equal(offline.unreachable, true);
});

test("subscribeNewsletter posts the address to the database function and maps every outcome", async () => {
  const calls = stubFetch(
    { status: 200, body: { ok: true } },
    { status: 200, body: { ok: false, message: "Enter a valid email address." } },
    { status: 404, body: { message: "function not found" } },
    new Error("offline")
  );

  assert.deepEqual(await NoirApi.subscribeNewsletter("a@b.co"), { ok: true });
  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/subscribe_newsletter");
  assert.deepEqual(JSON.parse(calls[0].options.body), { p_email: "a@b.co" });

  const invalid = await NoirApi.subscribeNewsletter("nope");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.message, "Enter a valid email address.");

  const missing = await NoirApi.subscribeNewsletter("a@b.co");
  assert.equal(missing.ok, false);
  assert.ok(!missing.unreachable);

  const offline = await NoirApi.subscribeNewsletter("a@b.co");
  assert.equal(offline.unreachable, true);
});

test("signed-in calls send the customer's token (orders, my orders, addresses)", async () => {
  const calls = stubFetch(
    { status: 200, body: { ok: true, order: { orderNumber: "NOIR-1" } } },
    { status: 200, body: [{ orderNumber: "NOIR-1", items: [] }] },
    { status: 200, body: [{ id: "a1", label: "Home", name: "Asha", phone: "9876543210", isDefault: true }] },
    { status: 201, body: [{ id: "a2", label: "Work" }] },
    { status: 200, body: [{ id: "a2", label: "Work", isDefault: true }] },
    { status: 204, body: null },
    { status: 400, body: { message: "You can save up to 10 addresses.", code: "P0001" } },
    { status: 401, body: { message: "JWT expired" } },
    new Error("offline")
  );

  await NoirApi.createOrder({ items: [] }, "user-token");
  assert.equal(calls[0].options.headers.Authorization, "Bearer user-token");

  const orders = await NoirApi.getMyOrders("user-token");
  assert.equal(orders.orders.length, 1);
  assert.equal(calls[1].url, "https://example.supabase.co/rest/v1/rpc/my_orders");
  assert.equal(calls[1].options.headers.Authorization, "Bearer user-token");

  const listed = await NoirApi.listAddresses("user-token");
  assert.equal(listed.addresses[0].isDefault, true);
  assert.match(calls[2].url, /\/rest\/v1\/addresses\?select=.*name:full_name.*isDefault:is_default/);

  const created = await NoirApi.saveAddress("user-token", { label: "Work", name: "Asha", phone: "9876543210", address: "12 Park Road", city: "Delhi", state: "Delhi", pin: "110016", isDefault: false });
  assert.equal(created.address.id, "a2");
  assert.equal(calls[3].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[3].options.body), { label: "Work", full_name: "Asha", phone: "9876543210", address: "12 Park Road", city: "Delhi", state: "Delhi", pin: "110016", is_default: false });
  assert.equal(calls[3].options.headers.Prefer, "return=representation");

  const updated = await NoirApi.saveAddress("user-token", { id: "a2", label: "Work", name: "Asha", phone: "9876543210", address: "12 Park Road", city: "Delhi", state: "Delhi", pin: "110016", isDefault: true });
  assert.equal(calls[4].options.method, "PATCH");
  assert.match(calls[4].url, /addresses\?id=eq\.a2/);
  assert.equal(updated.address.isDefault, true);

  assert.deepEqual(await NoirApi.deleteAddress("user-token", "a2"), { ok: true });
  assert.equal(calls[5].options.method, "DELETE");

  assert.equal((await NoirApi.saveAddress("user-token", {})).error, "You can save up to 10 addresses.");
  assert.match((await NoirApi.getMyOrders("stale")).error, /couldn't load your orders/);
  assert.match((await NoirApi.listAddresses("user-token")).error, /couldn't reach the store/);
});

test("cancelOrder calls the database function with the customer's token", async () => {
  const calls = stubFetch(
    { status: 200, body: { ok: true } },
    { status: 200, body: { ok: false, error: "This order can't be cancelled any more. Please contact us." } },
    new Error("offline")
  );

  assert.deepEqual(await NoirApi.cancelOrder("user-token", "order-1"), { ok: true });
  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/cancel_order");
  assert.deepEqual(JSON.parse(calls[0].options.body), { p_order_id: "order-1" });
  assert.equal(calls[0].options.headers.Authorization, "Bearer user-token");

  assert.match((await NoirApi.cancelOrder("user-token", "order-2")).error, /can't be cancelled/);
  assert.match((await NoirApi.cancelOrder("user-token", "order-3")).error, /couldn't reach the store/);
});
