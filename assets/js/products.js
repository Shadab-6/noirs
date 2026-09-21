// NOIR home page: "Best Sellers" (the first four products flagged `popular`) and the collection counts.
// Cards, wishlist hearts and size quick-add come from noir-store.js.
(function () {
  const grid = document.getElementById("bestSellers");
  if (!grid) return;

  const BEST_SELLER_COUNT = 4;

  function pickBestSellers(products) {
    const popular = products.filter(product => product.popular);
    const rest = products.filter(product => !product.popular);
    return [...popular, ...rest].slice(0, BEST_SELLER_COUNT);
  }

  function showCollectionCounts(products) {
    document.querySelectorAll("[data-count]").forEach(element => {
      const total = products.filter(product => product.category === element.dataset.count).length;
      element.textContent = total ? `${total} ${total === 1 ? "piece" : "pieces"}` : "";
    });
  }

  function showError() {
    grid.removeAttribute("aria-busy");
    grid.innerHTML = `
      <div class="n-empty">
        <h3>We couldn't load the best sellers</h3>
        <p>Check your connection and try again.</p>
        <button class="n-btn n-btn--solid" type="button" id="retryBestSellers">Try again</button>
      </div>
    `;
    document.getElementById("retryBestSellers").addEventListener("click", () => {
      NoirApi.resetCache();
      load();
    });
  }

  function load() {
    NoirStore.renderSkeletons(grid, BEST_SELLER_COUNT);

    NoirApi.getProducts()
      .then(products => {
        NoirStore.renderGrid(grid, pickBestSellers(products));
        showCollectionCounts(products);
      })
      .catch(error => {
        console.log("Products error:", error);
        showError();
      });
  }

  load();
})();
