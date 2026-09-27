/**
 * cart-count.js — the item count on the nav's Cart button, on every page.
 *
 * Paints the last known count straight away (from localStorage), then asks
 * Shopify for the real one. Any cart change on the page (add, quantity,
 * remove) updates it through the "oyn:cart-count" event from src/lib/cart.js.
 * The /cart page loads the whole cart itself, so it skips the extra request.
 */
import { cachedCount, refreshCount, storedCartId } from "../lib/cart.js";

const link = document.querySelector("[data-cart-link]");
const badge = document.querySelector("[data-cart-count]");

function paint(n) {
  if (!link || !badge) return;
  badge.textContent = String(n);
  badge.hidden = !n;
  link.setAttribute("aria-label", n ? `Cart, ${n} ${n === 1 ? "item" : "items"}` : "Cart");
}

paint(cachedCount());
document.addEventListener("oyn:cart-count", (e) => paint(e.detail));

if (storedCartId() && !document.querySelector("[data-cart-page]")) {
  refreshCount().catch(() => { /* already logged as [cart]; keep the cached count */ });
}
