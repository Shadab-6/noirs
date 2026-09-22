/*
 * NOIR storefront API: the only place the website talks to the backend (Supabase).
 *
 *   NoirApi.getProducts()          catalogue (falls back to assets/data/product.json if offline)
 *   NoirApi.getShippingMethods()   shipping rates
 *   NoirApi.validateCoupon(c, s)   checks a coupon against the database
 *   NoirApi.createOrder(payload, token)   places an order (prices are recalculated server-side); token = signed-in customer, optional
 *   NoirApi.getMyOrders(token)     the signed-in customer's orders
 *   NoirApi.cancelOrder(token, id) cancels one of their pending orders and keeps the order in history
 *   NoirApi.listAddresses / saveAddress / deleteAddress (token, ...)   the customer's saved addresses
 *   NoirApi.subscribeNewsletter(e) saves a newsletter sign-up
 *
 * Plain fetch against Supabase's REST API, so there is no library or build step to maintain.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    root.NoirApi = factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function (root) {
  const TIMEOUT_MS = 12000;
  const PRODUCT_SELECT = "id,name,price,oldPrice:old_price,category,genders,sizes,sale,popular,image";
  const SHIPPING_SELECT = "id,label,eta,minDays:min_days,maxDays:max_days,fee,freeFrom:free_from";
  const LOCAL_PRODUCTS_URL = "assets/data/product.json";
  const CURRENT_SWEATSHIRT_IDS = new Set([23, 24, 25]);
  // Frontend replacement rows for legacy product IDs 1–4. The live database
  // may still contain archived versions of these IDs, so the storefront
  // intentionally uses these code-owned rows and image paths instead.
  const LEGACY_REPLACEMENTS = [
    { id: 1, name: "Sage Curve Sweatshirt", price: 2999, oldPrice: 6999, category: "sweatshirt", genders: ["men", "women"], sizes: ["S", "M", "L", "XL"], sale: true, popular: true, image: "assets/images/item1(1).png" },
    { id: 2, name: "Ivory Panel Sweatshirt", price: 2499, oldPrice: 7499, category: "sweatshirt", genders: ["men", "women"], sizes: ["S", "M", "L", "XL"], sale: true, popular: true, image: "assets/images/item2(1).png" },
    { id: 3, name: "Graphite Panel Sweatshirt", price: 3499, oldPrice: 7999, category: "sweatshirt", genders: ["men", "women"], sizes: ["S", "M", "L", "XL"], sale: true, popular: true, image: "assets/images/item3(1).png" },
    { id: 4, name: "Mocha Curve Sweatshirt", price: 1999, oldPrice: 8999, category: "sweatshirt", genders: ["men", "women"], sizes: ["S", "M", "L", "XL"], sale: true, popular: true, image: "assets/images/item4(1).png" }
  ];

  let productsPromise = null;
  let shippingPromise = null;

  function getConfig() {
    const config = root.NOIR_SUPABASE;
    if (!config || !config.url || !config.key) {
      throw new Error("Supabase is not configured. Check assets/js/supabase-config.js.");
    }
    return config;
  }

  async function request(path, { method = "GET", body, token, prefer } = {}) {
    const { url, key } = getConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: {
          apikey: key,
          "Content-Type": "application/json",
          Accept: "application/json",
          // A signed-in customer's token lets the database know who is asking (orders, saved addresses).
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(prefer ? { Prefer: prefer } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });

      const text = await response.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch (error) { /* not JSON */ }
      }

      if (!response.ok) {
        const failure = new Error((data && data.message) || `Request failed (${response.status})`);
        failure.status = response.status;
        failure.data = data;
        throw failure;
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadLocalProducts() {
    const response = await fetch(root.NOIR_LOCAL_PRODUCTS_URL || LOCAL_PRODUCTS_URL);
    if (!response.ok) throw new Error("Local product data could not be loaded");
    return response.json();
  }

  async function mergeCurrentCollection(rows) {
    const apiRows = Array.isArray(rows) ? rows : [];
    const merged = new Map(apiRows.map(product => [Number(product.id), product]));

    // Always replace the four legacy storefront rows with the new sweatshirt
    // catalogue owned by the frontend code. This works even when those IDs
    // remain archived in Supabase, so no backend migration is required.
    for (const product of LEGACY_REPLACEMENTS) {
      merged.set(Number(product.id), product);
    }

    try {
      const localRows = await loadLocalProducts();
      const localCurrent = localRows.filter(product => CURRENT_SWEATSHIRT_IDS.has(Number(product.id)));
      for (const product of localCurrent) {
        const id = Number(product.id);
        if (!merged.has(id)) merged.set(id, product);
      }
    } catch (error) {
      console.warn("NOIR: local sweatshirt fallback could not be loaded.", error.message);
    }

    return [...merged.values()].sort((a, b) => Number(a.id) - Number(b.id));
  }

  function getProducts() {
    if (!productsPromise) {
      productsPromise = request(`/rest/v1/products?select=${PRODUCT_SELECT}&is_active=eq.true&order=id.asc`)
        .then(rows => {
          if (!Array.isArray(rows) || rows.length === 0) throw new Error("No products returned");
          return mergeCurrentCollection(rows);
        })
        .catch(error => {
          console.warn("NOIR: using the built-in product list because the catalogue could not be loaded.", error.message);
          return loadLocalProducts();
        });
    }

    return productsPromise;
  }

  // Resolves to the rows, or null when they can't be loaded (callers keep their defaults).
  function getShippingMethods() {
    if (!shippingPromise) {
      shippingPromise = request(`/rest/v1/shipping_methods?select=${SHIPPING_SELECT}&order=sort_order.asc`)
        .then(rows => (Array.isArray(rows) && rows.length > 0 ? rows : null))
        .catch(() => null);
    }

    return shippingPromise;
  }

  // -> { valid: true, coupon: { code, type, value, minSubtotal }, discount }
  //  | { valid: false, message, unreachable? }
  async function validateCoupon(code, subtotal) {
    try {
      const result = await request("/rest/v1/rpc/validate_coupon", {
        method: "POST",
        body: { p_code: String(code || ""), p_subtotal: Math.max(0, Math.round(Number(subtotal) || 0)) }
      });

      if (result && result.valid) {
        return {
          valid: true,
          discount: result.discount,
          coupon: { code: result.code, type: result.type, value: result.value, minSubtotal: result.minSubtotal }
        };
      }

      return { valid: false, message: (result && result.message) || "Invalid coupon code." };
    } catch (error) {
      return { valid: false, unreachable: true, message: "We couldn't check that code right now. Please try again." };
    }
  }

  // -> { order } | { error, fields } | { unreachable: true }
  async function createOrder(payload, token) {
    try {
      const result = await request("/rest/v1/rpc/create_order", { method: "POST", body: { payload }, token });

      if (result && result.ok) return { order: result.order };

      return {
        error: (result && result.error) || "We couldn't place your order. Please try again.",
        fields: (result && result.fields) || {},
        code: (result && result.code) || undefined // "auth_required" when the customer isn't signed in
      };
    } catch (error) {
      // No HTTP status means the request never got an answer (offline, blocked, timed out).
      if (!error.status) return { unreachable: true };

      console.error("NOIR: order request failed", error.status, error.message);
      return { error: "We couldn't place your order right now. Please try again in a moment.", fields: {} };
    }
  }

  // -> { ok: true } | { ok: false, message, unreachable? }
  async function subscribeNewsletter(email) {
    try {
      const result = await request("/rest/v1/rpc/subscribe_newsletter", {
        method: "POST",
        body: { p_email: String(email || "") }
      });

      if (result && result.ok) return { ok: true };
      return { ok: false, message: (result && result.message) || "We couldn't sign you up. Please try again." };
    } catch (error) {
      // No HTTP status means the request never got an answer (offline, blocked, timed out).
      if (!error.status) return { ok: false, unreachable: true, message: "We couldn't reach the server. Check your connection and try again." };
      return { ok: false, message: "We couldn't sign you up right now. Please try again in a moment." };
    }
  }

  /* ------------------------------------------------------------ signed-in customer */

  // -> { orders: [...] } | { error }
  async function getMyOrders(token) {
    try {
      const orders = await request("/rest/v1/rpc/my_orders", { method: "POST", body: {}, token });
      return { orders: Array.isArray(orders) ? orders : [] };
    } catch (error) {
      return { error: error.status ? "We couldn't load your orders right now." : "We couldn't reach the store. Check your connection." };
    }
  }

  // Cancels (removes) one of the customer's own orders while it is still pending. -> { ok } | { error }
  async function cancelOrder(token, orderId) {
    try {
      const result = await request("/rest/v1/rpc/cancel_order", { method: "POST", body: { p_order_id: orderId }, token });
      if (result && result.ok) return { ok: true };
      return { error: (result && result.error) || "We couldn't cancel that order. Please try again." };
    } catch (error) {
      return { error: error.status ? "We couldn't cancel that order right now. Please try again." : "We couldn't reach the store. Check your connection." };
    }
  }

  const ADDRESS_SELECT = "id,label,name:full_name,phone,address,city,state,pin,isDefault:is_default";

  function addressError(error) {
    if (!error.status) return "We couldn't reach the store. Check your connection.";
    if (error.data && error.data.message && /up to 10/.test(error.data.message)) return "You can save up to 10 addresses.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    return "We couldn't save that address. Please check the details and try again.";
  }

  async function listAddresses(token) {
    try {
      const rows = await request(`/rest/v1/addresses?select=${ADDRESS_SELECT}&order=created_at.asc`, { token });
      return { addresses: Array.isArray(rows) ? rows : [] };
    } catch (error) {
      return { error: addressError(error) };
    }
  }

  // address = { id?, label, name, phone (10 digits), address, city, state, pin, isDefault }
  async function saveAddress(token, address) {
    const row = {
      label: address.label,
      full_name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      pin: address.pin,
      is_default: Boolean(address.isDefault)
    };

    try {
      const path = address.id
        ? `/rest/v1/addresses?id=eq.${encodeURIComponent(address.id)}&select=${ADDRESS_SELECT}`
        : `/rest/v1/addresses?select=${ADDRESS_SELECT}`;
      const rows = await request(path, { method: address.id ? "PATCH" : "POST", body: row, token, prefer: "return=representation" });
      return { address: Array.isArray(rows) ? rows[0] : rows };
    } catch (error) {
      return { error: addressError(error) };
    }
  }

  async function deleteAddress(token, id) {
    try {
      await request(`/rest/v1/addresses?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", token });
      return { ok: true };
    } catch (error) {
      return { error: addressError(error) };
    }
  }

  function resetCache() {
    productsPromise = null;
    shippingPromise = null;
  }

  return { getProducts, getShippingMethods, validateCoupon, createOrder, subscribeNewsletter, getMyOrders, cancelOrder, listAddresses, saveAddress, deleteAddress, resetCache };
});
