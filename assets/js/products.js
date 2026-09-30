// NOIR home page: the current sweatshirt collection is the featured Best Sellers set.
// We keep the older product IDs for order-history compatibility, but never let stale
// catalogue rows push the current sweatshirt collection off the front page.
(function () {
  const grid = document.getElementById("bestSellers");
  if (!grid) return;

  const BEST_SELLER_COUNT = 4;
  const FEATURED_SWEATSHIRT_IDS = [19, 20, 21, 22, 23, 25];

  function pickBestSellers(products) {
    const featured = products
      .filter(product => FEATURED_SWEATSHIRT_IDS.includes(Number(product.id)))
      .sort((a, b) => Number(a.id) - Number(b.id));

    // Prefer the current sweatshirt set. If some historical IDs are inactive in
    // Supabase, fill the remaining slots from active popular products so the
    // home grid never collapses to only one or two cards.
    const popular = products.filter(product => product.popular && !featured.some(item => item.id === product.id));
    const rest = products.filter(product => !product.popular && !featured.some(item => item.id === product.id));
    return [...featured, ...popular, ...rest].slice(0, BEST_SELLER_COUNT);
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
        const featured = pickBestSellers(products);
        if (!featured.length) throw new Error("No featured products available");
        NoirStore.renderGrid(grid, featured);
        showCollectionCounts(products);
      })
      .catch(error => {
        console.log("Products error:", error);
        showError();
      });
  }

  load();
})();
