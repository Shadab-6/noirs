let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Coupons are checked against the database (NoirApi.validateCoupon); price maths lives in noir-shared.js.
const COUPON_STORAGE_KEY = "noirCoupon";

// A validated coupon is stored as { code, type, value, minSubtotal }.
function loadStoredCoupon() {
  try {
    const stored = JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) || "null");
    const valid = stored
      && typeof stored.code === "string"
      && (stored.type === "percent" || stored.type === "fixed")
      && Number(stored.value) > 0;

    return valid ? { ...stored, minSubtotal: Number(stored.minSubtotal) || 0 } : null;
  } catch (error) {
    return null;
  }
}

// Kept across pages so a coupon applied in the cart is still applied at checkout.
let activeCouponDef = loadStoredCoupon();
let activeCoupon = activeCouponDef ? activeCouponDef.code : null;

function setActiveCoupon(coupon) {
  activeCouponDef = coupon || null;
  activeCoupon = activeCouponDef ? activeCouponDef.code : null;

  try {
    if (activeCouponDef) localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(activeCouponDef));
    else localStorage.removeItem(COUPON_STORAGE_KEY);
  } catch (error) {
    // Storage can be unavailable (private mode); the coupon then lasts for this page only.
  }
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  document.dispatchEvent(new Event("cart:changed"));
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function getSubtotal() {
  return cart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0);
}

function getDiscountAmount(subtotal) {
  return NoirShared.getDiscount(subtotal, activeCouponDef);
}

function getShippingAmount(subtotal, shippingMethod = "standard") {
  return NoirShared.getShipping(subtotal, shippingMethod);
}

function getSummaryValues(shippingMethod = "standard") {
  return NoirShared.calculate({
    subtotal: getSubtotal(),
    coupon: activeCouponDef,
    shippingMethod
  });
}

function updateCouponFeedback(message, type = "") {
  const couponMessage = document.getElementById("couponMessage");
  if (!couponMessage) return;

  couponMessage.textContent = message;
  couponMessage.className = `coupon-message ${type}`.trim();
}

async function applyCoupon(code) {
  const normalized = NoirShared.normalizeCoupon(code);
  const input = document.getElementById("couponInput");

  if (!normalized) {
    setActiveCoupon(null);
    updateCouponFeedback("Coupon removed.", "info");
    renderCartSidebar();
    return;
  }

  updateCouponFeedback("Checking coupon…", "info");
  const result = await NoirApi.validateCoupon(normalized, getSubtotal());

  if (!result.valid) {
    if (!result.unreachable) setActiveCoupon(null);
    updateCouponFeedback(result.message, "error");
    if (input) input.value = normalized;
    renderCartSidebar();
    return;
  }

  setActiveCoupon(result.coupon);
  updateCouponFeedback(`${result.coupon.code} applied successfully.`, "success");
  renderCartSidebar();
}

function resetCouponMessage() {
  updateCouponFeedback("");
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll("#cartCount").forEach(element => {
    element.innerText = count;
  });

  const countLabel = document.getElementById("cartItemCount");
  if (countLabel) {
    countLabel.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  }
}

const ICON_TRASH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M6 6l1 14a1 1 0 001 1h8a1 1 0 001-1l1-14M10 11v6M14 11v6"/></svg>';
const ICON_BAG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12a1 1 0 01-1 1H7a1 1 0 01-1-1L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>';

function openCart() {
  const cartSidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("cartOverlay");
  if (!cartSidebar || !overlay) return false;

  cartSidebar.classList.add("active");
  cartSidebar.setAttribute("aria-hidden", "false");
  overlay.classList.add("active");
  document.body.classList.add("cart-open");
  document.getElementById("closeCart")?.focus({ preventScroll: true });
  return true;
}

function closeCart() {
  const cartSidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("cartOverlay");

  cartSidebar?.classList.remove("active");
  cartSidebar?.setAttribute("aria-hidden", "true");
  overlay?.classList.remove("active");
  document.body.classList.remove("cart-open");
}

