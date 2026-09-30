/*
 * NOIR checkout page.
 * Relies on cart.js (cart state, coupon, formatPrice), noir-shared.js (pricing + validation) and
 * noir-api.js (Supabase), which are loaded before this file.
 */
(function () {
  const Shared = NoirShared;
  const DRAFT_KEY = "noirCheckoutDraft";
  const LAST_ORDER_KEY = "noirLastOrder";
  const MAX_QTY = 10;

  const FIELD_IDS = {
    email: "coEmail",
    name: "coName",
    phone: "coPhone",
    address: "coAddress",
    city: "coCity",
    state: "coState",
    pin: "coPin"
  };

  const $ = id => document.getElementById(id);
  const els = {
    form: $("checkoutForm"),
    empty: $("coEmpty"),
    confirm: $("coConfirm"),
    title: $("coTitle"),
    subtitle: $("coSubtitle"),
    stepper: $("coStepper"),
    items: $("coItems"),
    subtotal: $("coSubtotal"),
    discountRow: $("coDiscountRow"),
    discount: $("coDiscount"),
    shipping: $("coShipping"),
    total: $("coTotal"),
    stickyTotal: $("coStickyTotal"),
    sticky: $("coSticky"),
    stickyPlace: $("coStickyPlace"),
    place: $("coPlace"),
    formError: $("coFormError"),
    couponInput: $("coCouponInput"),
    couponApply: $("coCouponApply"),
    couponMsg: $("coCouponMsg"),
    standardPrice: $("coStandardPrice"),
    expressPrice: $("coExpressPrice"),
    stateSelect: $("coState"),
    offers: $("coOffers"),
    addressSelector: $("coAddressSelector"),
    addressBar: $("coAddressBar"),
    addressPanel: $("coAddressPanel"),
    savedAddresses: $("coSavedAddresses"),
    addressOther: $("coAddressOther"),
    addressForm: $("coAddressForm"),
    addressBarEyebrow: $("coAddressBarEyebrow"),
    addressBarLabel: $("coAddressBarLabel"),
    addressBarSummary: $("coAddressBarSummary")
  };

  if (!els.form) return;

  // Sent with the order so a retry (double click, flaky network, page reload) can't create it twice.
  function newOrderKey() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  const state = {
    gated: false,
    orderKey: newOrderKey(),
    shipping: "standard",
    payment: "upi",
    placing: false,
    placed: false,
    touched: new Set(),
    savedAddresses: [],
    selectedAddressId: null,
    usingSavedAddress: false
  };

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  const formatPhone = value => String(value || "").replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2");

  const titleCase = value => String(value || "").toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());

  /* ---------------------------------------------------------------- form values */

  function getValues() {
    const values = {};
    Object.entries(FIELD_IDS).forEach(([field, id]) => {
      values[field] = $(id).value;
    });
    return values;
  }

  function fieldBox(field) {
    return els.form.querySelector(`[data-field="${field}"]`);
  }

  function setFieldError(field, message) {
    const box = fieldBox(field);
    const input = $(FIELD_IDS[field]);
    const error = $(`${FIELD_IDS[field]}Error`);
    if (!box || !input || !error) return;

    error.textContent = message || "";
    box.classList.toggle("has-error", Boolean(message));

    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", error.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  // Shows errors for touched fields (or every field when showAll is true).
  function validateFields(showAll) {
    const errors = Shared.validateCheckoutFields(getValues());

    Object.keys(FIELD_IDS).forEach(field => {
      const visible = showAll || state.touched.has(field);
      setFieldError(field, visible ? errors[field] : "");
    });

    return errors;
  }

  function itemsMissingSize() {
    return cart.filter(item => !item.selectedSize);
  }

  function isShippingComplete() {
    return cart.length > 0
      && itemsMissingSize().length === 0
      && Object.keys(Shared.validateCheckoutFields(getValues())).length === 0;
  }

  /* ---------------------------------------------------------------- draft (per tab) */

  let draftTimer = null;

  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          ...getValues(),
          offers: els.offers.checked,
          shipping: state.shipping,
          payment: state.payment,
          orderKey: state.orderKey
        }));
      } catch (error) {
        // Session storage unavailable: the form simply won't be remembered.
      }
    }, 200);
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (!draft) return;

      Object.entries(FIELD_IDS).forEach(([field, id]) => {
        if (typeof draft[field] === "string") $(id).value = draft[field];
      });

      els.offers.checked = draft.offers !== false;
      if (Shared.SHIPPING_METHODS[draft.shipping]) state.shipping = draft.shipping;
      if (Shared.PAYMENT_METHODS[draft.payment]) state.payment = draft.payment;
      if (typeof draft.orderKey === "string" && /^[0-9a-f-]{36}$/i.test(draft.orderKey)) state.orderKey = draft.orderKey;
    } catch (error) {
      // Ignore a corrupted draft.
    }
  }

  /* ---------------------------------------------------------------- saved shipping addresses */

  function addressSummary(address) {
    return [address.address, address.city, address.state, address.pin].filter(Boolean).join(", ");
  }

  function setAddressFields(address) {
    if (!address) return;

    const field = name => $(FIELD_IDS[name]);
    field("name").value = address.name || "";
    field("phone").value = address.phone || "";
    field("address").value = address.address || "";
    field("city").value = address.city || "";
    field("state").value = address.state || "";
    field("pin").value = address.pin || "";

    Object.keys(FIELD_IDS).forEach(name => {
      state.touched.delete(name);
      setFieldError(name, "");
    });
  }

  function selectedSavedAddress() {
    return state.savedAddresses.find(address => String(address.id) === String(state.selectedAddressId)) || null;
  }

  function renderSavedAddresses() {
    if (!els.savedAddresses) return;

    els.savedAddresses.innerHTML = state.savedAddresses.map(address => {
      const selected = String(address.id) === String(state.selectedAddressId);
      const label = escapeHTML(address.label || "Address");
      const name = escapeHTML(address.name || "");
      const summary = escapeHTML(addressSummary(address));

      return `
        <button type="button" class="co-saved-address${selected ? " is-selected" : ""}" data-address-id="${escapeHTML(address.id)}" aria-pressed="${selected}">
          <span class="co-saved-address-mark" aria-hidden="true">${selected ? "✓" : ""}</span>
          <span class="co-saved-address-copy">
            <strong>${label}${address.isDefault ? " · Default" : ""}</strong>
            <span>${name}${name && summary ? " · " : ""}${summary}</span>
          </span>
          <span class="co-saved-address-check" aria-hidden="true"></span>
        </button>`;
    }).join("");
  }

  function updateAddressBar(address) {
    if (!address) {
      els.addressBarEyebrow.textContent = "Deliver to";
      els.addressBarLabel.textContent = "Choose an address";
      els.addressBarSummary.textContent = "Select a saved address";
      return;
    }

    els.addressBarEyebrow.textContent = "Deliver to";
    els.addressBarLabel.textContent = address.label || "Address";
    els.addressBarSummary.textContent = addressSummary(address);
  }

  function closeAddressPanel() {
    if (!els.addressPanel || !els.addressBar) return;
    els.addressPanel.hidden = true;
    els.addressBar.setAttribute("aria-expanded", "false");
  }

  function openAddressPanel() {
    if (!els.addressPanel || !els.addressBar) return;
    renderSavedAddresses();
    els.addressPanel.hidden = false;
    els.addressBar.setAttribute("aria-expanded", "true");
  }

  function showAddressForm(show) {
    els.addressForm.hidden = !show;
    if (show) {
      els.addressForm.classList.add("co-address-form-custom");
    } else {
      els.addressForm.classList.remove("co-address-form-custom");
    }
  }

  function selectSavedAddress(address) {
    if (!address) return;

    state.selectedAddressId = address.id;
    state.usingSavedAddress = true;
    setAddressFields(address);
    updateAddressBar(address);
    renderSavedAddresses();
    showAddressForm(false);
    closeAddressPanel();
    updateStepper();
    saveDraft();
  }

  function useDifferentAddress() {
    state.selectedAddressId = null;
    state.usingSavedAddress = false;
    closeAddressPanel();
    showAddressForm(true);

    // Start clean so the shopper is not accidentally editing a saved address.
    Object.keys(FIELD_IDS).filter(name => name !== "email").forEach(name => {
      $(FIELD_IDS[name]).value = "";
      state.touched.delete(name);
      setFieldError(name, "");
    });

    els.addressBarEyebrow.textContent = "Shipping address";
    els.addressBarLabel.textContent = "Enter a different address";
    els.addressBarSummary.textContent = "Fill in the delivery details below";
    saveDraft();
    updateStepper();
    $(FIELD_IDS.name).focus({ preventScroll: true });
  }

  function setupAddressSelector(addresses) {
    const usable = Array.isArray(addresses) ? addresses.filter(address => address && address.id) : [];
    state.savedAddresses = usable;

    if (!usable.length) {
      els.addressSelector.hidden = true;
      showAddressForm(true);
      return;
    }

    els.addressSelector.hidden = false;

    const currentValues = getValues();
    const matching = usable.find(address =>
      address.name === currentValues.name &&
      address.phone === currentValues.phone &&
      address.address === currentValues.address &&
      address.city === currentValues.city &&
      address.state === currentValues.state &&
      address.pin === currentValues.pin
    );
    const defaultAddress = usable.find(address => address.isDefault) || usable[0];
    const addressToUse = matching || defaultAddress;

    // If the restored draft already contains a custom address, preserve it.
    const hasDraftAddress = ["phone", "address", "city", "state", "pin"].some(name => currentValues[name]);
    if (hasDraftAddress && !matching) {
      state.selectedAddressId = null;
      state.usingSavedAddress = false;
      els.addressBarEyebrow.textContent = "Shipping address";
      els.addressBarLabel.textContent = "Current address";
      els.addressBarSummary.textContent = addressSummary({
        address: currentValues.address,
        city: currentValues.city,
        state: currentValues.state,
        pin: currentValues.pin
      });
      showAddressForm(true);
    } else {
      selectSavedAddress(addressToUse);
    }
  }

  els.addressBar?.addEventListener("click", () => {
    if (els.addressPanel.hidden) openAddressPanel();
    else closeAddressPanel();
  });

  els.savedAddresses?.addEventListener("click", event => {
    const button = event.target.closest("button[data-address-id]");
    if (!button) return;
    const address = state.savedAddresses.find(item => String(item.id) === String(button.dataset.addressId));
    selectSavedAddress(address);
  });

  els.addressOther?.addEventListener("click", useDifferentAddress);

  /* ---------------------------------------------------------------- choices */

  function syncChoices(name, value) {
    els.form.querySelectorAll(`input[name="${name}"]`).forEach(input => {
      const selected = input.value === value;
      input.checked = selected;
      input.closest(".co-choice").classList.toggle("is-selected", selected);
    });
  }

  /* ---------------------------------------------------------------- rendering */

  function renderShippingPrices(subtotal) {
    const standard = Shared.getShipping(subtotal, "standard");
    const express = Shared.getShipping(subtotal, "express");
    const freeFrom = Shared.SHIPPING_METHODS.standard && Shared.SHIPPING_METHODS.standard.freeFrom;
    const note = freeFrom ? `on orders over ${formatPrice(freeFrom)}` : "";

    els.standardPrice.innerHTML = standard === 0
      ? `<strong class="is-good">Free</strong>${note ? `<small>${note}</small>` : ""}`
      : `<strong>${formatPrice(standard)}</strong>${note ? `<small>Free ${note}</small>` : ""}`;

    els.expressPrice.innerHTML = `<strong>${express === 0 ? "Free" : formatPrice(express)}</strong>`;
  }

  function renderItems() {
    els.items.innerHTML = cart.map((item, index) => {
      const name = escapeHTML(titleCase(item.name));
      const lineTotal = formatPrice(Number(item.price) * Number(item.quantity));
      const needsSize = !item.selectedSize;

      const meta = needsSize
        ? ""
        : `<p class="co-item-meta">Size: ${escapeHTML(item.selectedSize)}</p>`;

      const sizePicker = needsSize
        ? `<div class="co-size-pick">
             <span>Select a size</span>
             <div>${(item.sizes && item.sizes.length ? item.sizes : Shared.SIZES).map(size =>
               `<button type="button" data-action="size" data-index="${index}" data-size="${size}">${size}</button>`
             ).join("")}</div>
           </div>`
        : "";

      return `
        <article class="co-item${needsSize ? " needs-size" : ""}">
          <div class="co-item-img"><img src="${escapeHTML(item.image)}" alt="${name}"></div>
          <div class="co-item-body">
            <h3 class="co-item-name">${name}</h3>
            ${meta}
            ${sizePicker}
            <div class="co-item-actions">
              <div class="co-stepper-qty" role="group" aria-label="Quantity for ${name}">
                <button type="button" data-action="dec" data-index="${index}" aria-label="Decrease quantity" ${item.quantity <= 1 ? "disabled" : ""}>−</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="inc" data-index="${index}" aria-label="Increase quantity" ${item.quantity >= MAX_QTY ? "disabled" : ""}>+</button>
              </div>
              <button type="button" class="co-link-btn" data-action="remove" data-index="${index}">Remove</button>
            </div>
          </div>
          <div class="co-item-price">${lineTotal}</div>
        </article>`;
    }).join("");
  }

  function currentPricing() {
    return Shared.calculate({
      subtotal: getSubtotal(),
      coupon: activeCouponDef,
      shippingMethod: state.shipping
    });
  }

  function renderTotals() {
    const pricing = currentPricing();

    els.subtotal.textContent = formatPrice(pricing.subtotal);
    els.discountRow.hidden = pricing.discount <= 0;
    els.discount.textContent = `−${formatPrice(pricing.discount)}`;

    els.shipping.textContent = pricing.shipping === 0 ? "Free" : formatPrice(pricing.shipping);
    els.shipping.classList.toggle("is-good", pricing.shipping === 0);

    els.total.textContent = formatPrice(pricing.total);
    els.stickyTotal.textContent = formatPrice(pricing.total);

    renderShippingPrices(pricing.subtotal);
  }

  function updateStepper() {
    let current = 1;
    if (state.placed) current = 4;
    else if (isShippingComplete()) current = 2;

    els.stepper.querySelectorAll("li").forEach((step, index) => {
      const number = index + 1;
      step.classList.toggle("is-done", number < current);
      step.classList.toggle("is-current", number === current);

      if (number === current) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  }

  function refresh() {
    if (state.placed || state.gated) return;

    const hasItems = cart.length > 0;
    els.empty.hidden = hasItems;
    els.form.hidden = !hasItems;

    if (hasItems) {
      renderItems();
      renderTotals();
    }

    updateStickyVisibility();
    updateStepper();
  }

  /* ---------------------------------------------------------------- cart actions */

  function setItemSize(index, size) {
    const item = cart[index];
    if (!item) return;

    // Same product + size already in the cart: merge the two lines.
    const twin = cart.findIndex((other, position) =>
      position !== index && String(other.id) === String(item.id) && other.selectedSize === size);

    if (twin >= 0) {
      cart[twin].quantity += item.quantity;
      cart.splice(index, 1);
    } else {
      item.selectedSize = size;
    }

    saveCart();
    updateCartCount();
    renderCartSidebar();
    els.formError.hidden = true;
  }

  els.items.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const index = Number(button.dataset.index);

    switch (button.dataset.action) {
      case "inc":
        if (cart[index] && cart[index].quantity < MAX_QTY) window.changeQty(index, 1);
        break;
      case "dec":
        if (cart[index] && cart[index].quantity > 1) window.changeQty(index, -1);
        break;
      case "remove":
        window.removeItem(index);
        break;
      case "size":
        setItemSize(index, button.dataset.size);
        break;
    }
  });

  // Any cart change (here or in the cart drawer) refreshes the summary.
  document.addEventListener("cart:changed", refresh);

  /* ---------------------------------------------------------------- coupon */

  function setCouponMessage(message, type) {
    els.couponMsg.textContent = message;
    els.couponMsg.className = `co-coupon-msg ${type ? `is-${type}` : ""}`.trim();
  }

  async function applyCheckoutCoupon() {
    const code = Shared.normalizeCoupon(els.couponInput.value);

    if (!code) {
      if (activeCoupon) {
        setActiveCoupon(null);
        setCouponMessage("Coupon removed.", "info");
      } else {
        setCouponMessage("Enter a coupon code.", "error");
      }
    } else {
      els.couponApply.disabled = true;
      setCouponMessage("Checking coupon…", "info");
      const result = await NoirApi.validateCoupon(code, getSubtotal());
      els.couponApply.disabled = false;

      if (result.valid) {
        setActiveCoupon(result.coupon);
        setCouponMessage(`${result.coupon.code} applied. You save ${formatPrice(Shared.getDiscount(getSubtotal(), result.coupon))}.`, "success");
      } else {
        if (!result.unreachable) setActiveCoupon(null);
        setCouponMessage(result.message, "error");
      }
    }

    renderCartSidebar();
    renderTotals();
  }

  // "Edit Cart" opens the bag instead of a separate page.
  $("coEditCart").addEventListener("click", event => {
    event.preventDefault();
    if (typeof openCart === "function") openCart();
  });

  els.couponApply.addEventListener("click", applyCheckoutCoupon);
  els.couponInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault(); // Enter here applies the coupon, it must not submit the order.
      applyCheckoutCoupon();
    }
  });

  /* ---------------------------------------------------------------- field + choice events */

  els.form.addEventListener("focusout", event => {
    const field = Object.keys(FIELD_IDS).find(key => FIELD_IDS[key] === event.target.id);
    if (!field) return;

    state.touched.add(field);
    validateFields(false);
    updateStepper();
  });

  els.form.addEventListener("input", event => {
    const field = Object.keys(FIELD_IDS).find(key => FIELD_IDS[key] === event.target.id);

    if (field === "pin") {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
    }

    // Once a field has been flagged, clear/refresh its message while the shopper fixes it.
    if (field && state.touched.has(field)) validateFields(false);

    if (field && ["name", "phone", "address", "city", "state", "pin"].includes(field) && state.usingSavedAddress) {
      state.usingSavedAddress = false;
      state.selectedAddressId = null;
      els.addressBarEyebrow.textContent = "Shipping address";
      els.addressBarLabel.textContent = "Edited address";
      els.addressBarSummary.textContent = addressSummary(getValues());
      showAddressForm(true);
      renderSavedAddresses();
    }

    updateStepper();
    saveDraft();
  });

  els.form.addEventListener("change", event => {
    const target = event.target;

    if (target.name === "shippingMethod") {
      state.shipping = target.value;
      syncChoices("shippingMethod", state.shipping);
      renderTotals();
    } else if (target.name === "paymentMethod") {
      state.payment = target.value;
      syncChoices("paymentMethod", state.payment);
    } else if (target.id === FIELD_IDS.state) {
      state.touched.add("state");
      validateFields(false);
      if (state.usingSavedAddress) {
        state.usingSavedAddress = false;
        state.selectedAddressId = null;
        els.addressBarEyebrow.textContent = "Shipping address";
        els.addressBarLabel.textContent = "Edited address";
        els.addressBarSummary.textContent = addressSummary(getValues());
        showAddressForm(true);
        renderSavedAddresses();
      }
    }

    updateStepper();
    saveDraft();
  });

  /* ---------------------------------------------------------------- sticky bar (phones) */

  let placeVisible = true;

  function updateStickyVisibility() {
    const show = !placeVisible && !state.placed && !els.form.hidden;
    els.sticky.classList.toggle("is-visible", show);
    els.sticky.setAttribute("aria-hidden", String(!show));
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      placeVisible = entry.isIntersecting;
      updateStickyVisibility();
    }, { rootMargin: "0px 0px -8px 0px" }).observe(els.place);
  }

  els.stickyPlace.addEventListener("click", () => els.place.click());

  /* ---------------------------------------------------------------- placing the order */

  function setPlacing(isPlacing) {
    state.placing = isPlacing;

    [els.place, els.stickyPlace].forEach(button => {
      button.disabled = isPlacing;
      button.classList.toggle("is-loading", isPlacing);
      button.querySelector(".co-place-text").textContent = isPlacing ? "Placing order" : "Place Order";
    });
  }

  function showFormError(message) {
    els.formError.textContent = message;
    els.formError.hidden = !message;
  }

  function buildPayload() {
    const values = getValues();

    return {
      idempotencyKey: state.orderKey,
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity, size: item.selectedSize })),
      customer: {
        email: values.email.trim(),
        name: values.name.trim(),
        phone: values.phone.trim(),
        marketingOptIn: els.offers.checked
      },
      shippingAddress: {
        address: values.address.trim(),
        city: values.city.trim(),
        state: values.state,
        pin: values.pin.trim()
      },
      shippingMethod: state.shipping,
      paymentMethod: state.payment,
      couponCode: activeCoupon || ""
    };
  }

  function focusField(field) {
    const input = $(FIELD_IDS[field]);
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.placing || state.placed) return;

    showFormError("");
    const errors = validateFields(true);
    updateStepper();

    const firstInvalid = Object.keys(FIELD_IDS).find(field => errors[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    const missing = itemsMissingSize();
    if (missing.length > 0) {
      showFormError(`Please select a size for ${titleCase(missing[0].name)}.`);
      els.items.querySelector(".needs-size")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setPlacing(true);
    const payload = buildPayload();
    const snapshot = cart.map(item => ({
      name: item.name, price: item.price, quantity: item.quantity, size: item.selectedSize, image: item.image
    }));

    // Prices are recalculated by the database (create_order); the total shown afterwards is the real one.
    // Signed-in customers send their login too, so the order shows up under My Orders.
    const session = typeof NoirAuth !== "undefined" ? await NoirAuth.getSession() : null;
    const result = await NoirApi.createOrder(payload, session ? session.accessToken : undefined);
    const order = result.order;

    if (result.unreachable) {
      setPlacing(false);
      showFormError("We couldn't reach the store right now. Please check your connection and try again.");
      return;
    }

    if (!order && result.code === "auth_required") {
      setPlacing(false);
      showGate();
      return;
    }

    if (!order) {
      setPlacing(false);
      const fields = result.fields || {};

      Object.keys(FIELD_IDS).forEach(field => {
        if (fields[field]) {
          state.touched.add(field);
          setFieldError(field, fields[field]);
        }
      });

      if (fields.couponCode) {
        setActiveCoupon(null);
        setCouponMessage(fields.couponCode, "error");
        renderCartSidebar();
        renderTotals();
      }
      showFormError(result.error);
      return;
    }

    completeOrder(order, snapshot);
  }

  els.form.addEventListener("submit", handleSubmit);

  /* ---------------------------------------------------------------- confirmation (step 3) */

  function completeOrder(order, snapshot) {
    state.placed = true;

    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ order, items: snapshot }));
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      // The confirmation below still renders from memory.
    }

    clearCartAfterOrder();
    window.history.replaceState(null, "", `checkout.html?order=${encodeURIComponent(order.orderNumber)}`);
    showConfirmation(order, snapshot);
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const formatDate = date => `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  // Counts weekdays only (public holidays are not accounted for).
  function addBusinessDays(start, days) {
    const date = new Date(start);
    let added = 0;

    while (added < days) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) added += 1;
    }

    return date;
  }

  function estimateDelivery(orderDate, methodId) {
    const method = Shared.SHIPPING_METHODS[methodId] || Shared.SHIPPING_METHODS.standard;
    const from = addBusinessDays(orderDate, method.minDays);
    const to = addBusinessDays(orderDate, method.maxDays);
    const short = date => `${date.getDate()} ${MONTHS[date.getMonth()]}`;

    if (from.getFullYear() !== to.getFullYear()) return `${formatDate(from)} – ${formatDate(to)}`;
    if (from.getMonth() !== to.getMonth()) return `${short(from)} – ${short(to)} ${to.getFullYear()}`;
    return `${from.getDate()} – ${short(to)} ${to.getFullYear()}`;
  }

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    box: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    truck: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
    card: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
  };

  function showConfirmation(order, items) {
    state.placed = true;

    const method = Shared.PAYMENT_METHODS[order.payment && order.payment.method];
    const address = order.shippingAddress || {};
    const customer = order.customer || {};
    const shippingMethod = order.shippingMethod || {};
    const orderDate = new Date(order.createdAt || Date.now());
    const firstName = escapeHTML(String(customer.name || "").trim().split(/\s+/)[0] || "there");
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const rows = [
      ["Subtotal", formatPrice(order.subtotal ?? order.total), ""],
      order.discount > 0 ? ["Discount", `−${formatPrice(order.discount)}`, "is-good"] : null,
      ["Shipping", order.shipping > 0 ? formatPrice(order.shipping) : "Free", order.shipping > 0 ? "" : "is-good"]
    ].filter(Boolean);

    document.title = "Order Confirmed | NOIR.";
    document.querySelector(".co-header").hidden = true;
    els.empty.hidden = true;
    els.form.hidden = true;
    els.sticky.classList.remove("is-visible");

    els.confirm.innerHTML = `
      <div class="co-done">
        <div class="co-done-main">
          <div class="co-done-check" id="coDoneCheck" role="img" aria-label="Order confirmed">${ICONS.check}</div>
          <h1>Order Confirmed!</h1>
          <p class="co-done-thanks">Thank you for your order, ${firstName}!</p>
          <p class="co-done-note">Your order has been successfully placed. Keep your order number handy if you ever need to get in touch about it.</p>

          <ul class="co-facts">
            <li class="co-fact">
              <span class="co-fact-icon">${ICONS.box}</span>
              <div class="co-fact-text"><small>Order Number</small><strong>${escapeHTML(order.orderNumber)}</strong></div>
            </li>
            <li class="co-fact">
              <span class="co-fact-icon">${ICONS.calendar}</span>
              <div class="co-fact-text"><small>Order Date</small><strong>${formatDate(orderDate)}</strong></div>
            </li>
            <li class="co-fact">
              <span class="co-fact-icon">${ICONS.truck}</span>
              <div class="co-fact-text"><small>Estimated Delivery</small><strong>${estimateDelivery(orderDate, shippingMethod.id)}</strong><em>${escapeHTML(shippingMethod.label || "")}</em></div>
            </li>
            <li class="co-fact">
              <span class="co-fact-icon">${ICONS.card}</span>
              <div class="co-fact-text"><small>Payment Method</small><strong>${escapeHTML(method ? method.label : "")}</strong><em>Payment pending</em></div>
            </li>
            <li class="co-fact co-fact-wide">
              <span class="co-fact-icon">${ICONS.pin}</span>
              <div class="co-fact-text">
                <small>Delivering to</small>
                <strong>${escapeHTML(customer.name)}</strong>
                <p>${escapeHTML(address.address)}, ${escapeHTML(address.city)}, ${escapeHTML(address.state)} ${escapeHTML(address.pin)}<br>${escapeHTML(formatPhone(customer.phone))}</p>
              </div>
            </li>
          </ul>

          <div class="co-done-actions">
            <a class="co-btn-dark" href="shop.html">Continue Shopping <span aria-hidden="true">→</span></a>
            <button class="co-btn-light" type="button" id="coPrint">Print Order</button>
          </div>
        </div>

        <aside class="co-done-summary" aria-labelledby="coDoneSummaryTitle">
          <div class="co-summary-head">
            <h2 id="coDoneSummaryTitle">Order Summary</h2>
            <span>${itemCount} ${itemCount === 1 ? "item" : "items"}</span>
          </div>

          <div class="co-items">
            ${items.map(item => `
              <article class="co-item">
                <div class="co-item-img"><img src="${escapeHTML(item.image)}" alt=""></div>
                <div class="co-item-body">
                  <h3 class="co-item-name">${escapeHTML(titleCase(item.name))}</h3>
                  <p class="co-item-meta">${item.size ? `Size: ${escapeHTML(item.size)}<i>|</i>` : ""}Qty: ${item.quantity}</p>
                </div>
                <div class="co-item-price">${formatPrice(item.price * item.quantity)}</div>
              </article>`).join("")}
          </div>

          <dl class="co-totals">
            ${rows.map(([label, value, cls]) => `<div><dt>${label}</dt><dd class="${cls}">${value}</dd></div>`).join("")}
          </dl>
          <div class="co-total"><span>Total</span><strong>${formatPrice(order.total)}</strong></div>
          <p class="co-tax-note">Inclusive of all taxes</p>
        </aside>
      </div>

      <section class="co-more" id="coMore" aria-labelledby="coMoreTitle" hidden></section>`;

    els.confirm.hidden = false;
    // Swap the static check mark for the confirmation animation (the static one stays if it cannot load).
    if (window.NoirTick) window.NoirTick.play(document.getElementById("coDoneCheck"));
    document.getElementById("coPrint").addEventListener("click", () => window.print());
    loadSuggestions((order.items || []).map(item => String(item.productId)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------------------------------------------------------- "More for your style" */

  // White-background cut-outs blend into the card; photos with their own backdrop fill it.
  function markPhotoBackdrop(media) {
    const img = media.querySelector("img");

    const check = () => {
      try {
        const size = 12;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        const brightness = [[0, 0], [w - size, 0], [0, h - size], [w - size, h - size]].map(([x, y]) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.drawImage(img, x, y, size, size, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          return (r + g + b) / 3;
        });

        media.classList.toggle("is-photo", Math.min(...brightness) < 235);
      } catch (error) {
        // Canvas blocked (file://): keep the default look.
      }
    };

    if (img.complete && img.naturalWidth) check();
    else img.addEventListener("load", check, { once: true });
  }

  async function loadSuggestions(orderedIds) {
    const section = document.getElementById("coMore");
    if (!section) return;

    try {
      const products = await NoirApi.getProducts();

      // Newest products first, skipping anything that was just ordered.
      const picks = products
        .filter(product => !orderedIds.includes(String(product.id)))
        .sort((a, b) => b.id - a.id)
        .slice(0, 4);

      if (picks.length === 0) return;

      section.innerHTML = `
        <div class="co-more-head">
          <span class="co-eyebrow">You might also like</span>
          <h2 id="coMoreTitle">More for<br>Your Style</h2>
          <span class="co-more-rule" aria-hidden="true"></span>
        </div>
        <div class="co-more-list">
          <div class="co-more-all"><a href="shop.html">Explore More <span aria-hidden="true">→</span></a></div>
          <div class="co-more-grid">
            ${picks.map(product => `
              <a class="co-more-card" href="product.html?id=${product.id}">
                <div class="co-more-media"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(titleCase(product.name))}" loading="lazy"></div>
                <h3>${escapeHTML(titleCase(product.name))}</h3>
                <p><strong>${formatPrice(product.price)}</strong>${product.oldPrice ? `<s>${formatPrice(product.oldPrice)}</s>` : ""}</p>
              </a>`).join("")}
          </div>
        </div>`;

      section.hidden = false;
      section.querySelectorAll(".co-more-media").forEach(markPhotoBackdrop);
    } catch (error) {
      // No suggestions if the catalogue can't be loaded; the confirmation is complete without them.
    }
  }

  /* ---------------------------------------------------------------- sign-in gate */

  // Orders need an account: visitors who are not signed in see "Create an account to continue" instead of the form.
  function showGate() {
    state.gated = true;
    document.querySelector(".co-header").hidden = true;
    els.form.hidden = true;
    els.empty.hidden = true;
    els.sticky.classList.remove("is-visible");

    const holder = $("coGate");
    NoirGate.render(holder, "checkout.html");
    holder.hidden = false;
    document.title = "Sign in to continue | NOIR.";
    window.scrollTo({ top: 0 });
  }

  async function checkAccount() {
    if (typeof NoirAuth === "undefined" || typeof NoirGate === "undefined") return;

    const session = await NoirAuth.getSession();
    if (!session && cart.length > 0 && !state.placed) showGate();
  }

  /* ---------------------------------------------------------------- init */

  function init() {
    // State dropdown
    Shared.STATES.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      els.stateSelect.appendChild(option);
    });

    restoreDraft();
    syncChoices("shippingMethod", state.shipping);
    syncChoices("paymentMethod", state.payment);

    if (activeCoupon) {
      els.couponInput.value = activeCoupon;
      setCouponMessage(`${activeCoupon} applied.`, "success");
    }

    // Refreshing right after an order: show the confirmation again.
    const orderParam = new URLSearchParams(window.location.search).get("order");
    if (orderParam) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null");
        if (saved && saved.order && saved.order.orderNumber === orderParam) {
          showConfirmation(saved.order, saved.items || []);
          return;
        }
      } catch (error) {
        // Fall through to the normal page.
      }
    }

    refresh();
    checkAccount();
    syncWithBackend();
    prefillFromAccount();
  }

  // Signed-in customers: fill email/name and use a compact saved-address selector when addresses exist.
  async function prefillFromAccount() {
    if (typeof NoirAuth === "undefined") return;

    const session = await NoirAuth.getSession();
    if (!session || state.placed) return;

    const field = name => $(FIELD_IDS[name]);
    const user = session.user || {};

    if (!field("email").value && user.email) field("email").value = user.email;
    if (!field("name").value && user.name) field("name").value = user.name;

    const saved = await NoirApi.listAddresses(session.accessToken);
    setupAddressSelector(saved.addresses || []);

    updateStepper();
    saveDraft();
  }

  // Loads live shipping rates and re-checks a coupon saved earlier, then refreshes the totals.
  async function syncWithBackend() {
    const [methods, coupon] = await Promise.all([
      NoirApi.getShippingMethods(),
      activeCoupon ? NoirApi.validateCoupon(activeCoupon, getSubtotal()) : Promise.resolve(null)
    ]);

    if (state.placed) return;

    if (methods) Shared.setShippingMethods(methods);

    if (coupon && !coupon.unreachable) {
      if (coupon.valid) {
        setActiveCoupon(coupon.coupon);
      } else {
        const previous = activeCoupon;
        setActiveCoupon(null);
        els.couponInput.value = "";
        setCouponMessage(`${previous} is no longer valid.`, "error");
      }
      renderCartSidebar();
    }

    if (cart.length > 0) renderTotals();
  }

  init();
})();
