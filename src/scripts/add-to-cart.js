/**
 * add-to-cart.js — the "Add to cart" buttons on /hardware-kits/<platform> and
 * (Phase 6) on the Hardware Storage category pages.
 *
 * 1. Stock: on page load, ask Shopify which products can be sold right now and
 *    set each button to "Add to cart" or "Out of stock". If Shopify can't be
 *    reached, the build-time state in the HTML stays as it is.
 * 2. Vehicle: a kit only goes in the cart with a vehicle (the operator's
 *    decision, Phase 5). It's the vehicle the page is showing as "your
 *    vehicle" — kits-picker.js puts it on the form as data-vehicle. Without
 *    one, the button scrolls to the picker and asks for it.
 * 3. The kit line carries Year / Make / Model / Engine / Platform as line-item
 *    attributes, so the Shopify order and packing slip say which vehicle the
 *    kit was bought for (ADR-001 §5 Phase 5).
 * 4. Storage (Phase 6): buttons marked `data-storage` skip the vehicle and go
 *    in with NO attributes (ADR-001 §5 Phase 5). Every other button needs a
 *    vehicle — so a kit button that somehow lost its marking still can't
 *    reach the cart without one.
 */
import { addLine, stockFor, vehicleAttributes } from "../lib/cart.js";
import { resolve } from "../lib/fitment.js";

const buttons = [...document.querySelectorAll("[data-add-to-cart]")];
const form = document.querySelector("[data-picker]");
const pagePlatform = form?.dataset.platform || null;
const status = document.querySelector("[data-cart-status]");

if (buttons.length) init();

function setStock(button, inStock) {
  button.dataset.inStock = inStock ? "yes" : "no";
  button.disabled = !inStock;
  if (inStock) button.removeAttribute("aria-disabled");
  else button.setAttribute("aria-disabled", "true");
  button.textContent = inStock ? "Add to cart" : "Out of stock";
}

/** The vehicle the page is showing — only if it really resolves to this page's platform. */
function currentVehicle() {
  if (!form || !pagePlatform) return null;
  try {
    const v = JSON.parse(form.dataset.vehicle ?? "null");
    return v && resolve(v)?.platform === pagePlatform ? v : null;
  } catch {
    return null;
  }
}

function askForVehicle(button) {
  if (!form) {
    // A vehicle-needing button on a page with no picker: a page-building mistake, not a shopper one.
    console.error(`[cart] "${button.dataset.title}" needs a vehicle, but this page has no vehicle picker. If it's a storage product, its button is missing data-storage.`);
    return;
  }
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

  // Storage: no vehicle, no attributes. Anything else is a kit and needs the vehicle.
  let attributes = [];
  if (!("storage" in button.dataset)) {
    const v = currentVehicle();
    if (!v) return askForVehicle(button);
    attributes = vehicleAttributes(v, pagePlatform);
  }

  button.disabled = true;
  button.textContent = "Adding…";
  try {
    const { notices } = await addLine({
      variantId: button.dataset.variant,
      quantity: 1,
      attributes,
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
