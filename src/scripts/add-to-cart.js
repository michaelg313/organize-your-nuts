/**
 * add-to-cart.js — the "Add to cart" buttons on /hardware-kits/<platform>.
 *
 * 1. Stock: on page load, ask Shopify which kits can be sold right now and set
 *    each button to "Add to cart" or "Out of stock". If Shopify can't be
 *    reached, the build-time state in the HTML stays as it is.
 * 2. Vehicle: a kit only goes in the cart with a vehicle (the operator's
 *    decision, Phase 5). It's the vehicle the page is showing as "your
 *    vehicle" — kits-picker.js puts it on the form as data-vehicle. Without
 *    one, the button scrolls to the picker and asks for it.
 * 3. The line carries Year / Make / Model / Engine / Platform as line-item
 *    attributes, so the Shopify order and packing slip say which vehicle the
 *    kit was bought for (ADR-001 §5 Phase 5).
 */
import { addLine, stockFor, vehicleAttributes } from "../lib/cart.js";
import { resolve } from "../lib/fitment.js";

const buttons = [...document.querySelectorAll("[data-add-to-cart]")];
const form = document.querySelector("[data-picker]");
const pagePlatform = form?.dataset.platform || null;
const status = document.querySelector("[data-cart-status]");

if (buttons.length && pagePlatform) init();

function setStock(button, inStock) {
  button.dataset.inStock = inStock ? "yes" : "no";
  button.disabled = !inStock;
  if (inStock) button.removeAttribute("aria-disabled");
  else button.setAttribute("aria-disabled", "true");
  button.textContent = inStock ? "Add to cart" : "Out of stock";
}

/** The vehicle the page is showing — only if it really resolves to this page's platform. */
function currentVehicle() {
  try {
    const v = JSON.parse(form.dataset.vehicle ?? "null");
    return v && resolve(v)?.platform === pagePlatform ? v : null;
  } catch {
    return null;
  }
}

function askForVehicle() {
  const notice = form.querySelector("[data-need-vehicle]");
  if (notice) notice.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  const firstEmpty = [...form.querySelectorAll("select")].find((s) => !s.disabled && !s.value);
  firstEmpty?.focus({ preventScroll: true });
}

function init() {
  // Build-time state first; the live answer replaces it.
  for (const b of buttons) b.dataset.inStock = b.disabled ? "no" : "yes";

  const ids = buttons.map((b) => b.dataset.variant).filter(Boolean);
  stockFor(ids)
    .then((stock) => {
      for (const b of buttons) if (stock.has(b.dataset.variant)) setStock(b, stock.get(b.dataset.variant));
    })
    .catch(() => { /* already logged as [cart]; keep the build-time state */ });

  for (const b of buttons) b.addEventListener("click", () => add(b));
}

async function add(button) {
  const card = button.closest(".prod");
  const error = card?.querySelector("[data-add-error]");
  if (error) error.hidden = true;

  const v = currentVehicle();
  if (!v) return askForVehicle();

  button.disabled = true;
  button.textContent = "Adding…";
  try {
    const { notices } = await addLine({
      variantId: button.dataset.variant,
      quantity: 1,
      attributes: vehicleAttributes(v, pagePlatform),
    });
    if (notices.length && error) {
      // Added, but not quite as asked — e.g. "We don't have that many in stock."
      error.textContent = notices.join(" ");
      error.hidden = false;
    }
    button.textContent = "Added ✓";
    if (status) status.textContent = `${button.dataset.title} added to your cart.`;
    setTimeout(() => setStock(button, true), 1800);
  } catch (e) {
    const outOfStock = /out of stock/i.test(e.shopperMessage ?? "");
    setStock(button, !outOfStock);
    if (error) {
      error.textContent = e.shopperMessage ?? "Something went wrong with the cart. Please try again in a moment.";
      error.hidden = false;
    }
  }
}
