/*
 * NOIR checkout gate: "Create an account to continue".
 * Orders need an account, so visitors who are not signed in see this instead of the checkout.
 *
 *   NoirGate.ensureSignedIn()   -> Promise<boolean>; opens the popup (desktop) / bottom sheet (phones) when signed out
 *   NoirGate.render(container)  -> draws the same card inline (used by the checkout page itself)
 *   NoirGate.safeNext(value)    -> a same-site page name that is safe to redirect to, or ""
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    root.NoirGate = factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function (root) {
  const NEXT_PAGES = ["checkout.html"];

  // Only known pages can be used as the "where to go after signing in" target (no open redirects).
  function safeNext(value) {
    const page = String(value || "").trim();
    return NEXT_PAGES.includes(page) ? page : "";
  }

  function accountUrl(mode, next) {
    return `account.html?mode=${mode}&next=${encodeURIComponent(next)}`;
  }

  const ICONS = {
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
    person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 002-2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a2 2 0 000-4z" transform="translate(0 -1)"/><path d="M14 7v10" stroke-dasharray="1.5 2.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  // A drawn tote bag (no photo needed) that sits beside the text on desktop.
  const BAG = `
    <svg class="gate__bag" viewBox="0 0 260 280" aria-hidden="true" focusable="false">
      <ellipse cx="140" cy="262" rx="92" ry="9" fill="#000" opacity=".08"/>
      <path d="M92 108c-6-46 8-84 46-84s52 38 46 84" fill="none" stroke="#151515" stroke-width="9" stroke-linecap="round"/>
      <path d="M118 112c-4-40 4-70 30-70s34 30 30 70" fill="none" stroke="#151515" stroke-width="9" stroke-linecap="round" opacity=".85"/>
      <path d="M60 104h158l14 150c0 6-4 10-10 10H56c-6 0-10-4-10-10z" fill="#d8cfc3"/>
      <path d="M60 104h158l3 30H57z" fill="#e3dbd0"/>
      <path d="M218 104l14 150c0 6-4 10-10 10h-24l8-160z" fill="#c9bfb1" opacity=".75"/>
      <text x="139" y="172" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="10.5" letter-spacing="3.4" fill="#2a2621">GOOD</text>
      <text x="139" y="192" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="10.5" letter-spacing="3.4" fill="#2a2621">THINGS</text>
      <text x="139" y="212" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="10.5" letter-spacing="3.4" fill="#2a2621">AHEAD</text>
      <path d="M118 226h42" stroke="#2a2621" stroke-width="1.4"/>
    </svg>`;

  function cardHTML({ dismissible, next }) {
    return `
      ${dismissible ? `<button class="gate__close" type="button" data-gate-close aria-label="Close">${ICONS.close}</button>` : ""}
      <div class="gate__main">
        <div class="gate__copy">
          <p class="gate__eyebrow"><span>A better shopping <br class="gate__br">experience <em class="gate__awaits">awaits</em></span></p>
          <h2 class="gate__title" id="gateTitle">Create an account <br>to continue</h2>
          <p class="gate__lead">Sign in or create a free account to complete your purchase and enjoy more benefits.</p>
        </div>
        ${BAG}
      </div>

      <ul class="gate__perks">
        <li><span>${ICONS.truck}</span><b>Faster<br>Checkout</b></li>
        <li><span>${ICONS.heart}</span><b>Save Your<br>Favorites</b></li>
        <li><span>${ICONS.box}</span><b>Track Your<br>Orders</b></li>
        <li><span><i class="gate__ico-desk">${ICONS.person}</i><i class="gate__ico-mob">${ICONS.ticket}</i></span><b><em class="gate__desk">Get </em>Exclusive<br>Offers</b></li>
      </ul>

      <p class="gate__or"><span>Continue your journey</span></p>

      <div class="gate__actions">
        <a class="gate__btn gate__btn--solid" href="${accountUrl("signin", next)}">Sign In ${ICONS.arrow}</a>
        <a class="gate__btn gate__btn--line" href="${accountUrl("create", next)}">Create Account ${ICONS.arrow}</a>
      </div>
      <p class="gate__foot">It&rsquo;s quick, easy, and free!</p>`;
  }

  /* ------------------------------------------------------------ browser only */

  let openGate = null;

  function open(next) {
    const doc = root.document;
    if (openGate) return;

    const previous = doc.activeElement;
    const layer = doc.createElement("div");
    layer.className = "gate-layer";
    layer.innerHTML = `
      <div class="gate-backdrop" data-gate-close></div>
      <section class="gate" role="dialog" aria-modal="true" aria-labelledby="gateTitle">${cardHTML({ dismissible: true, next })}</section>`;

    function close() {
      doc.removeEventListener("keydown", onKey);
      doc.body.classList.remove("gate-open");
      layer.classList.remove("is-in");
      setTimeout(() => layer.remove(), 220);
      openGate = null;
      if (previous && previous.focus) previous.focus();
    }

    function onKey(event) {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const focusable = Array.from(layer.querySelectorAll("a[href], button")).filter(el => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }

    layer.addEventListener("click", event => { if (event.target.closest("[data-gate-close]")) close(); });
    doc.addEventListener("keydown", onKey);
    doc.body.appendChild(layer);
    doc.body.classList.add("gate-open");
    requestAnimationFrame(() => layer.classList.add("is-in"));
    layer.querySelector(".gate__btn--solid").focus();

    openGate = { close };
  }

  async function ensureSignedIn(next = "checkout.html") {
    let session = null;

    try {
      session = root.NoirAuth ? await root.NoirAuth.getSession() : null;
    } catch (error) {
      session = null;
    }

    if (session) return true;
    open(safeNext(next) || "checkout.html");
    return false;
  }

  function render(container, next = "checkout.html") {
    container.innerHTML = `<section class="gate gate--inline" aria-labelledby="gateTitle">${cardHTML({ dismissible: false, next: safeNext(next) || "checkout.html" })}</section>`;
  }

  return { ensureSignedIn, render, safeNext, _accountUrl: accountUrl };
});
