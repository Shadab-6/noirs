// NOIR shop: the full collection with Men / Women and category chips, search and sort.
// The state lives in the address bar (?gender=women&category=hoodie&q=black&sort=low) so a filtered view can be linked to.
(function () {
  const grid = document.getElementById("shopProducts");
  if (!grid) return;

  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortFilter");
  const chips = Array.from(document.querySelectorAll(".n-chip"));
  const countEl = document.getElementById("shopCount");
  const emptyEl = document.getElementById("shopEmpty");
  const emptyTitle = document.getElementById("shopEmptyTitle");
  const emptyText = document.getElementById("shopEmptyText");
  const emptyAction = document.getElementById("shopEmptyAction");

  const categoryChips = chips.filter(chip => chip.dataset.category);
  const genderChips = chips.filter(chip => chip.dataset.gender);
  const CATEGORIES = categoryChips.map(chip => chip.dataset.category);
  const GENDERS = genderChips.map(chip => chip.dataset.gender);
  const GENDER_LABELS = { men: "Men", women: "Women" };
  const SORTS = ["default", "low", "high"];
  const state = { category: "all", gender: "all", query: "", sort: "default" };
  let products = [];
  let loadFailed = false;

  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    const gender = params.get("gender");
    const sort = params.get("sort");

    state.category = CATEGORIES.includes(category) ? category : "all";
    state.gender = GENDERS.includes(gender) ? gender : "all";
    state.sort = SORTS.includes(sort) ? sort : "default";
    state.query = (params.get("q") || "").trim();

    searchInput.value = state.query;
    sortSelect.value = state.sort;

    if (params.get("search") === "1") searchInput.focus();
  }

  function writeUrl() {
    const params = new URLSearchParams();
    if (state.gender !== "all") params.set("gender", state.gender);
    if (state.category !== "all") params.set("category", state.category);
    if (state.query) params.set("q", state.query);
    if (state.sort !== "default") params.set("sort", state.sort);

    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  function visibleProducts() {
    const query = state.query.toLowerCase();
    let list = products.filter(product =>
      (state.gender === "all" || (product.genders || ["men"]).includes(state.gender)) &&
      (state.category === "all" || product.category === state.category) &&
      (!query || product.name.toLowerCase().includes(query))
    );

    if (state.sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (state.sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }

  function showEmpty(title, text, actionLabel, action) {
    emptyTitle.textContent = title;
    emptyText.textContent = text;
    emptyAction.textContent = actionLabel;
    emptyAction.onclick = action;
    emptyEl.hidden = false;
  }

  function clearFilters() {
    state.category = "all";
    state.gender = "all";
    state.query = "";
    state.sort = "default";
    searchInput.value = "";
    sortSelect.value = "default";
    update();
  }

  function retry() {
    NoirApi.resetCache();
    load();
  }

  function update() {
    const nothingSelected = state.category === "all" && state.gender === "all";
    // A category with no pieces in the chosen section (for example Shoes under Men) is hidden.
    const inSection = product => state.gender === "all" || (product.genders || ["men"]).includes(state.gender);
    categoryChips.forEach(chip => {
      const category = chip.dataset.category;
      chip.hidden = category !== "all" && category !== state.category && !products.some(product => inSection(product) && product.category === category);
    });

    chips.forEach(chip => {
      const pressed = chip.dataset.gender
        ? chip.dataset.gender === state.gender
        : chip.dataset.category === "all"
          ? nothingSelected
          : chip.dataset.category === state.category;
      chip.setAttribute("aria-pressed", String(pressed));
    });
    writeUrl();

    if (loadFailed) return;

    const list = visibleProducts();
    emptyEl.hidden = true;

    if (list.length === 0) {
      grid.innerHTML = "";
      countEl.textContent = "No pieces found";
      const term = state.query ? ` for "${state.query}"` : "";
      showEmpty("Nothing matches", `We couldn't find any pieces${term} in this collection. Try another search or clear the filters.`, "Clear filters", clearFilters);
      return;
    }

    NoirStore.renderGrid(grid, list);
    const scope = state.gender !== "all" ? ` · ${GENDER_LABELS[state.gender]}` : "";
    countEl.textContent = `${list.length} ${list.length === 1 ? "piece" : "pieces"}${scope}`;
  }

  function load() {
    loadFailed = false;
    emptyEl.hidden = true;
    countEl.textContent = "Loading the collection";
    // Do not render the old blank skeleton cards on the shop page.
    // They looked like broken product tiles on slower phones. Keep the grid
    // empty while the real catalogue request is in flight instead.
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = `<div class="n-shop-loading" role="status">Loading collection…</div>`;

    NoirApi.getProducts()
      .then(data => {
        products = data;
        grid.removeAttribute("aria-busy");
        update();
      })
      .catch(error => {
        console.log("Shop products error:", error);
        loadFailed = true;
        grid.innerHTML = "";
        grid.removeAttribute("aria-busy");
        countEl.textContent = "";
        showEmpty("We couldn't load the collection", "Check your connection and try again.", "Try again", retry);
      });
  }

  chips.forEach(chip => chip.addEventListener("click", () => {
    if (chip.dataset.gender) {
      // Men / Women: click again to go back to everyone.
      state.gender = state.gender === chip.dataset.gender ? "all" : chip.dataset.gender;
    } else if (chip.dataset.category === "all") {
      state.category = "all";
      state.gender = "all";
    } else {
      state.category = chip.dataset.category;
    }
    update();
  }));

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim();
    update();
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    update();
  });

  readUrl();
  load();
})();
