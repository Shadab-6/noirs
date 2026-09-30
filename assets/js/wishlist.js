// NOIR wishlist: the products saved with the heart button (ids are kept in localStorage, see noir-store.js).
(function () {
  const grid = document.getElementById("wishGrid");
  if (!grid) return;

  const countEl = document.getElementById("wishCount");
  const emptyEl = document.getElementById("wishEmpty");
  const emptyTitle = document.getElementById("wishEmptyTitle");
  const emptyText = document.getElementById("wishEmptyText");
  const emptyAction = document.getElementById("wishEmptyAction");

  let products = null;

  function showEmpty(title, text, actionLabel, href) {
    emptyTitle.textContent = title;
    emptyText.textContent = text;
    emptyAction.textContent = actionLabel;
    emptyAction.setAttribute("href", href);
    emptyEl.hidden = false;
  }

  function render() {
    if (!products) return;

    // A removed card takes keyboard focus with it, so hand focus to the next sensible control.
    const hadFocus = grid.contains(document.activeElement);
    const saved = NoirStore.getWishlist();
    const list = saved.map(id => products.find(product => Number(product.id) === id)).filter(Boolean);

    emptyEl.hidden = true;
    grid.removeAttribute("aria-busy");

    if (list.length === 0) {
      grid.innerHTML = "";
      countEl.textContent = "";
      showEmpty("Nothing saved yet", "Tap the heart on any piece and it will wait for you here.", "Browse the shop", "shop.html");
      if (hadFocus) emptyAction.focus();
      return;
    }

    countEl.textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"} saved`;
    NoirStore.renderGrid(grid, list);
    if (hadFocus) grid.querySelector(".n-heart").focus();
  }

  function load() {
    NoirStore.renderSkeletons(grid, 4);

    NoirApi.getProducts()
      .then(data => {
        products = data;
        render();
      })
      .catch(error => {
        console.log("Wishlist products error:", error);
        grid.innerHTML = "";
        grid.removeAttribute("aria-busy");
        showEmpty("We couldn't load your wishlist", "Check your connection and reload the page.", "Shop instead", "shop.html");
      });
  }

  // Un-saving a piece here removes its card straight away (the toast offers Undo).
  document.addEventListener("wishlist:changed", render);

  load();
})();
