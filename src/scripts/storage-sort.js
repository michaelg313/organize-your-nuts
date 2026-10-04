/**
 * storage-sort.js — the "Sort by" control on a Hardware Storage category page
 * (Phase 6). It only re-orders the cards already on the page; nothing is
 * fetched. The control is only rendered when there are 2+ products.
 * "Featured" puts them back in the order Shopify lists them.
 */
const select = document.querySelector("[data-sort]");
const grid = document.querySelector("[data-sort-grid]");

if (select && grid) {
  const compare = {
    featured: (a, b) => Number(a.dataset.order) - Number(b.dataset.order),
    "price-asc": (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
    "price-desc": (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
    name: (a, b) => a.dataset.title.localeCompare(b.dataset.title, "en", { numeric: true }),
  };

  select.addEventListener("change", () => {
    const by = compare[select.value] ?? compare.featured;
    const cards = [...grid.querySelectorAll("[data-sort-card]")].sort(by);
    grid.append(...cards);   // appending existing nodes moves them, buttons and all
  });
}
