/*
 * NOIR admin API: the only place the admin panel talks to the backend (Supabase).
 * Every call here requires a signed-in admin's access token and hits one of the
 * admin_* RPCs added by supabase/migrations/20260925090000_noir_admin.sql — the
 * database itself checks the caller is an admin, this file does not.
 *
 *   NoirAdminApi.amIAdmin(token)
 *   NoirAdminApi.bootstrapAdmin(token)
 *   NoirAdminApi.dashboardStats(token)
 *   NoirAdminApi.salesTrend(token, days)
 *   NoirAdminApi.topProducts(token, limit)
 *   NoirAdminApi.listProducts(token, {search, category, status, limit, offset})
 *   NoirAdminApi.upsertProduct(token, payload)
 *   NoirAdminApi.setProductActive(token, id, active)
 *   NoirAdminApi.setProductFeatured(token, id, featured)
 *   NoirAdminApi.setProductStock(token, id, stock)
 *   NoirAdminApi.listCategories(token)
 *   NoirAdminApi.renameCategory(token, oldName, newName)
 *   NoirAdminApi.listOrders(token, {search, status, limit, offset})
 *   NoirAdminApi.getOrder(token, id)
 *   NoirAdminApi.updateOrderStatus(token, id, status)
 *   NoirAdminApi.listCustomers(token, {search, limit, offset})
 *   NoirAdminApi.listCoupons(token)
 *   NoirAdminApi.upsertCoupon(token, payload)
 *   NoirAdminApi.setCouponActive(token, code, active)
 *   NoirAdminApi.deleteCoupon(token, code)
 *   NoirAdminApi.uploadProductImage(token, userId, file)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    root.NoirAdminApi = factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function (root) {
  const TIMEOUT_MS = 15000;

  function getConfig() {
    const config = root.NOIR_SUPABASE;
    if (!config || !config.url || !config.key) {
      throw new Error("Supabase is not configured. Check assets/js/supabase-config.js.");
    }
    return config;
  }

  async function rpc(name, args, token) {
    const { url, key } = getConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(args || {}),
        signal: controller.signal
      });

      const text = await response.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch (error) { /* not JSON */ }
      }

      if (!response.ok) {
        const message = (data && (data.message || data.error_description || data.error)) || `Request failed (${response.status})`;
        const failure = new Error(message);
        failure.status = response.status;
        failure.data = data;
        throw failure;
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("The request took too long. Please try again.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  const amIAdmin = token => rpc("am_i_admin", {}, token);
  const bootstrapAdmin = token => rpc("admin_bootstrap", {}, token);

  const dashboardStats = token => rpc("admin_dashboard_stats", {}, token);
  const salesTrend = (token, days) => rpc("admin_sales_trend", { p_days: days || 14 }, token);
  const topProducts = (token, limit) => rpc("admin_top_products", { p_limit: limit || 5 }, token);

  const listProducts = (token, opts = {}) => rpc("admin_list_products", {
    p_search: opts.search || null, p_category: opts.category || null, p_status: opts.status || null,
    p_limit: opts.limit || 200, p_offset: opts.offset || 0
  }, token);
  const upsertProduct = (token, payload) => rpc("admin_upsert_product", { p_payload: payload }, token);
  const setProductActive = (token, id, active) => rpc("admin_set_product_active", { p_id: id, p_active: active }, token);
  const setProductFeatured = (token, id, featured) => rpc("admin_set_product_featured", { p_id: id, p_featured: featured }, token);
  const setProductStock = (token, id, stock) => rpc("admin_set_product_stock", { p_id: id, p_stock: stock }, token);
  const deleteProduct = (token, id) => rpc("admin_delete_product", { p_id: id }, token);

  const listCategories = token => rpc("admin_list_categories", {}, token);
  const renameCategory = (token, oldName, newName) => rpc("admin_rename_category", { p_old: oldName, p_new: newName }, token);

  const listOrders = (token, opts = {}) => rpc("admin_list_orders", {
    p_search: opts.search || null, p_status: opts.status || null, p_limit: opts.limit || 100, p_offset: opts.offset || 0
  }, token);
  const getOrder = (token, id) => rpc("admin_get_order", { p_id: id }, token);
  const updateOrderStatus = (token, id, status) => rpc("admin_update_order_status", { p_id: id, p_status: status }, token);

  const listCustomers = (token, opts = {}) => rpc("admin_list_customers", {
    p_search: opts.search || null, p_limit: opts.limit || 100, p_offset: opts.offset || 0
  }, token);

  const listCoupons = token => rpc("admin_list_coupons", {}, token);
  const upsertCoupon = (token, payload) => rpc("admin_upsert_coupon", { p_payload: payload }, token);
  const setCouponActive = (token, code, active) => rpc("admin_set_coupon_active", { p_code: code, p_active: active }, token);
  const deleteCoupon = (token, code) => rpc("admin_delete_coupon", { p_code: code }, token);

  const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

  async function uploadProductImage(token, userId, file) {
    if (!file || !IMAGE_TYPES[file.type]) throw new Error("Please choose a JPG, PNG or WEBP image.");
    if (file.size > IMAGE_MAX_BYTES) throw new Error("That image is larger than 8MB. Please choose a smaller one.");

    const { url, key } = getConfig();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${IMAGE_TYPES[file.type]}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${url}/storage/v1/object/product-images/${path}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upsert": "true" },
        body: file,
        signal: controller.signal
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error((data && (data.message || data.error)) || `Upload failed (${response.status})`);
      }
      return `${url}/storage/v1/object/public/product-images/${path}`;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    amIAdmin, bootstrapAdmin, dashboardStats, salesTrend, topProducts,
    listProducts, upsertProduct, setProductActive, setProductFeatured, setProductStock, deleteProduct,
    listCategories, renameCategory,
    listOrders, getOrder, updateOrderStatus,
    listCustomers,
    listCoupons, upsertCoupon, setCouponActive, deleteCoupon,
    uploadProductImage
  };
});