function renderCartSidebar() {
  const cartItems = document.getElementById("cartItems");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartTotal = document.getElementById("cartTotal");
  const cartShipping = document.getElementById("cartShipping");
  const cartDiscount = document.getElementById("cartDiscount");
  const checkoutButton = document.getElementById("checkoutBtn");
  const couponInput = document.getElementById("couponInput");
  const discountRow = document.getElementById("discountRow");

  if (!cartItems || !cartSubtotal || !cartTotal) {
    return;
  }

  const { subtotal, shipping, discount, total } = getSummaryValues();

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart-state">
        <div class="empty-cart-icon">${ICON_BAG}</div>
        <h3>Your Cart is Empty</h3>
        <p>Discover something you'll love.</p>
        <button type="button" class="empty-cart-button" id="continueShoppingBtn">Continue Shopping →</button>
      </div>
    `;
    cartSubtotal.textContent = "₹0";
    cartShipping.textContent = "Free";
    cartDiscount.textContent = "₹0";
    cartTotal.textContent = "₹0";
    if (discountRow) discountRow.hidden = true;
    if (checkoutButton) checkoutButton.disabled = true;
    if (couponInput) couponInput.disabled = true;
    const continueShoppingBtn = document.getElementById("continueShoppingBtn");
    continueShoppingBtn?.addEventListener("click", closeCart);
    return;
  }

  if (couponInput) {
    couponInput.disabled = false;

    // A coupon applied earlier (or on the checkout page) stays visible here.
    const couponMessage = document.getElementById("couponMessage");
    if (activeCoupon && document.activeElement !== couponInput) {
      couponInput.value = activeCoupon;
      if (couponMessage && !couponMessage.textContent) {
        updateCouponFeedback(`${activeCoupon} applied successfully.`, "success");
      }
    } else if (!activeCoupon && couponMessage && couponMessage.classList.contains("success")) {
      couponInput.value = "";
      updateCouponFeedback("");
    }
  }
  if (checkoutButton) checkoutButton.disabled = false;

  cartItems.innerHTML = cart.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    const name = item.name || "Product";
    const sizeChip = item.selectedSize ? `<span>Size ${item.selectedSize}</span>` : "";
    const colorChip = item.color ? `<span>${item.color}</span>` : "";
    const metaChips = sizeChip || colorChip
      ? `<div class="cart-item-meta">${sizeChip}${colorChip}</div>`
      : "";

    return `
      <article class="cart-item">
        <img src="${item.image}" alt="${name}" loading="lazy">
        <div class="cart-item-content">
          <div class="cart-item-row">
            <div class="cart-item-text">
              <h4>${name}</h4>
              ${metaChips}
              <div class="cart-item-price">${formatPrice(item.price)} each</div>
            </div>
            <button class="remove-item-btn" type="button" onclick="removeItem(${index})" aria-label="Remove ${name} from cart">${ICON_TRASH}</button>
          </div>

          <div class="cart-item-actions">
            <div class="qty-box" aria-label="Quantity controls">
              <button type="button" onclick="changeQty(${index}, -1)" aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" onclick="changeQty(${index}, 1)" aria-label="Increase quantity">+</button>
            </div>
            <div class="cart-item-total">${formatPrice(itemTotal)}</div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  cartSubtotal.textContent = formatPrice(subtotal);
  cartShipping.textContent = shipping > 0 ? formatPrice(shipping) : "Free";
  cartDiscount.textContent = discount > 0 ? `−${formatPrice(discount)}` : formatPrice(0);
  cartTotal.textContent = formatPrice(total);
  if (discountRow) discountRow.hidden = discount <= 0;
}

function initializeCart() {
  const cartButton = document.getElementById("cartBtn");
  if (cartButton) {
    cartButton.addEventListener("click", () => {
      openCart();
    });
  }

  const closeCartButton = document.getElementById("closeCart");
  const cartOverlay = document.getElementById("cartOverlay");

  closeCartButton?.addEventListener("click", closeCart);
  cartOverlay?.addEventListener("click", closeCart);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });

  const couponInput = document.getElementById("couponInput");
  const couponApplyButton = document.getElementById("couponApplyBtn");

  couponApplyButton?.addEventListener("click", () => {
    applyCoupon(couponInput?.value || "");
  });

  couponInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyCoupon(couponInput.value);
    }
  });

  window.addToCart = function(product) {
    const existing = cart.find(item => item.id === product.id && item.selectedSize === product.selectedSize);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    saveCart();
    updateCartCount();
    renderCartSidebar();
  };

  window.removeItem = function(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartCount();
    renderCartSidebar();
  };

  window.changeQty = function(index, change) {
    if (!cart[index]) return;
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
    updateCartCount();
    renderCartSidebar();
  };

  updateCartCount();
  renderCartSidebar();
  document.dispatchEvent(new Event("cart:ready"));
}

// Every "Checkout" button (cart drawer and cart page) shares this handler.
async function goToCheckout() {
  if (cart.length === 0) return;

  // Already on the checkout page: just close the drawer.
  if (/checkout\.html$/.test(window.location.pathname)) {
    closeCart();
    return;
  }

  // Orders need an account: visitors who are not signed in get "Create an account to continue".
  if (typeof NoirGate !== "undefined") {
    const signedIn = await NoirGate.ensureSignedIn("checkout.html");
    if (!signedIn) return;
  }

  window.location.href = "checkout.html";
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".checkout-btn");
  if (!button || button.disabled) return;
  goToCheckout();
});

// After an order is placed: empty the cart and forget the coupon.
function clearCartAfterOrder() {
  cart = [];
  setActiveCoupon(null);
  saveCart();
  updateCartCount();
  renderCartSidebar();
}
