/*
 * NOIR shared store rules (browser + Node tests).
 *
 * Price maths and form validation used by the cart, the checkout page and the unit tests.
 * The source of truth is the Supabase database: coupons and shipping methods come from it,
 * and public.create_order() re-checks and re-prices every order server-side. This file only
 * makes the numbers on screen match what the database will charge.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NoirShared = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  // Standard shipping is free from this subtotal up (matches "Free shipping above ₹1999" on product pages).
  const FREE_SHIPPING_MIN = 1999;

  // Defaults mirror the shipping_methods table and are used until (or if) it can't be loaded.
  // NoirApi.getShippingMethods() replaces them with the database rows via setShippingMethods().
  const SHIPPING_METHODS = {
    standard: { id: "standard", label: "Standard Shipping", eta: "3–7 business days", minDays: 3, maxDays: 7, fee: 99, freeFrom: FREE_SHIPPING_MIN },
    express: { id: "express", label: "Express Shipping", eta: "1–3 business days", minDays: 1, maxDays: 3, fee: 199, freeFrom: null }
  };

  const PAYMENT_METHODS = {
    upi: { id: "upi", label: "UPI", hint: "Pay with any UPI app" },
    card: { id: "card", label: "Card", hint: "Visa, Mastercard, Rupay" },
    netbanking: { id: "netbanking", label: "Net Banking", hint: "All major banks" },
    wallet: { id: "wallet", label: "Wallets", hint: "Paytm, PhonePe, Amazon Pay" }
  };

  const SIZES = ["S", "M", "L", "XL"];

  const STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
    "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  function normalizeCoupon(code) {
    return String(code || "").trim().toUpperCase();
  }

  // coupon = { type: "percent" | "fixed", value, minSubtotal } as returned by validate_coupon(), or null.
  function getDiscount(subtotal, coupon) {
    if (!coupon || subtotal <= 0 || subtotal < (coupon.minSubtotal || 0)) return 0;

    if (coupon.type === "percent") {
      return Math.round((subtotal * coupon.value) / 100);
    }

    return Math.min(coupon.value, subtotal);
  }

  function getShipping(subtotal, methodId) {
    const method = SHIPPING_METHODS[methodId] || SHIPPING_METHODS.standard;
    if (subtotal <= 0) return 0;
    if (method.freeFrom !== null && method.freeFrom !== undefined && subtotal >= method.freeFrom) return 0;
    return method.fee;
  }

  function calculate({ subtotal, coupon, shippingMethod }) {
    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    const discount = getDiscount(safeSubtotal, coupon);
    const shipping = getShipping(safeSubtotal, shippingMethod);
    const total = Math.max(0, safeSubtotal - discount + shipping);
    return { subtotal: safeSubtotal, discount, shipping, total };
  }

  // Replaces the built-in shipping defaults with rows loaded from the database.
  function setShippingMethods(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return;

    Object.keys(SHIPPING_METHODS).forEach(id => delete SHIPPING_METHODS[id]);
    rows.forEach(row => {
      SHIPPING_METHODS[row.id] = {
        id: row.id,
        label: row.label,
        eta: row.eta,
        minDays: row.minDays,
        maxDays: row.maxDays,
        fee: row.fee,
        freeFrom: row.freeFrom === undefined ? null : row.freeFrom
      };
    });
  }

  // Returns a 10-digit Indian mobile number, or null when the input is not one.
  function normalizePhone(value) {
    let digits = String(value || "").replace(/[\s\-().]/g, "");
    if (digits.startsWith("+91")) digits = digits.slice(3);
    else if (digits.startsWith("0091")) digits = digits.slice(4);
    else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
  }

  function isValidEmail(value) {
    const email = String(value || "").trim();
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  // Field-by-field validation shared by the checkout form and the order API.
  // Returns an object of { fieldName: "message" }; empty means everything is valid.
  function validateCheckoutFields(values) {
    const errors = {};
    const email = String(values.email || "").trim();
    const name = String(values.name || "").trim();
    const address = String(values.address || "").trim();
    const city = String(values.city || "").trim();
    const pin = String(values.pin || "").trim();

    if (!email) errors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email address.";

    if (!name) errors.name = "Enter your full name.";
    else if (name.length < 2) errors.name = "Name looks too short.";

    if (!String(values.phone || "").trim()) errors.phone = "Enter your phone number.";
    else if (!normalizePhone(values.phone)) errors.phone = "Enter a valid 10-digit mobile number.";

    if (!address) errors.address = "Enter your delivery address.";
    else if (address.length < 6) errors.address = "Add a little more detail to the address.";

    if (!city) errors.city = "Enter your city.";
    else if (city.length < 2) errors.city = "Enter a valid city.";

    if (!values.state) errors.state = "Select your state.";
    else if (!STATES.includes(values.state)) errors.state = "Select a valid state.";

    if (!pin) errors.pin = "Enter your PIN code.";
    else if (!/^[1-9]\d{5}$/.test(pin)) errors.pin = "Enter a valid 6-digit PIN code.";

    return errors;
  }

  return {
    FREE_SHIPPING_MIN,
    SHIPPING_METHODS,
    PAYMENT_METHODS,
    SIZES,
    STATES,
    normalizeCoupon,
    getDiscount,
    getShipping,
    calculate,
    setShippingMethods,
    normalizePhone,
    isValidEmail,
    validateCheckoutFields
  };
});
