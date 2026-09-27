/**
 * cart-page.js — fills in /cart from the shopper's Shopify cart.
 *
 * States (all in src/pages/cart.astro): loading → empty | full, plus an error
 * box if Shopify can't be reached. Lines follow hi-fi template ⑤:
 *   - kit lines show their system, platform and "✓ Fits your <model>", taken
 *     from the line's own attributes — the same values that go on the order
 *   - storage lines have no attributes and no fits badge
 * The Fitment row at the top lists each distinct vehicle in the cart.
 */
import { getCart, updateLine, removeLine } from "../lib/cart.js";
import { describeVehicle, platformName, toQuery } from "../lib/fitment.js";

const $ = (sel) => document.querySelector(sel);
const el = {
  heading: $("[data-cart-heading]"),
  fitment: $("[data-cart-fitment]"),
  vehicles: $("[data-cart-vehicles]"),
  error: $("[data-cart-error]"),
  errorText: $("[data-cart-error-text]"),
  notice: $("[data-cart-notice]"),
  noticeText: $("[data-cart-notice-text]"),
  loading: $("[data-cart-loading]"),
  full: $("[data-cart-full]"),
  empty: $("[data-cart-empty]"),
  lines: $("[data-cart-lines]"),
  keepShopping: $("[data-keep-shopping]"),
  subtotal: $("[data-subtotal]"),
  total: $("[data-total]"),
  checkout: $("[data-checkout]"),
  status: $("[data-cart-status]"),
};

const MAX_QTY = 10;

// ---------- messages ---------------------------------------------------------

function showError(message) {
  el.errorText.textContent = message;
  el.error.hidden = false;
}
function showNotices(notices) {
  el.notice.hidden = !notices.length;
  el.noticeText.textContent = notices.join(" ");
}
function clearMessages() {
  el.error.hidden = true;
  el.notice.hidden = true;
}

// ---------- rendering ----------------------------------------------------------

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

function render(cart) {
  el.loading.hidden = true;

  if (!cart || cart.lines.length === 0) {
    el.full.hidden = true;
    el.empty.hidden = false;
    el.fitment.hidden = true;
    el.heading.classList.remove("has-fitment");
    el.heading.textContent = "Your cart";
    return;
  }

  const n = cart.totalQuantity;
  el.heading.textContent = `Your cart · ${n} ${n === 1 ? "item" : "items"}`;

  // Fitment row: every distinct vehicle on a kit line.
  const vehicles = [...new Map(cart.lines.filter((l) => l.vehicle).map((l) => [describeVehicle(l.vehicle), l])).values()];
  el.vehicles.replaceChildren(
    ...vehicles.map((l) => h("span", { class: "veh-chip" }, h("span", { class: "tick", "aria-hidden": "true" }, "✓"), ` ${describeVehicle(l.vehicle)}`)),
  );
  el.fitment.hidden = vehicles.length === 0;
  el.heading.classList.toggle("has-fitment", vehicles.length > 0);

  // "Keep shopping kits" goes back to the vehicle's own page when there's one vehicle.
  el.keepShopping.href = vehicles.length === 1 && vehicles[0].platform
    ? `/hardware-kits/${vehicles[0].platform}${toQuery(vehicles[0].vehicle)}`
    : "/hardware-kits";

  el.lines.replaceChildren(...cart.lines.map(lineCard));
  el.subtotal.textContent = cart.subtotal;
  el.total.textContent = cart.total;

  // Nothing buyable (every line is out of stock): no checkout hand-off —
  // Shopify would only show its "Out of stock … will be removed" page at $0.00.
  if (cart.lines.some((l) => l.quantity > 0 && l.availableForSale)) {
    el.checkout.href = cart.checkoutUrl;
    el.checkout.removeAttribute("aria-disabled");
  } else {
    el.checkout.removeAttribute("href");
    el.checkout.setAttribute("aria-disabled", "true");
  }

  el.empty.hidden = true;
  el.full.hidden = false;
}

function lineCard(line) {
  const isKit = Boolean(line.vehicle);
  const photo = line.image
    ? h("img", { class: "line-photo", src: line.image.url, alt: line.image.alt, width: line.image.width, height: line.image.height, loading: "lazy", decoding: "async" })
    : h("div", { class: "ph ph-line ph-sm", role: "img", "aria-label": `Placeholder: ${isKit ? "Kit" : "Item"}`, "data-label": `${isKit ? "Kit" : "Item"} · 1:1` });

  const meta = isKit
    ? [line.systemTitle ?? "Kit", line.platform ? platformName(line.platform) : null].filter(Boolean).join(" · ")
    : "Storage";

  // Shopify keeps an out-of-stock item as a line with quantity 0: no quantity to
  // choose, just the ✕ — and it isn't included at checkout.
  const soldOut = line.quantity === 0 || !line.availableForSale;
  const qtyOptions = [];
  for (let q = 1; q <= Math.max(MAX_QTY, line.quantity); q++) {
    qtyOptions.push(h("option", { value: q, selected: q === line.quantity }, String(q)));
  }
  const qty = h("select", { class: "ctl", "aria-label": `Quantity, ${line.title}` }, qtyOptions);
  const remove = h("button", { class: "rm", type: "button", "aria-label": `Remove ${line.title} from cart` }, "✕");

  const card = h("article", { class: "card line" },
    photo,
    h("div", {},
      h("h3", { class: "l-name" }, line.title),
      h("div", { class: "l-meta" }, meta),
      isKit ? h("span", { class: "fits" }, h("span", { "aria-hidden": "true" }, "✓"), ` Fits your ${line.vehicle.model}`) : null,
      soldOut ? h("p", { class: "err" }, "Out of stock right now — it won’t be included at checkout.") : null,
    ),
    soldOut
      ? h("span", { class: "l-meta" }, "—")
      : h("label", { class: "field" }, h("span", { class: "lab", style: "margin-bottom:4px;" }, "Qty"), qty),
    h("div", { class: "l-price" }, line.total),
    remove,
  );

  qty.addEventListener("change", () => change(card, () => updateLine(line.id, Number(qty.value)), `${line.title}: quantity ${qty.value}.`));
  remove.addEventListener("click", () => change(card, () => removeLine(line.id), `${line.title} removed from your cart.`));
  return card;
}

// ---------- changes -------------------------------------------------------------

async function change(card, run, announcement) {
  clearMessages();
  card.setAttribute("aria-busy", "true");
  try {
    const { cart, notices } = await run();
    render(cart);
    showNotices(notices);
    if (el.status) el.status.textContent = announcement;
  } catch (e) {
    card.removeAttribute("aria-busy");
    showError(e.shopperMessage ?? "Something went wrong with the cart. Please try again in a moment.");
    // Put the page back in step with what Shopify actually has.
    getCart().then(render).catch(() => {});
  }
}

// ---------- first load -------------------------------------------------------------

getCart()
  .then(render)
  .catch(() => {
    el.loading.hidden = true;
    showError("We couldn't load your cart just now. Check your connection and refresh the page to try again.");
  });
