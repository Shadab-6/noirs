/*
 * NOIR account page: guests see "Create Account" / "Sign In" (Supabase Auth); signed-in customers see their account
 * (profile, My Orders, Addresses, Settings). Needs noir-shared.js, noir-auth.js, noir-api.js and noir-store.js.
 */
(function () {
  const $ = id => document.getElementById(id);

  const authView = $("authView");
  if (!authView) return;

  const memberView = $("memberView");
  const form = $("auForm");
  const alertBox = $("auAlert");
  const submit = $("auSubmit");
  const fieldsByName = {};
  form.querySelectorAll("[data-field]").forEach(box => { fieldsByName[box.dataset.field] = box; });

  const INPUT = { name: $("auName"), email: $("auEmail"), password: $("auPassword"), confirm: $("auConfirm"), terms: $("auTerms") };

  const COPY = {
    create: {
      title: "Create Account", sub: "Join us and start your journey today.", submit: "Create Account",
      switchLabel: "Already have an account?", switchText: "Sign In", switchTo: "signin"
    },
    signin: {
      title: "Welcome back", sub: "Sign in to pick up where you left off.", submit: "Sign In",
      switchLabel: "New to NOIR.?", switchText: "Create Account", switchTo: "create"
    },
    forgot: {
      title: "Reset password", sub: "Enter your email and we'll send you a link to choose a new password.", submit: "Send Reset Link",
      switchLabel: "Remembered it?", switchText: "Sign In", switchTo: "signin"
    },
    reset: {
      title: "New password", sub: "Choose a new password for your account.", submit: "Update Password",
      switchLabel: "", switchText: "", switchTo: null
    }
  };

  // Coming from the checkout gate: ?mode=signin|create&next=checkout.html
  const query = new URLSearchParams(window.location.search);
  const startMode = ["create", "signin"].includes(query.get("mode")) ? query.get("mode") : "create";
  const queryNext = NoirGate.safeNext(query.get("next"));
  if (queryNext) {
    try { window.sessionStorage.setItem("noirNext", queryNext); } catch (error) { /* the ?next= in the address still works */ }
  }

  // An ordinary visit (not from the checkout gate, not a sign-in return) forgets any old destination.
  if (!queryNext && !window.location.hash.includes("access_token")) {
    try { window.sessionStorage.removeItem("noirNext"); } catch (error) { /* ignore */ }
  }

  function takeNext() {
    let stored = "";
    try {
      stored = window.sessionStorage.getItem("noirNext") || "";
      window.sessionStorage.removeItem("noirNext");
    } catch (error) { /* ignore */ }
    return NoirGate.safeNext(stored || queryNext);
  }

  // After signing in: go on to where the visitor was heading (the checkout), otherwise show the account.
  function enter(session, note) {
    const next = takeNext();
    if (next) {
      window.location.href = next;
      return;
    }
    showMember(session, note);
  }

  const state = { mode: "create", busy: false, settings: null, signupDisabled: false, session: null, orders: null, addresses: null, editing: null };

  /* ---------------------------------------------------------------- helpers */

  function showAlert(message, ok) {
    alertBox.textContent = message || "";
    alertBox.hidden = !message;
    alertBox.classList.toggle("is-ok", Boolean(ok));
  }

  function setFieldError(name, message) {
    const box = fieldsByName[name];
    if (!box) return;

    const error = box.querySelector(".au-error");
    error.textContent = message || "";
    box.classList.toggle("has-error", Boolean(message));

    const input = INPUT[name];
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", error.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  function clearErrors() {
    Object.keys(fieldsByName).forEach(name => setFieldError(name, ""));
    showAlert("");
  }

  const isActive = name => {
    const box = fieldsByName[name];
    return Boolean(box) && !box.closest("[data-modes]").hidden;
  };

  function setBusy(busy) {
    state.busy = busy;
    submit.disabled = busy;
    submit.classList.toggle("is-loading", busy);
  }

  /* ---------------------------------------------------------------- modes */

  function setMode(mode) {
    state.mode = mode;
    const copy = COPY[mode];

    $("auTitle").textContent = copy.title;
    $("auSub").textContent = copy.sub;
    $("auSubmitText").textContent = copy.submit;
    $("auSwitchLabel").textContent = copy.switchLabel;
    $("auSwitchText").textContent = copy.switchText;

    const switchBtn = $("auSwitchBtn");
    switchBtn.hidden = !copy.switchTo || (copy.switchTo === "create" && state.signupDisabled);
    $("auSwitchLabel").hidden = switchBtn.hidden;

    // Show only the fields that belong to this mode.
    form.querySelectorAll("[data-modes]").forEach(node => {
      const visible = node.dataset.modes.split(" ").includes(mode);
      node.hidden = !visible;
      node.querySelectorAll("input").forEach(input => { input.disabled = !visible; });
    });

    // Password wording and autofill hints differ between creating and signing in.
    INPUT.password.autocomplete = mode === "signin" ? "current-password" : "new-password";
    INPUT.password.placeholder = mode === "reset" ? "New Password" : "Password";
    INPUT.confirm.placeholder = mode === "reset" ? "Confirm New Password" : "Confirm Password";

    $("auPerks").hidden = mode !== "create";
    $("auProviders").hidden = !(mode === "create" || mode === "signin");

    form.hidden = false;
    $("auSent").hidden = true;
    clearErrors();
  }

  function showSent(title, text) {
    $("auSentTitle").textContent = title;
    $("auSentText").textContent = text;
    form.hidden = true;
    $("auPerks").hidden = true;
    $("auProviders").hidden = true;
    $("auSent").hidden = false;
    $("auSub").textContent = "";
    $("auTitle").textContent = "Almost there";
    $("auSwitchLabel").hidden = true;
    $("auSwitchBtn").hidden = true;
    clearErrors();
  }

  /* ---------------------------------------------------------------- views */

  function showGuest(mode) {
    document.body.classList.remove("au-member");
    memberView.hidden = true;
    authView.hidden = false;
    setMode(state.signupDisabled && mode === "create" ? "signin" : mode);
    document.title = "Account | NOIR.";
  }

  function showMember(session, note) {
    const user = session.user || {};
    const name = (user.name || "").trim() || (user.email || "").split("@")[0];

    state.session = session;
    document.body.classList.add("au-member");
    authView.hidden = true;
    memberView.hidden = false;

    $("auAvatar").textContent = name[0] || "N";
    $("auHello").textContent = name;
    $("auMail").textContent = user.email || "";
    $("acsName").value = name;
    $("acsEmail").textContent = user.email || "";

    const noteBox = $("auMemberNote");
    noteBox.textContent = note || "";
    noteBox.hidden = !note;

    document.title = "Your account | NOIR.";
    route();
    loadStats();
  }

  /* ---------------------------------------------------------------- validation + submit */

  function values() {
    return {
      name: INPUT.name.value.trim(),
      email: INPUT.email.value.trim(),
      password: INPUT.password.value,
      confirm: INPUT.confirm.value,
      terms: INPUT.terms.checked
    };
  }

  function validate() {
    const v = values();
    const errors = {};

    if (isActive("name")) {
      if (v.name.length < 2) errors.name = "Enter your full name.";
      else if (v.name.length > 100) errors.name = "Name is too long.";
    }

    if (isActive("email")) {
      if (!v.email) errors.email = "Enter your email address.";
      else if (!NoirShared.isValidEmail(v.email)) errors.email = "Enter a valid email address.";
    }

    if (isActive("password")) {
      if (!v.password) errors.password = state.mode === "signin" ? "Enter your password." : "Choose a password.";
      else if (state.mode !== "signin" && v.password.length < 8) errors.password = "Use at least 8 characters.";
    }

    if (isActive("confirm") && !errors.password) {
      if (!v.confirm) errors.confirm = "Confirm your password.";
      else if (v.confirm !== v.password) errors.confirm = "Passwords don't match.";
    }

    if (isActive("terms") && !v.terms) errors.terms = "Please agree to the Terms and Privacy Policy to continue.";

    return errors;
  }

  function showErrors(errors) {
    ["name", "email", "password", "confirm", "terms"].forEach(name => {
      if (fieldsByName[name]) setFieldError(name, errors[name] || "");
    });

    const first = ["name", "email", "password", "confirm", "terms"].find(name => errors[name]);
    if (first) INPUT[first].focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.busy) return;

    const errors = validate();
    showErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const v = values();
    showAlert("");
    setBusy(true);

    try {
      if (state.mode === "create") {
        const result = await NoirAuth.signUp({ name: v.name, email: v.email, password: v.password });

        if (result.session) enter(result.session, "Your account is ready. Welcome to NOIR.");
        else if (result.needsConfirmation) {
          showSent("Check your email", `We've sent a confirmation link to ${v.email}. Open it to activate your account, then sign in.`);
        } else showAlert(result.error);
      } else if (state.mode === "signin") {
        const result = await NoirAuth.signIn({ email: v.email, password: v.password });
        if (result.session) enter(result.session);
        else showAlert(result.error);
      } else if (state.mode === "forgot") {
        const result = await NoirAuth.resetPassword(v.email);
        if (result.ok) showSent("Check your email", `If ${v.email} has a NOIR. account, we've sent a link to choose a new password.`);
        else showAlert(result.error);
      } else if (state.mode === "reset") {
        const result = await NoirAuth.updatePassword(v.password);
        if (result.ok) showMember(await NoirAuth.getSession(), "Your password has been updated.");
        else showAlert(result.error);
      }
    } finally {
      setBusy(false);
    }
  }

  form.addEventListener("submit", handleSubmit);

  // Clear a field's message as soon as the shopper edits it.
  form.addEventListener("input", event => {
    const box = event.target.closest("[data-field]");
    if (box && box.classList.contains("has-error")) setFieldError(box.dataset.field, "");
  });
  form.addEventListener("change", event => {
    const box = event.target.closest("[data-field]");
    if (box && box.classList.contains("has-error")) setFieldError(box.dataset.field, "");
  });

  /* ---------------------------------------------------------------- buttons */

  $("auSwitchBtn").addEventListener("click", () => {
    const target = COPY[state.mode].switchTo;
    if (target) setMode(target);
  });

  $("auForgotBtn").addEventListener("click", () => {
    const typed = INPUT.email.value;
    setMode("forgot");
    INPUT.email.value = typed;
    INPUT.email.focus();
  });

  $("auSentBack").addEventListener("click", () => setMode("signin"));

  $("auBack").addEventListener("click", () => {
    if (window.history.length > 1 && document.referrer) window.history.back();
    else window.location.href = "index.html";
  });

  // Show / hide password
  authView.addEventListener("click", event => {
    const button = event.target.closest(".au-eye");
    if (!button) return;

    const input = $(button.dataset.toggle);
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.setAttribute("aria-pressed", String(reveal));
    button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    button.querySelector(".au-eye__on").hidden = reveal;
    button.querySelector(".au-eye__off").hidden = !reveal;
  });

  $("auSignOut").addEventListener("click", async () => {
    await NoirAuth.signOut();
    showGuest("signin");
  });

  /* ---------------------------------------------------------------- signed-in account */

  const SCREENS = { "": "acHome", orders: "acOrdersScreen", addresses: "acAddressesScreen", settings: "acSettingsScreen" };
  const formatINR = value => `₹${Number(value).toLocaleString("en-IN")}`;
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatDate = iso => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

  function memberAlert(id, message, ok) {
    const box = $(id);
    box.textContent = message || "";
    box.hidden = !message;
    box.classList.toggle("is-ok", Boolean(ok));
  }

  async function token() {
    const session = await NoirAuth.getSession();
    if (!session) {
      showGuest("signin");
      showAlert("Your session has expired. Please sign in again.");
      return null;
    }
    state.session = session;
    return session.accessToken;
  }

  function route() {
    if (memberView.hidden) return;

    const name = window.location.hash.replace("#", "");
    const screen = SCREENS[name] || SCREENS[""];

    Object.values(SCREENS).forEach(id => { $(id).hidden = id !== screen; });
    window.scrollTo({ top: 0 });

    if (screen === "acOrdersScreen") loadOrders();
    if (screen === "acAddressesScreen") loadAddresses();
  }

  window.addEventListener("hashchange", route);

  /* ---- stats */

  function renderWishlistCount() {
    $("acStatWishlist").textContent = String(NoirStore.getWishlist().length);
  }

  document.addEventListener("wishlist:changed", renderWishlistCount);

  async function loadStats() {
    renderWishlistCount();
    const accessToken = await token();
    if (!accessToken) return;

    const [orders, addresses] = await Promise.all([NoirApi.getMyOrders(accessToken), NoirApi.listAddresses(accessToken)]);
    if (orders.orders) { state.orders = orders.orders; $("acStatOrders").textContent = String(orders.orders.length); }
    if (addresses.addresses) { state.addresses = addresses.addresses; $("acStatAddresses").textContent = String(addresses.addresses.length); }
  }

  /* ---- orders */

  const orderFilterState = { active: "all" };
  const ORDER_STEPS = ["placed", "processing", "shipped", "delivered"];
  const TRACK_ICONS = {
    placed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12a1 1 0 01-1 1H7a1 1 0 01-1-1L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    processing: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/></svg>',
    shipped: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
    delivered: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7"/></svg>'
  };

  function orderStatusIndex(status) {
    const normalized = String(status || "pending").toLowerCase();
    if (normalized === "cancelled") return -1;
    if (normalized === "delivered") return 3;
    if (normalized === "shipped") return 2;
    if (normalized === "processing" || normalized === "confirmed") return 1;
    return 0;
  }

  function orderStatusLabel(status) {
    const normalized = String(status || "pending").toLowerCase();
    if (normalized === "confirmed") return "Processing";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function renderTrack(order) {
    let normalized = String(order.status || "pending").toLowerCase();
    // The backend uses pending until the admin confirms the order.
    // In the customer-facing timeline that lifecycle stage is shown as Processing.
    if (normalized === "pending" || normalized === "confirmed") normalized = "processing";

    if (normalized === "cancelled") {
      return `
        <div class="ac-order__track ac-order__track--cancelled">
          <div class="ac-track ac-track--cancelled" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            <div class="ac-track__step is-done">${trackDot("placed", true)}<span class="ac-track__label">Order Placed</span></div>
            <div class="ac-track__step is-current">${trackDot("delivered", false)}<span class="ac-track__label">Cancelled</span></div>
          </div>
        </div>`;
    }

    const current = orderStatusIndex(normalized);
    const labels = ["Order Placed", "Processing", "Shipped", "Delivered"];
    const progress = `${Math.max(0, Math.min(100, (current / 3) * 100))}%`;
    return `
      <div class="ac-order__track" style="--track-progress:${progress}">
        <div class="ac-track" data-current="${current}">
          ${labels.map((label, index) => {
            const state = index < current ? "is-done" : index === current ? "is-current" : "";
            return `<div class="ac-track__step ${state}">${trackDot(ORDER_STEPS[index], index < current)}<span class="ac-track__label">${label}</span></div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function trackDot(type, done) {
    return `<span class="ac-track__dot">${done ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7"/></svg>' : TRACK_ICONS[type]}</span>`;
  }

  function formatAddress(address) {
    if (!address) return "—";
    const parts = [address.address, address.city, address.state, address.pin].filter(Boolean);
    return parts.join(", ");
  }

  function renderOrderCard(order, index, productsById) {
    const firstItem = order.items?.[0] || {};
    const product = productsById.get(Number(firstItem.productId));
    const image = product?.image || "";
    const itemCount = Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
    const moreItems = Math.max(0, (order.items?.length || 0) - 1);
    const status = String(order.status || "pending").toLowerCase();
    const displayStatus = status === "pending" ? "processing" : status;
    const statusLabel = orderStatusLabel(displayStatus);
    const paymentStatus = String(order.payment?.status || "pending").toLowerCase();
    const shippingMethod = order.shippingMethod?.label || "Standard delivery";
    const address = formatAddress(order.shippingAddress);
    const orderNumber = escapeHTML(order.orderNumber);

    // The order list is intentionally compact. Actions are determined by the order lifecycle:
    // processing/pending → cancel, shipped → track, delivered → buy again, cancelled → details only.
    const primaryAction = status === "shipped"
      ? `<button class="ac-pill ac-pill--light" type="button" data-track-order="${index}" aria-expanded="false">Track Order</button>`
      : status === "delivered"
        ? `<button class="ac-pill ac-pill--light" type="button" data-buy-again="${index}">Buy Again</button>`
        : status === "pending" || status === "processing" || status === "confirmed"
          ? `<button class="ac-pill ac-pill--cancel" type="button" data-cancel-order="${index}">Cancel Order</button>`
          : "";

    return `
      <li class="ac-order ac-order--${escapeHTML(displayStatus)}" data-status="${escapeHTML(displayStatus)}">
        <div class="ac-order__main">
          <span class="ac-order__img">${image ? `<img src="${escapeHTML(image)}" alt="" loading="lazy" decoding="async">` : ""}</span>
          <div class="ac-order__copy">
            <div class="ac-order__line">
              <span class="ac-status" data-status="${escapeHTML(displayStatus)}">${escapeHTML(statusLabel)}</span>
              <time class="ac-order__date" datetime="${escapeHTML(order.createdAt || "")}">${formatDate(order.createdAt)}</time>
            </div>
            <span class="ac-order__no">#${orderNumber}</span>
            <h3 class="ac-order__name">${escapeHTML(firstItem.name || "NOIR item")}</h3>
            <p class="ac-order__meta">${firstItem.size ? `Size ${escapeHTML(firstItem.size)}` : "Size selected at checkout"}${firstItem.quantity ? ` · Qty ${Number(firstItem.quantity)}` : ""}${moreItems ? ` · +${moreItems} more` : ""}</p>
          </div>
          <div class="ac-order__summary">
            <strong>${formatINR(order.total)}</strong>
            <small>${itemCount} ${itemCount === 1 ? "item" : "items"}</small>
          </div>
        </div>

        ${status === "processing" || status === "pending" || status === "confirmed"
          ? renderTrack(order)
          : status === "shipped"
            ? renderTrack(order).replace('<div class="ac-order__track"', '<div class="ac-order__track" hidden')
            : ""}

        <div class="ac-order__details" id="acOrderDetails-${index}" hidden>
          <div class="ac-order__detail"><small>Deliver to</small><span>${escapeHTML(address)}</span></div>
          <div class="ac-order__detail"><small>Payment</small><span>${escapeHTML(paymentStatus)}</span></div>
          <div class="ac-order__detail"><small>Shipping</small><span>${escapeHTML(shippingMethod)}</span></div>
        </div>

        <div class="ac-order__actions">
          ${primaryAction}
          <button class="ac-pill" type="button" data-order-details="${index}" aria-expanded="false" aria-controls="acOrderDetails-${index}">View Details <span aria-hidden="true">→</span></button>
        </div>
      </li>`;
  }

  function renderOrderList(products = []) {
    const list = $("acOrdersList");
    if (!list) return;

    const productsById = new Map(products.map(product => [Number(product.id), product]));
    const active = orderFilterState.active;
    const orders = Array.isArray(state.orders) ? state.orders : [];
    const visible = orders.map((order, index) => ({ order, index })).filter(({ order }) => {
      const status = String(order.status || "pending").toLowerCase();
      if (active === "all") return true;
      if (active === "processing") return status === "pending" || status === "processing" || status === "confirmed";
      return status === active;
    });

    list.innerHTML = visible.map(({ order, index }) => renderOrderCard(order, index, productsById)).join("");
    $("acOrdersEmpty").hidden = orders.length !== 0 && visible.length !== 0;
    if (orders.length !== 0 && visible.length === 0) {
      $("acOrdersEmpty").hidden = false;
      $("acOrdersEmpty").querySelector("h3").textContent = `No ${active === "all" ? "orders" : active} orders`;
      $("acOrdersEmpty").querySelector("p").textContent = "Try another filter to view the rest of your orders.";
      $("acOrdersEmpty").querySelector("a").hidden = true;
    } else if (orders.length === 0) {
      $("acOrdersEmpty").querySelector("h3").textContent = "No orders yet";
      $("acOrdersEmpty").querySelector("p").textContent = "Orders you place while signed in will show up here.";
      $("acOrdersEmpty").querySelector("a").hidden = false;
    } else {
      $("acOrdersEmpty").hidden = true;
      $("acOrdersEmpty").querySelector("a").hidden = false;
    }
  }

  function setupOrderFilters(products = []) {
    const filters = $("acOrderFilters");
    if (!filters || filters.dataset.bound) return;
    filters.dataset.bound = "true";
    filters.addEventListener("click", event => {
      const button = event.target.closest("[data-order-filter]");
      if (!button) return;
      orderFilterState.active = button.dataset.orderFilter || "all";
      filters.querySelectorAll("[data-order-filter]").forEach(item => item.setAttribute("aria-selected", String(item === button)));
      renderOrderList(products);
    });
  }

  async function loadOrders() {
    const accessToken = await token();
    if (!accessToken) return;

    memberAlert("acOrdersAlert", "");
    $("acOrdersLoading").hidden = false;
    $("acOrdersList").innerHTML = "";
    $("acOrdersEmpty").hidden = true;

    const [result, products] = await Promise.all([NoirApi.getMyOrders(accessToken), NoirApi.getProducts().catch(() => [])]);
    $("acOrdersLoading").hidden = true;

    if (result.error) {
      memberAlert("acOrdersAlert", result.error);
      return;
    }

    state.orders = result.orders;
    $("acStatOrders").textContent = String(result.orders.length);
    setupOrderFilters(products);
    renderOrderList(products);
  }

  $("acOrdersList").addEventListener("click", async event => {
    const detailsButton = event.target.closest("[data-order-details]");
    if (detailsButton) {
      const details = $("acOrderDetails-" + detailsButton.dataset.orderDetails);
      if (!details) return;
      const open = !details.hidden;
      details.hidden = open;
      detailsButton.setAttribute("aria-expanded", String(!open));
      detailsButton.innerHTML = open ? 'View Details <span aria-hidden="true">→</span>' : 'Hide Details <span aria-hidden="true">↑</span>';
      return;
    }

    const trackButton = event.target.closest("[data-track-order]");
    if (trackButton) {
      const card = trackButton.closest(".ac-order");
      const track = card?.querySelector(".ac-order__track");
      if (!track) return;
      const hidden = track.hidden;
      track.hidden = !hidden;
      trackButton.setAttribute("aria-expanded", String(hidden));
      trackButton.textContent = hidden ? "Hide Tracking" : "Track Order";
      if (hidden) {
        requestAnimationFrame(() => {
          track.scrollIntoView({ behavior: "smooth", block: "nearest" });
          track.animate([{ opacity: .7, transform: "translateY(-3px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
        });
      }
      return;
    }

    const buyAgainButton = event.target.closest("[data-buy-again]");
    if (buyAgainButton) {
      const order = state.orders[Number(buyAgainButton.dataset.buyAgain)];
      if (!order?.items?.length || typeof window.addToCart !== "function") return;
      const products = await NoirApi.getProducts().catch(() => []);
      const byId = new Map(products.map(product => [Number(product.id), product]));
      let added = 0;
      order.items.forEach(item => {
        const product = byId.get(Number(item.productId));
        if (!product) return;
        for (let qty = 0; qty < Math.min(Number(item.quantity) || 1, 20); qty += 1) {
          window.addToCart({ ...product, selectedSize: item.size || "" });
        }
        added += 1;
      });
      if (added) NoirStore.showToast(`${added} ${added === 1 ? "item" : "items"} added to your bag`, { label: "View bag", onClick: () => window.openCart?.() });
      return;
    }

    const cancelButton = event.target.closest("[data-cancel-order]");
    if (!cancelButton) return;

    const order = state.orders[Number(cancelButton.dataset.cancelOrder)];
    if (!order) return;

    if (!window.confirm(`Cancel order ${order.orderNumber}? This will mark the order as cancelled.`)) return;

    const accessToken = await token();
    if (!accessToken) return;

    cancelButton.disabled = true;
    const result = await NoirApi.cancelOrder(accessToken, order.id);

    if (result.error) {
      cancelButton.disabled = false;
      memberAlert("acOrdersAlert", result.error);
      return;
    }

    await loadOrders();
    memberAlert("acOrdersAlert", `Order ${order.orderNumber} has been cancelled.`, true);
  });

  /* ---- addresses */

  const ADDR = { label: $("acaLabel"), name: $("acaName"), phone: $("acaPhone"), address: $("acaAddress"), city: $("acaCity"), state: $("acaState"), pin: $("acaPin"), isDefault: $("acaDefault") };

  NoirShared.STATES.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    ADDR.state.appendChild(option);
  });
  ADDR.state.required = true; // lets ":invalid" grey the "State" placeholder

  function setAddrError(field, message) {
    const box = document.querySelector(`[data-afield="aca${field[0].toUpperCase()}${field.slice(1)}"]`);
    if (!box) return;
    box.querySelector(".au-error").textContent = message || "";
    box.classList.toggle("has-error", Boolean(message));
  }

  function renderAddresses() {
    const list = state.addresses || [];
    $("acAddrEmpty").hidden = list.length > 0 || !$("acAddrForm").hidden;
    $("acAddrList").innerHTML = list.map(address => `
      <li class="ac-card">
        <div class="ac-card__top"><span class="ac-tag">${escapeHTML(address.label)}</span>${address.isDefault ? '<span class="ac-tag ac-tag--default">Default</span>' : ""}</div>
        <p><strong>${escapeHTML(address.name)}</strong></p>
        <p>${escapeHTML(address.address)}, ${escapeHTML(address.city)}, ${escapeHTML(address.state)} ${escapeHTML(address.pin)}</p>
        <p>+91 ${escapeHTML(address.phone)}</p>
        <div class="ac-card__actions">
          <button class="ac-link" type="button" data-addr="edit" data-id="${address.id}">Edit</button>
          ${address.isDefault ? "" : `<button class="ac-link" type="button" data-addr="default" data-id="${address.id}">Make default</button>`}
          <button class="ac-link ac-link--danger" type="button" data-addr="delete" data-id="${address.id}">Delete</button>
        </div>
      </li>`).join("");
    $("acStatAddresses").textContent = String(list.length);
  }

  async function loadAddresses() {
    const accessToken = await token();
    if (!accessToken) return;

    memberAlert("acAddrAlert", "");
    $("acAddrLoading").hidden = false;
    closeAddrForm();

    const result = await NoirApi.listAddresses(accessToken);
    $("acAddrLoading").hidden = true;

    if (result.error) {
      memberAlert("acAddrAlert", result.error);
      return;
    }

    state.addresses = result.addresses;
    renderAddresses();
  }

  function openAddrForm(address) {
    state.editing = address ? address.id : null;
    $("acAddrFormTitle").textContent = address ? "Edit address" : "New address";

    ADDR.label.value = address ? address.label : (state.addresses && state.addresses.length ? "" : "Home");
    ADDR.name.value = address ? address.name : ((state.session && state.session.user.name) || "");
    ADDR.phone.value = address ? address.phone : "";
    ADDR.address.value = address ? address.address : "";
    ADDR.city.value = address ? address.city : "";
    ADDR.state.value = address ? address.state : "";
    ADDR.pin.value = address ? address.pin : "";
    ADDR.isDefault.checked = address ? address.isDefault : !(state.addresses && state.addresses.length);
    ["label", "name", "phone", "address", "city", "state", "pin"].forEach(field => setAddrError(field, ""));

    $("acAddrForm").hidden = false;
    $("acAddrAdd").hidden = true;
    $("acAddrEmpty").hidden = true;
    ADDR.label.focus();
    $("acAddrForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function closeAddrForm() {
    state.editing = null;
    $("acAddrForm").hidden = true;
    $("acAddrAdd").hidden = false;
    if (state.addresses) $("acAddrEmpty").hidden = state.addresses.length > 0;
  }

  $("acAddrAdd").addEventListener("click", () => openAddrForm(null));
  $("acAddrCancel").addEventListener("click", closeAddrForm);

  $("acAddrForm").addEventListener("submit", async event => {
    event.preventDefault();

    const values = {
      label: ADDR.label.value.trim(), name: ADDR.name.value.trim(), phone: ADDR.phone.value.trim(),
      address: ADDR.address.value.trim(), city: ADDR.city.value.trim(), state: ADDR.state.value, pin: ADDR.pin.value.trim()
    };

    const errors = NoirShared.validateCheckoutFields({ email: "x@x.co", name: values.name, phone: values.phone, address: values.address, city: values.city, state: values.state, pin: values.pin });
    if (!values.label) errors.label = "Give this address a name, like Home or Work.";

    ["label", "name", "phone", "address", "city", "state", "pin"].forEach(field => setAddrError(field, errors[field] || ""));
    const first = ["label", "name", "phone", "address", "city", "state", "pin"].find(field => errors[field]);
    if (first) { ADDR[first].focus(); return; }

    const accessToken = await token();
    if (!accessToken) return;

    const save = $("acAddrSave");
    save.disabled = true;
    const result = await NoirApi.saveAddress(accessToken, {
      id: state.editing || undefined, ...values, phone: NoirShared.normalizePhone(values.phone), isDefault: ADDR.isDefault.checked
    });
    save.disabled = false;

    if (result.error) { memberAlert("acAddrAlert", result.error); return; }

    memberAlert("acAddrAlert", state.editing ? "Address updated." : "Address saved.", true);
    closeAddrForm();
    const refreshed = await NoirApi.listAddresses(accessToken);
    if (refreshed.addresses) state.addresses = refreshed.addresses;
    renderAddresses();
  });

  ["acaLabel", "acaName", "acaPhone", "acaAddress", "acaCity", "acaState", "acaPin"].forEach(id => {
    $(id).addEventListener("input", () => {
      const box = $(id).closest("[data-afield]");
      box.classList.remove("has-error");
      box.querySelector(".au-error").textContent = "";
    });
  });

  $("acAddrList").addEventListener("click", async event => {
    const button = event.target.closest("[data-addr]");
    if (!button) return;

    const address = (state.addresses || []).find(item => item.id === button.dataset.id);
    if (!address) return;

    if (button.dataset.addr === "edit") { openAddrForm(address); return; }

    const accessToken = await token();
    if (!accessToken) return;

    let result;
    if (button.dataset.addr === "delete") {
      if (!window.confirm("Delete this address?")) return;
      result = await NoirApi.deleteAddress(accessToken, address.id);
    } else {
      result = await NoirApi.saveAddress(accessToken, { ...address, isDefault: true });
    }

    if (result.error) { memberAlert("acAddrAlert", result.error); return; }

    memberAlert("acAddrAlert", "");
    const refreshed = await NoirApi.listAddresses(accessToken);
    if (refreshed.addresses) state.addresses = refreshed.addresses;
    renderAddresses();
  });

  /* ---- settings */

  function setSettingsError(id, message) {
    const box = $(id).closest("[data-afield]");
    box.querySelector(".au-error").textContent = message || "";
    box.classList.toggle("has-error", Boolean(message));
  }

  ["acsName", "acsPw", "acsPw2"].forEach(id => $(id).addEventListener("input", () => setSettingsError(id, "")));

  $("acNameForm").addEventListener("submit", async event => {
    event.preventDefault();
    memberAlert("acSetAlert", "");

    const name = $("acsName").value.trim();
    if (name.length < 2) { setSettingsError("acsName", "Enter your full name."); return; }
    if (name.length > 100) { setSettingsError("acsName", "Name is too long."); return; }

    const result = await NoirAuth.updateName(name);
    if (result.error) { memberAlert("acSetAlert", result.error); return; }

    state.session = result.session;
    $("auHello").textContent = name;
    $("auAvatar").textContent = name[0];
    memberAlert("acSetAlert", "Your name has been updated.", true);
  });

  $("acPwForm").addEventListener("submit", async event => {
    event.preventDefault();
    memberAlert("acSetAlert", "");

    const password = $("acsPw").value;
    if (password.length < 8) { setSettingsError("acsPw", "Use at least 8 characters."); return; }
    if (password !== $("acsPw2").value) { setSettingsError("acsPw2", "Passwords don't match."); return; }

    const result = await NoirAuth.updatePassword(password);
    if (result.error) { memberAlert("acSetAlert", result.error); return; }

    $("acsPw").value = "";
    $("acsPw2").value = "";
    memberAlert("acSetAlert", "Your password has been updated.", true);
  });

  $("acsSignOut").addEventListener("click", async () => {
    await NoirAuth.signOut();
    showGuest("signin");
  });

  /* ---------------------------------------------------------------- Google */

  const googleButton = $("auGoogle");

  function setGoogleAvailable(available) {
    googleButton.disabled = !available;
    googleButton.setAttribute("aria-disabled", String(!available));
    googleButton.querySelector("em").hidden = available;
    googleButton.title = available ? "" : "Google sign-in is not switched on yet";
  }

  googleButton.addEventListener("click", () => {
    if (googleButton.disabled) return;

    if (window.location.protocol === "file:") {
      showAlert("Google sign-in needs the site to be opened from a web address (http or https), not from a file.");
      return;
    }

    window.location.href = NoirAuth.googleUrl(window.location.origin + window.location.pathname + (queryNext ? `?next=${encodeURIComponent(queryNext)}` : ""));
  });

  setGoogleAvailable(false); // until the project settings say otherwise

  /* ---------------------------------------------------------------- start */

  async function init() {
    // Coming back from Google, or from an emailed confirmation / reset link.
    const redirect = await NoirAuth.consumeRedirect(window.location.hash);
    if (redirect) window.history.replaceState(null, "", window.location.pathname + window.location.search);

    NoirAuth.getSettings().then(settings => {
      state.settings = settings;
      if (!settings) return;

      state.signupDisabled = settings.signupDisabled;
      setGoogleAvailable(settings.google);

      if (settings.signupDisabled && state.mode === "create" && !authView.hidden) setMode("signin");
    });

    if (redirect && redirect.error) {
      showGuest("signin");
      showAlert(redirect.error);
      return;
    }

    if (redirect && redirect.session) {
      if (redirect.type === "recovery") {
        showGuest("reset");
      } else {
        enter(redirect.session, redirect.type === "signup" ? "Your email is confirmed. Welcome to NOIR." : "");
      }
      return;
    }

    const session = await NoirAuth.getSession();
    if (session) enter(session);
    else showGuest(startMode);
  }

  init();
})();
