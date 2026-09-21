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
    const images = new Map(products.map(product => [Number(product.id), product.image]));

    if (result.orders.length === 0) {
      $("acOrdersEmpty").hidden = false;
      return;
    }

    $("acOrdersList").innerHTML = result.orders.map((order, index) => `
      <li class="ac-order">
        <div class="ac-order__head">
          <div><span class="ac-order__no">${escapeHTML(order.orderNumber)}</span><span class="ac-order__date">${formatDate(order.createdAt)}</span></div>
          <span class="ac-status" data-status="${escapeHTML(order.status)}">${escapeHTML(order.status)}</span>
        </div>
        <ul class="ac-order__items">
          ${order.items.map(item => `
            <li>
              <span class="ac-order__img">${images.get(Number(item.productId)) ? `<img src="${escapeHTML(images.get(Number(item.productId)))}" alt="" loading="lazy">` : ""}</span>
              <span><strong>${escapeHTML(item.name)}</strong><small>Size ${escapeHTML(item.size)} · Qty ${item.quantity}</small></span>
              <b>${formatINR(item.price * item.quantity)}</b>
            </li>`).join("")}
        </ul>
        <div class="ac-order__foot">
          <div class="ac-order__total"><small>Total · payment ${escapeHTML((order.payment && order.payment.status) || "pending")}</small><strong>${formatINR(order.total)}</strong></div>
          ${order.status === "pending" && (!order.payment || order.payment.status === "pending")
            ? `<button class="ac-pill ac-pill--cancel" type="button" data-cancel-order="${index}">Cancel order</button>`
            : ""}
        </div>
      </li>`).join("");
  }

  $("acOrdersList").addEventListener("click", async event => {
    const button = event.target.closest("[data-cancel-order]");
    if (!button) return;

    const order = state.orders[Number(button.dataset.cancelOrder)];
    if (!order) return;

    if (!window.confirm(`Cancel order ${order.orderNumber}? It will be removed and this can't be undone.`)) return;

    const accessToken = await token();
    if (!accessToken) return;

    button.disabled = true;
    const result = await NoirApi.cancelOrder(accessToken, order.id);

    if (result.error) {
      button.disabled = false;
      memberAlert("acOrdersAlert", result.error);
      return;
    }

    await loadOrders();
    memberAlert("acOrdersAlert", `Order ${order.orderNumber} has been cancelled and removed.`, true);
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
