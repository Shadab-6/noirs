const fallbackProducts = [
  {"id":1,"name":"Sage Curve Sweatshirt","price":2999,"oldPrice":6999,"category":"sweatshirt","genders":["men","women"],"sizes":["S","M","L","XL"],"sale":true,"popular":true,"image":"assets/images/item1(1).png"},
  {"id":2,"name":"Ivory Panel Sweatshirt","price":2499,"oldPrice":7499,"category":"sweatshirt","genders":["men","women"],"sizes":["S","M","L","XL"],"sale":true,"popular":true,"image":"assets/images/item2(1).png"},
  {"id":3,"name":"Graphite Panel Sweatshirt","price":3499,"oldPrice":7999,"category":"sweatshirt","genders":["men","women"],"sizes":["S","M","L","XL"],"sale":true,"popular":true,"image":"assets/images/item3(1).png"},
  {"id":4,"name":"Mocha Curve Sweatshirt","price":1999,"oldPrice":8999,"category":"sweatshirt","genders":["men","women"],"sizes":["S","M","L","XL"],"sale":true,"popular":true,"image":"assets/images/item4(1).png"},
  {"id": 23, "name": "Urban Panel Sweatshirt", "price": 3999, "oldPrice": 7499, "category": "sweatshirt", "genders": ["men", "women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": true, "image": "assets/images/sweatshirt-urban-panel.webp"},
  {"id": 24, "name": "Forest Collared Half-Zip Sweatshirt", "price": 1999, "oldPrice": 3999, "category": "sweatshirt", "genders": ["men", "women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": false, "image": "assets/images/sweatshirt-forest-zip-collar.webp"},
  {"id": 7, "name": "Forest Green Hoodie", "price": 2499, "oldPrice": 8799, "category": "hoodie", "genders": ["men"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": true, "image": "assets/images/item7.webp"},
  {"id": 8, "name": "Noir Black Hoodie", "price": 2199, "oldPrice": 8499, "category": "hoodie", "genders": ["men", "women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": true, "image": "assets/images/item8.webp"},
  {"id": 9, "name": "Taupe Bomber Jacket", "price": 3299, "oldPrice": 9299, "category": "jacket", "genders": ["men", "women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": true, "image": "assets/images/item9.webp"},
  {"id": 10, "name": "Black Bomber Jacket", "price": 3699, "oldPrice": 9799, "category": "jacket", "genders": ["men"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": true, "image": "assets/images/item10.webp"},
  {"id": 11, "name": "Heritage Court Sneaker", "price": 4999, "oldPrice": 9499, "category": "shoes", "genders": ["women"], "sizes": ["3", "4", "5", "6", "7", "8"], "sale": true, "popular": false, "image": "assets/images/item11.webp"},
  {"id": 12, "name": "Classic Canvas Low-Top", "price": 2799, "oldPrice": 5499, "category": "shoes", "genders": ["women"], "sizes": ["3", "4", "5", "6", "7", "8"], "sale": true, "popular": false, "image": "assets/images/item12.webp"},
  {"id": 13, "name": "Light Wash Wide-Leg Jeans", "price": 3399, "oldPrice": 7999, "category": "bottoms", "genders": ["women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": false, "image": "assets/images/item13.webp"},
  {"id": 14, "name": "Striped Half-Zip Sweater", "price": 3899, "oldPrice": 9199, "category": "knitwear", "genders": ["women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": false, "image": "assets/images/item14.webp"},
  {"id": 15, "name": "Pleated Wide-Leg Trousers", "price": 3799, "oldPrice": 8599, "category": "bottoms", "genders": ["women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": false, "image": "assets/images/item15.webp"},
  {"id": 16, "name": "Layered Collar Cardigan", "price": 3999, "oldPrice": 9599, "category": "knitwear", "genders": ["women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": false, "image": "assets/images/item16.webp"},
  {"id": 17, "name": "Wide-Leg Cargo Pants", "price": 3599, "oldPrice": 8899, "category": "bottoms", "genders": ["women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": false, "image": "assets/images/item17.webp"},
  {"id": 18, "name": "Bow Detail Flare-Sleeve Top", "price": 3199, "oldPrice": 8299, "category": "tops", "genders": ["women"], "sizes": ["S", "M", "L", "XL"], "sale": true, "popular": false, "image": "assets/images/item18.webp"},
];


const productWrapper = document.getElementById("productWrapper");
const breadcrumbEl = document.getElementById("pdBreadcrumb");
const relatedEl = document.getElementById("pdRelated");
const stickyBar = document.getElementById("pdStickyBar");
const selectedProductId = Number(new URLSearchParams(window.location.search).get("id")) || 19;

const MAX_QTY = 10;
const SIZES = ["S", "M", "L", "XL"];

const ICONS = {
  truck: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
  returns: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0113.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.7L4 15.5M4 20v-4.5h4.5"/></svg>',
  finish: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/></svg>',
  minus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  bag: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12a1 1 0 01-1 1H7a1 1 0 01-1-1L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};

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

function addProductToCart(product) {
  if (typeof window.addToCart === "function") {
    window.addToCart(product);
    return;
  }

  document.addEventListener(
    "cart:ready",
    () => window.addToCart(product),
    { once: true }
  );
}

function renderBreadcrumb(product) {
  if (!breadcrumbEl) return;

  breadcrumbEl.innerHTML = `
    <ol>
      <li><a href="index.html">Home</a></li>
      <li><a href="shop.html">Shop</a></li>
      <li aria-current="page"><span>${escapeHTML(titleCase(product.name))}</span></li>
    </ol>
  `;
}

function renderRelated(products, product) {
  if (!relatedEl) return;

  // Same category first, then the rest; never the product being viewed.
  const others = products.filter(item => item.id !== product.id);
  const related = [
    ...others.filter(item => item.category === product.category),
    ...others.filter(item => item.category !== product.category)
  ].slice(0, 4);

  if (!related.length) {
    relatedEl.hidden = true;
    return;
  }

  relatedEl.hidden = false;
  relatedEl.innerHTML = `
    <div class="pd-related-head">
      <div>
        <span class="pd-eyebrow">Keep exploring</span>
        <h2 id="pdRelatedTitle">You May Also Like</h2>
      </div>
      <a class="pd-related-all" href="shop.html">View all <span aria-hidden="true">→</span></a>
    </div>

    <div class="pd-related-grid">
      ${related.map(item => `
        <a class="pd-related-card" href="product.html?id=${item.id}">
          <div class="pd-related-media">
            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(titleCase(item.name))}" loading="lazy">
          </div>
          <div class="pd-related-info">
            <h3>${escapeHTML(titleCase(item.name))}</h3>
            <p>
              <strong>${formatINR(item.price)}</strong>
              ${item.oldPrice ? `<s>${formatINR(item.oldPrice)}</s>` : ""}
            </p>
          </div>
        </a>
      `).join("")}
    </div>
  `;
}

let renderedSignature = "";

function renderProduct(products) {
  const product = products.find(item => item.id === selectedProductId) || products[0];

  if (!productWrapper || !product) {
    return;
  }

  // The page renders once from the built-in list and again when product.json
  // arrives. Skip the second render if nothing changed so a size the shopper
  // already picked is not reset.
  const signature = JSON.stringify([product, products.map(item => item.id)]);
  if (signature === renderedSignature) {
    return;
  }
  renderedSignature = signature;

  const name = titleCase(product.name);
  const safeName = escapeHTML(name);
  const category = titleCase(product.category);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;
  const saving = product.oldPrice ? product.oldPrice - product.price : 0;
  const statusLabel = product.sale ? "Limited Sale" : "New Arrival";

  document.title = `${product.name} | NOIR.`;
  renderBreadcrumb(product);

  productWrapper.innerHTML = `
    <div class="pd-gallery">
      <div class="pd-media">
        <span class="pd-badge">${statusLabel}</span>
        <img src="${escapeHTML(product.image)}" alt="${safeName}" fetchpriority="high">
      </div>
    </div>

    <div class="pd-info">
      <div class="pd-kicker">
        <span>${escapeHTML(category)}</span>
        <i aria-hidden="true"></i>
        <span>NOIR. Select</span>
      </div>

      <h1>${safeName}</h1>

      <div class="pd-rating" aria-label="Rated 4.8 out of 5">
        <span class="pd-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <strong>4.8</strong>
        <small>126 reviews</small>
      </div>

      <div class="pd-price">
        <span class="pd-price-now">${formatINR(product.price)}</span>
        ${product.oldPrice ? `<span class="pd-price-old">${formatINR(product.oldPrice)}</span>` : ""}
        ${discount > 0 ? `<span class="pd-price-off">${discount}% off</span>` : ""}
      </div>
      ${saving > 0 ? `<p class="pd-saving">You save ${formatINR(saving)}</p>` : ""}

      <p class="pd-description">
        A polished NOIR. essential made for clean daily styling, premium comfort,
        and a sharp minimal finish.
      </p>

      <div class="pd-block" id="pdSizeBlock">
        <div class="pd-block-head">
          <span class="pd-label" id="pdSizeLabel">Size</span>
          <span class="pd-size-picked" id="pdSizePicked" aria-live="polite">Select a size</span>
        </div>

        <div class="pd-sizes" id="sizeList" role="radiogroup" aria-labelledby="pdSizeLabel">
          ${(product.sizes && product.sizes.length ? product.sizes : SIZES).map(size => `
            <button type="button" class="pd-size" role="radio" aria-checked="false" data-size="${size}">${size}</button>
          `).join("")}
        </div>

        <p class="pd-error" id="pdSizeError" role="alert" hidden>Please select a size to continue.</p>
      </div>

      <div class="pd-actions" id="pdActions">
        <div class="pd-qty" role="group" aria-label="Quantity">
          <button type="button" id="pdQtyMinus" aria-label="Decrease quantity">${ICONS.minus}</button>
          <output id="pdQtyValue" aria-live="polite">1</output>
          <button type="button" id="pdQtyPlus" aria-label="Increase quantity">${ICONS.plus}</button>
        </div>

        <button class="pd-add" id="productAddCart" type="button">
          <span class="pd-add-icon">${ICONS.bag}</span>
          <span class="pd-add-text">Add To Cart</span>
        </button>
      </div>

      <ul class="pd-assurances">
        <li>
          <span class="pd-assure-icon">${ICONS.truck}</span>
          <div>
            <strong>Free Shipping</strong>
            <span>On prepaid orders above ₹1999</span>
          </div>
        </li>
        <li>
          <span class="pd-assure-icon">${ICONS.returns}</span>
          <div>
            <strong>Easy Returns</strong>
            <span>7-day exchange support</span>
          </div>
        </li>
        <li>
          <span class="pd-assure-icon">${ICONS.finish}</span>
          <div>
            <strong>Premium Finish</strong>
            <span>Soft hand feel with structured fit</span>
          </div>
        </li>
      </ul>
    </div>
  `;

  if (stickyBar) {
    stickyBar.innerHTML = `
      <div class="pd-sticky-info">
        <strong>${safeName}</strong>
        <span>${formatINR(product.price)}</span>
      </div>
      <button class="pd-add pd-add-compact" id="pdStickyAdd" type="button">
        <span class="pd-add-text">Add To Cart</span>
      </button>
    `;
  }

  renderRelated(products, product);
  bindPurchaseControls(product);
  markPhotoBackdrop(productWrapper.querySelector(".pd-media"), { matchRatio: true });
  document.querySelectorAll(".pd-related-media").forEach(media => markPhotoBackdrop(media));
}

// Studio cut-outs (white background) blend into the card. Photos that already
// have their own backdrop are shown as they are, so no tinted frame appears.
function markPhotoBackdrop(media, { matchRatio = false } = {}) {
  const img = media && media.querySelector("img");
  if (!img) return;

  const check = () => {
    try {
      const size = 12;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Darkest of the four corners: a white cut-out is bright in all of them.
      const brightness = [[0, 0], [w - size, 0], [0, h - size], [w - size, h - size]].map(([x, y]) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.drawImage(img, x, y, size, size, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return (r + g + b) / 3;
      });

      const isPhoto = Math.min(...brightness) < 235;
      media.classList.toggle("is-photo", isPhoto);

      if (matchRatio) {
        // Follow the photo's own shape (between 4:5 and 1:1) so nothing is cropped much.
        media.style.aspectRatio = isPhoto
          ? String(Math.min(1, Math.max(0.8, w / h)))
          : "";
      }
    } catch (error) {
      // Canvas can be blocked (e.g. opened from file://). Keep the default look.
    }
  };

  if (img.complete && img.naturalWidth) check();
  else img.addEventListener("load", check, { once: true });
}

function bindPurchaseControls(product) {
  const sizeButtons = Array.from(document.querySelectorAll(".pd-size"));
  const sizePicked = document.getElementById("pdSizePicked");
  const sizeError = document.getElementById("pdSizeError");
  const sizeBlock = document.getElementById("pdSizeBlock");
  const qtyValue = document.getElementById("pdQtyValue");
  const qtyMinus = document.getElementById("pdQtyMinus");
  const qtyPlus = document.getElementById("pdQtyPlus");
  const addButtons = [
    document.getElementById("productAddCart"),
    document.getElementById("pdStickyAdd")
  ].filter(Boolean);
  const actions = document.getElementById("pdActions");

  let selectedSize = null;
  let quantity = 1;
  let resetTimer = null;

  function updateQty() {
    qtyValue.textContent = quantity;
    qtyMinus.disabled = quantity <= 1;
    qtyPlus.disabled = quantity >= MAX_QTY;
  }

  function selectSize(size) {
    selectedSize = size;
    sizeButtons.forEach(button => {
      const active = button.dataset.size === size;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
    });
    sizePicked.textContent = `Size ${size} selected`;
    sizePicked.classList.add("is-set");
    sizeError.hidden = true;
    sizeBlock.classList.remove("has-error");
  }

  function showSizeError() {
    sizeError.hidden = false;
    sizeBlock.classList.remove("has-error");
    void sizeBlock.offsetWidth; // restart the shake animation
    sizeBlock.classList.add("has-error");
    sizeBlock.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function flashAdded() {
    addButtons.forEach(button => {
      button.classList.add("is-added");
      button.querySelector(".pd-add-text").textContent = "Added To Cart";
      const icon = button.querySelector(".pd-add-icon");
      if (icon) icon.innerHTML = ICONS.check;
    });

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      addButtons.forEach(button => {
        button.classList.remove("is-added");
        button.querySelector(".pd-add-text").textContent = "Add To Cart";
        const icon = button.querySelector(".pd-add-icon");
        if (icon) icon.innerHTML = ICONS.bag;
      });
    }, 1800);
  }

  function handleAdd() {
    if (!selectedSize) {
      showSizeError();
      return;
    }

    const productWithSize = {
      ...product,
      selectedSize
    };

    for (let i = 0; i < quantity; i += 1) {
      addProductToCart(productWithSize);
    }

    flashAdded();
  }

  sizeButtons.forEach(button => {
    button.addEventListener("click", () => selectSize(button.dataset.size));
  });

  qtyMinus.addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    updateQty();
  });

  qtyPlus.addEventListener("click", () => {
    quantity = Math.min(MAX_QTY, quantity + 1);
    updateQty();
  });

  addButtons.forEach(button => button.addEventListener("click", handleAdd));
  updateQty();

  // Mobile: show the sticky add-to-cart bar while the main button is off screen.
  if (stickyBar && actions && "IntersectionObserver" in window) {
    if (window.pdStickyObserver) window.pdStickyObserver.disconnect();

    // On phones the shared tab bar covers the bottom of the screen; count that space as "not visible".
    const tabbar = document.querySelector(".n-tabbar");
    const reservedBottom = tabbar && getComputedStyle(tabbar).display !== "none" ? tabbar.offsetHeight : 0;

    window.pdStickyObserver = new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting;
      stickyBar.classList.toggle("is-visible", show);
      stickyBar.setAttribute("aria-hidden", String(!show));
    }, { rootMargin: `0px 0px -${reservedBottom + 8}px 0px` });

    window.pdStickyObserver.observe(actions);
  }
}

renderProduct(fallbackProducts);

NoirApi.getProducts()
  .then(renderProduct)
  .catch(error => {
    console.log("Product error:", error);
  });
