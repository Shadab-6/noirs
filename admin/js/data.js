/* NOIR admin data loader.
 * Replaces the old hardcoded js/data.js. NOIR.DATA keeps the exact field names the page
 * modules already render (p.cat, o.cust, c.spent, ...) so the rendering code in js/pages/*
 * did not need to be rewritten — only the write paths (create/edit/status-change) were, since
 * the mock build never persisted anything.
 *
 * A generous but bounded LIST_LIMIT is fetched once per page load rather than paging on the
 * server for every filter change: simpler, and no NOIR store is anywhere near the size where
 * that matters. If the catalogue/order volume grows a lot, admin_list_products/orders/etc.
 * already accept p_limit/p_offset for real server-side pagination — only the loader below
 * would need to change, not the page modules.
 */
window.NOIR = window.NOIR || {};
NOIR.DATA = { products: [], orders: [], categories: [], customers: [], coupons: [], analytics: {}, reviews: [] };

(function () {
  const LIST_LIMIT = 500;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function dateStr(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  function timeStr(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  function fullStr(iso) { return iso ? `${dateStr(iso)}, ${timeStr(iso)}` : "—"; }
  function titleCase(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  const PAY_LABEL = { paid: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded" };
  const METHOD_LABEL = { upi: "UPI", card: "Card", netbanking: "NetBanking", wallet: "Wallet" };

  function assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
    return "../../" + path; // admin pages live at /admin/pages/*.html; storefront assets are at site root
  }
  NOIR.assetUrl = assetUrl;

  function mapProduct(p) {
    return {
      id: p.id, name: p.name, sku: p.sku, cat: titleCase(p.cat), price: p.price, mrp: p.mrp || 0,
      stock: p.stock, status: p.status, featured: !!p.featured, desc: p.desc || "",
      variants: 1, reserved: 0, image: assetUrl(p.image), genders: p.genders || [], sizes: p.sizes || [],
      isActive: p.isActive, sale: !!p.sale, _raw: p
    };
  }

  function mapOrder(o) {
    const status = titleCase(o.status);
    return {
      _id: o.id, // real uuid, needed for admin_update_order_status / admin_get_order
      id: "#" + o.orderNumber, orderNumber: o.orderNumber,
      cust: o.customer.name, email: o.customer.email, phone: o.customer.phone,
      date: dateStr(o.createdAt), time: timeStr(o.createdAt), createdAt: o.createdAt,
      amt: o.total, pay: PAY_LABEL[o.payment.status] || titleCase(o.payment.status),
      method: METHOD_LABEL[o.payment.method] || titleCase(o.payment.method), txn: "—",
      status: status,
      items: (o.items || []).map(it => ({ pid: it.productId, p: it.name, sku: "NOIR-" + String(it.productId).padStart(4, "0"), cat: "", meta: "Size: " + it.size, qty: it.quantity, price: it.price })),
      subtotal: o.subtotal, shipping: o.shipping, discount: o.discount,
      address: [o.shippingAddress.address, o.shippingAddress.city, `${o.shippingAddress.state} ${o.shippingAddress.pin}`].join(", ")
    };
  }

  function mapCustomer(c) {
    return {
      id: c.email, name: c.name, email: c.email, phone: c.phone,
      orders: c.orders, spent: c.spent || 0, status: c.status,
      joined: dateStr(c.firstOrderAt), joinedFull: fullStr(c.firstOrderAt), firstOrderAt: c.firstOrderAt,
      loc: c.loc || "—", wishlist: 0, reviews: 0,
      recent: (c.recent || []).map(r => ({ oid: "#" + r.id, date: dateStr(r.date), amt: r.amt, status: titleCase(r.status), cat: "" }))
    };
  }

  function couponStatus(c) {
    const now = Date.now();
    if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return "Expired";
    if (c.startsAt && new Date(c.startsAt).getTime() > now) return "Scheduled";
    return c.isActive ? "Active" : "Inactive";
  }
  function couponValidity(c) {
    if (!c.startsAt && !c.expiresAt) return "No expiry";
    const a = c.startsAt ? dateStr(c.startsAt) : "Now";
    const b = c.expiresAt ? dateStr(c.expiresAt) : "No end date";
    return `${a} – ${b}`;
  }
  function mapCoupon(c) {
    return {
      code: c.code, name: c.code,
      desc: c.discountType === "percent" ? `${c.discountValue}% off orders` + (c.minSubtotal ? ` over ₹${c.minSubtotal}` : "") : `₹${c.discountValue} off orders` + (c.minSubtotal ? ` over ₹${c.minSubtotal}` : ""),
      type: c.discountType === "percent" ? "Percentage" : "Fixed Amount",
      value: c.discountType === "percent" ? c.discountValue + "%" : "₹" + c.discountValue,
      discountType: c.discountType, discountValue: c.discountValue,
      min: c.minSubtotal || 0, used: c.usedCount || 0, limit: c.maxUses || 0,
      valid: couponValidity(c), startsAt: c.startsAt, expiresAt: c.expiresAt,
      status: couponStatus(c), isActive: c.isActive
    };
  }

  function mapCategory(c, i) {
    return {
      id: i + 1, name: c.name, slug: c.slug,
      desc: c.totalProducts + " product" + (c.totalProducts === 1 ? "" : "s") + " in this category",
      prod: c.totalProducts, status: c.activeProducts > 0 ? "Active" : "Hidden", order: i + 1
    };
  }

  NOIR.mapProduct = mapProduct;
  NOIR.mapOrder = mapOrder;
  NOIR.mapCustomer = mapCustomer;
  NOIR.mapCoupon = mapCoupon;
  NOIR.mapCategory = mapCategory;

  NOIR.loadData = async function () {
    const session = NOIR.adminSession;
    const token = session && session.accessToken;

    const [productsRes, ordersRes, customersRes, couponsRes, categoriesRes, dashRes, topRes, trendRes] = await Promise.all([
      NoirAdminApi.listProducts(token, { limit: LIST_LIMIT }),
      NoirAdminApi.listOrders(token, { limit: LIST_LIMIT }),
      NoirAdminApi.listCustomers(token, { limit: LIST_LIMIT }),
      NoirAdminApi.listCoupons(token),
      NoirAdminApi.listCategories(token),
      NoirAdminApi.dashboardStats(token),
      NoirAdminApi.topProducts(token, 5),
      NoirAdminApi.salesTrend(token, 30)
    ]);

    NOIR.DATA.products = (productsRes.rows || []).map(mapProduct);
    NOIR.DATA.orders = (ordersRes.rows || []).map(mapOrder);
    NOIR.DATA.customers = (customersRes.rows || []).map(mapCustomer);
    NOIR.DATA.coupons = (couponsRes || []).map(mapCoupon);
    NOIR.DATA.categories = (categoriesRes || []).map(mapCategory);
    NOIR.DATA.dashboard = dashRes;
    NOIR.DATA.topProducts = (topRes || []).map(p => ({ name: p.name, orders: p.orders, rev: p.rev, cat: "" }));
    NOIR.DATA.reviews = []; // no review system exists on the storefront yet — see final report
    NOIR.DATA.salesTrend = trendRes || [];
    NOIR.DATA.revenue = (trendRes || []).map(d => d.revenue);
    NOIR.DATA.orderCounts = (trendRes || []).map(d => d.orders);
  };
})();
