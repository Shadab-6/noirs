/*
 * NOIR storefront helpers shared by Home, Shop, Wishlist and Account.
 *
 *   NoirStore.renderGrid(el, products)   draws product cards into a grid
 *   NoirStore.getWishlist() / toggleWishlist(id)
 *   NoirStore.showToast(message, action)
 *
 * The pure helpers (formatting, wishlist list maths) work in Node so they can be unit tested.
 * Everything that touches the page only runs in a browser, and initialises itself on DOMContentLoaded:
 * header menu, "scrolled" state, cart / wishlist badges.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    root.NoirStore = factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function (root) {
  "use strict";

  const WISHLIST_KEY = "noirWishlist";
  const CATEGORY_LABELS = { hoodie: "Hoodies", jacket: "Jackets", sweatshirt: "Sweatshirts", bottoms: "Bottoms", knitwear: "Knitwear", tops: "Tops", shoes: "Shoes" };
  const TOAST_MS = 3800;

  // Fallback copy of the wishlist for when localStorage is unavailable.
  let memoryWishlist = null;

  /* ------------------------------------------------------------------ pure helpers */

  function formatINR(value) {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }

  function titleCase(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/(^|\s)\S/g, letter => letter.toUpperCase());
  }

  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || titleCase(category);
  }

  // Reads the saved wishlist: a de-duplicated array of positive integer product ids. Anything else -> [].
  function parseWishlist(raw) {
    try {
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return [...new Set(list.map(Number).filter(id => Number.isInteger(id) && id > 0))];
    } catch (error) {
      return [];
    }
  }

  function toggleInList(list, id) {
    return list.includes(id) ? list.filter(item => item !== id) : [...list, id];
  }

  /* ------------------------------------------------------------------ wishlist (browser) */

  function getWishlist() {
    try {
      return parseWishlist(root.localStorage.getItem(WISHLIST_KEY));
    } catch (error) {
      return [];
    }
  }

  function setWishlist(list) {
    try {
      root.localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    } catch (error) {
      // Storage can be unavailable (private mode): the wishlist then lasts for this page only.
      memoryWishlist = list;
    }
    root.document.dispatchEvent(new CustomEvent("wishlist:changed", { detail: list }));
  }

  function currentWishlist() {
    return memoryWishlist || getWishlist();
  }

  function toggleWishlist(id, name) {
    const before = currentWishlist();
    const after = toggleInList(before, id);
    setWishlist(after);

    if (after.includes(id)) {
      showToast(`${titleCase(name)} saved`, { label: "View wishlist", href: "wishlist.html" });
    } else {
      showToast(`${titleCase(name)} removed`, { label: "Undo", onClick: () => setWishlist(toggleInList(currentWishlist(), id)) });
    }
  }

  function syncWishlistUI() {
    const list = currentWishlist();

    root.document.querySelectorAll("[data-wish]").forEach(button => {
      const saved = list.includes(Number(button.dataset.wish));
      button.setAttribute("aria-pressed", String(saved));
    });

    root.document.querySelectorAll("[data-wish-count]").forEach(badge => {
      badge.textContent = String(list.length);
      badge.hidden = list.length === 0;
    });
  }

  /* ------------------------------------------------------------------ bag */

  function whenCartReady(callback) {
    if (typeof root.addToCart === "function") {
      callback();
      return;
    }
    root.document.addEventListener("cart:ready", callback, { once: true });
  }

  function openBag() {
    if (typeof root.openCart === "function") root.openCart();
  }

  // No size here: the checkout summary asks for one on any line that has none.
  function addToBag(product) {
    const item = {
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      category: product.category,
      sale: product.sale,
      image: product.image
    };

    whenCartReady(() => {
      root.addToCart(item);
      showToast(`${titleCase(product.name)} added to cart`, { label: "View cart", onClick: openBag });
    });
  }

  /* ------------------------------------------------------------------ toast */

  let toastTimer = null;

  function getToast() {
    let toast = root.document.getElementById("nToast");
    if (toast) return toast;

    toast = root.document.createElement("div");
    toast.id = "nToast";
    toast.className = "n-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = '<span class="n-toast__msg"></span><a class="n-toast__action" hidden></a>';
    (root.document.querySelector(".n-shell") || root.document.body).appendChild(toast);
    return toast;
  }

  // action: { label, href } or { label, onClick }
  function showToast(message, action) {
    const toast = getToast();
    const actionEl = toast.querySelector(".n-toast__action");

    toast.querySelector(".n-toast__msg").textContent = message;

    if (action) {
      actionEl.textContent = action.label;
      actionEl.hidden = false;
      actionEl.href = action.href || "#";
      actionEl.onclick = action.onClick
        ? event => { event.preventDefault(); hideToast(); action.onClick(); }
        : null;
    } else {
      actionEl.hidden = true;
      actionEl.onclick = null;
    }

    toast.classList.add("is-visible");
    root.clearTimeout(toastTimer);
    toastTimer = root.setTimeout(hideToast, TOAST_MS);
  }

  function hideToast() {
    const toast = root.document.getElementById("nToast");
    if (toast) toast.classList.remove("is-visible");
  }

  /* ------------------------------------------------------------------ product card + grid */

  const ICON_HEART = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  function renderCard(product) {
    const name = escapeHTML(titleCase(product.name));
    const href = `product.html?id=${encodeURIComponent(product.id)}`;
    const hasOldPrice = Number(product.oldPrice) > Number(product.price);

    return `
      <article class="n-card" data-id="${escapeHTML(product.id)}">
        <div class="n-card__media">
          <a class="n-card__image" href="${href}" tabindex="-1" aria-hidden="true">
            <img src="${escapeHTML(product.image)}" alt="" width="600" height="600" loading="lazy" decoding="async">
          </a>
          ${product.sale ? '<span class="n-tag">Sale</span>' : ""}
          <button class="n-heart" type="button" data-wish="${escapeHTML(product.id)}" aria-pressed="false" aria-label="Save ${name} to wishlist">
            <span class="n-heart__disc">${ICON_HEART}</span>
          </button>
        </div>
        <a class="n-card__name" href="${href}">${name}</a>
        <p class="n-card__price">
          <strong>${formatINR(product.price)}</strong>
          ${hasOldPrice ? `<s><span class="n-sr">Was </span>${formatINR(product.oldPrice)}</s>` : ""}
        </p>
        <button class="n-add" type="button" data-add aria-label="Add ${name} to cart">Add to cart</button>
      </article>
    `;
  }

  const gridProducts = new WeakMap();

  function bindGrid(container) {
    if (container.dataset.nBound) return;
    container.dataset.nBound = "true";

    container.addEventListener("click", event => {
      const card = event.target.closest(".n-card");
      const products = gridProducts.get(container);
      if (!card || !products) return;

      const product = products.get(Number(card.dataset.id));
      if (!product) return;

      if (event.target.closest("[data-wish]")) {
        toggleWishlist(product.id, product.name);
        return;
      }

      if (event.target.closest("[data-add]")) addToBag(product);
    });
  }

  function renderGrid(container, products) {
    if (!container) return;

    bindGrid(container);
    gridProducts.set(container, new Map(products.map(product => [Number(product.id), product])));
    container.innerHTML = products.map(renderCard).join("");
    container.removeAttribute("aria-busy");
    syncWishlistUI();
  }

  function renderSkeletons(container, count) {
    if (!container) return;

    container.setAttribute("aria-busy", "true");
    container.innerHTML = Array.from({ length: count }, () => `
      <div class="n-card n-card--skeleton" aria-hidden="true">
        <div class="n-card__media"></div>
        <span class="n-skel n-skel--name"></span>
        <span class="n-skel n-skel--price"></span>
      </div>
    `).join("");
  }

  /* ------------------------------------------------------------------ header + page behaviour */

  function initMenu() {
    const doc = root.document;
    const toggle = doc.getElementById("navToggle");
    const menu = doc.getElementById("siteMenu");
    const scrim = doc.getElementById("menuScrim");
    if (!toggle || !menu) return;

    function setOpen(open, restoreFocus) {
      menu.classList.toggle("is-open", open);
      if (scrim) scrim.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      doc.body.classList.toggle("n-menu-open", open);

      if (open) {
        const first = menu.querySelector("a");
        if (first) first.focus();
      } else if (restoreFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", () => setOpen(!menu.classList.contains("is-open"), true));
    if (scrim) scrim.addEventListener("click", () => setOpen(false, true));

    doc.addEventListener("keydown", event => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) setOpen(false, true);
    });

    root.matchMedia("(min-width: 768px)").addEventListener("change", event => {
      if (event.matches && menu.classList.contains("is-open")) setOpen(false, false);
    });
  }

  function initScrolledState() {
    const html = root.document.documentElement;
    const update = () => { html.dataset.scrolled = String(root.scrollY > 8); };
    root.addEventListener("scroll", update, { passive: true });
    update();
  }

  // cart.js writes the count into #cartCount; hide the badge while the bag is empty.
  function initCartBadge() {
    const badge = root.document.getElementById("cartCount");
    if (!badge) return;

    const update = () => { badge.hidden = !(Number(badge.textContent) > 0); };
    new root.MutationObserver(update).observe(badge, { childList: true, characterData: true, subtree: true });
    update();
  }

  function init() {
    initMenu();
    initScrolledState();
    initCartBadge();
    syncWishlistUI();

    root.document.addEventListener("wishlist:changed", syncWishlistUI);
    // Keeps other open tabs in step.
    root.addEventListener("storage", event => {
      if (event.key === WISHLIST_KEY) {
        memoryWishlist = null;
        syncWishlistUI();
        root.document.dispatchEvent(new CustomEvent("wishlist:changed", { detail: getWishlist() }));
      }
    });
  }

  if (typeof root.document !== "undefined") {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init);
    else init();
  }

  return {
    CATEGORY_LABELS,
    formatINR,
    titleCase,
    escapeHTML,
    categoryLabel,
    parseWishlist,
    toggleInList,
    getWishlist: currentWishlist,
    toggleWishlist,
    renderCard,
    renderGrid,
    renderSkeletons,
    showToast,
    addToBag,
    openBag
  };
});
