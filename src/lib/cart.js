/**
 * cart.js — the cart, in the shopper's browser (ADR-001 §5 Phase 5, ADR-002 §1).
 *
 * A hand-wired Storefront API client — no SDK. It makes exactly these calls:
 *   cartCreate        the first "Add to cart"
 *   cartLinesAdd      every later "Add to cart"
 *   cartLinesUpdate   the quantity select on /cart
 *   cartLinesRemove   the ✕ on /cart
 *   cart(id:)         read the cart (lines, prices, count, checkoutUrl)
 *   nodes(ids:)       is each kit on the page in stock right now?
 *
 * Shopify keeps the cart; the browser only remembers its ID (localStorage
 * "oyn.cart") plus the last item count ("oyn.cartCount") so the nav badge can
 * paint before the network answers. When Shopify no longer knows the cart
 * (it expired, or the shopper finished checkout) we forget the ID and the next
 * "Add to cart" starts a new one — no error shown.
 *
 * The store address and PUBLIC token come from two <meta> tags that Site.astro
 * writes at build time (see storefrontPublicConfig() in shopify.js).
 *
 * Failures: the shopper sees a short, plain sentence. The technical reason goes
 * to the browser console, always prefixed "[cart]" — that's where to look.
 */
import { formatPrice, systemTitle } from "./display.js";

const CART_KEY = "oyn.cart";
const COUNT_KEY = "oyn.cartCount";

/** Line-item attribute keys on kit lines, in order. They appear on the Shopify order and packing slip. */
export const VEHICLE_KEYS = ["Year", "Make", "Model", "Engine"];
export const PLATFORM_KEY = "Platform";

const SORRY = "Something went wrong with the cart. Please try again in a moment.";

export class CartError extends Error {
  /** @param {string} shopperMessage shown on the page  @param {string} [detail] logged to the console */
  constructor(shopperMessage, detail) {
    super(detail ?? shopperMessage);
    this.shopperMessage = shopperMessage;
  }
}

// ---------- the request -------------------------------------------------------

function config() {
  const endpoint = document.querySelector('meta[name="oyn-storefront-endpoint"]')?.content;
  const token = document.querySelector('meta[name="oyn-storefront-token"]')?.content;
  return { endpoint, token };
}

/** Log the real reason, then throw the shopper's version. "warn" = expected (out of stock), not a fault. */
function fail(shopperMessage, detail, level = "error") {
  console[level](`[cart] ${detail}`);
  throw new CartError(shopperMessage, detail);
}

async function storefront(query, variables = {}) {
  const { endpoint, token } = config();
  if (!endpoint || !token) {
    fail(SORRY, "This page has no Storefront settings in its <head> (meta oyn-storefront-endpoint / oyn-storefront-token). The page wasn't built by Site.astro, or the build was missing PUBLIC_SHOPIFY_STOREFRONT_TOKEN.");
  }

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    fail("We couldn't reach the store just now. Check your connection and try again.", `Couldn't reach Shopify (${e.message}). The shopper may be offline, or ${endpoint} is wrong.`);
  }

  if (res.status === 401 || res.status === 403) {
    fail(SORRY, `Shopify refused the PUBLIC token (HTTP ${res.status}). Check PUBLIC_SHOPIFY_STOREFRONT_TOKEN in Vercel against Sales channels → Headless → your storefront → Storefront API tokens, then redeploy.`);
  }
  if (res.status === 429) {
    fail("The store is busy right now. Please try again in a few seconds.", "Shopify is rate-limiting this shopper (HTTP 429). Usually passes on its own.");
  }
  if (!res.ok) {
    fail(SORRY, `Shopify answered HTTP ${res.status} ${res.statusText}. If it persists, check status.shopify.com.`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    const msgs = json.errors.map((e) => e.message).join(" | ");
    const access = /access|permission|scope/i.test(msgs);
    fail(SORRY, access
      ? `Shopify says the PUBLIC token isn't allowed to do this: ${msgs}. Fix: Sales channels → Headless → your storefront → Storefront API permissions — it needs checkouts (read and modify) and Read products.`
      : `Shopify rejected the request: ${msgs}`);
  }
  return json.data;
}

// ---------- queries -----------------------------------------------------------

const CART_FIELDS = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
    lines(first: 100) {
      nodes {
        id
        quantity
        attributes { key value }
        cost { totalAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id
            availableForSale
            image { url altText width height }
            product { title handle system: metafield(namespace: "custom", key: "system") { value } }
          }
        }
      }
    }
  }
`;

const RESULT = `cart { ...CartFields } userErrors { code field message } warnings { code message target }`;

const Q_CART = `query Cart($id: ID!) { cart(id: $id) { ...CartFields } } ${CART_FIELDS}`;
const Q_COUNT = `query CartCount($id: ID!) { cart(id: $id) { id totalQuantity } }`;
const Q_STOCK = `query Availability($ids: [ID!]!) { nodes(ids: $ids) { ... on ProductVariant { id availableForSale } } }`;
const M_CREATE = `mutation CartCreate($input: CartInput!) { cartCreate(input: $input) { ${RESULT} } } ${CART_FIELDS}`;
const M_ADD = `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { ${RESULT} } } ${CART_FIELDS}`;
const M_UPDATE = `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { ${RESULT} } } ${CART_FIELDS}`;
const M_REMOVE = `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { ${RESULT} } } ${CART_FIELDS}`;

// ---------- the shape the pages use ---------------------------------------------

/**
 * @typedef {{ year:string, make:string, model:string, engine:string }} Vehicle
 * @typedef {{ id:string, quantity:number, title:string, handle:string, variantId:string,
 *             availableForSale:boolean, image:{url:string,alt:string,width:number,height:number}|null,
 *             system:string|null, systemTitle:string|null, vehicle:Vehicle|null, platform:string|null,
 *             total:string }} Line
 * @typedef {{ id:string, checkoutUrl:string, totalQuantity:number, subtotal:string, total:string, lines:Line[] }} Cart
 */

/** @returns {Cart} */
function toCart(c) {
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity,
    subtotal: formatPrice(c.cost.subtotalAmount),
    total: formatPrice(c.cost.totalAmount),
    lines: c.lines.nodes.map((l) => {
      const attrs = Object.fromEntries(l.attributes.map((a) => [a.key, a.value]));
      const m = l.merchandise;
      const system = m.product.system?.value?.trim() || null;
      const hasVehicle = VEHICLE_KEYS.every((k) => attrs[k]);
      return {
        id: l.id,
        quantity: l.quantity,
        title: m.product.title,
        handle: m.product.handle,
        variantId: m.id,
        availableForSale: m.availableForSale,
        image: m.image ? { url: m.image.url, alt: m.image.altText ?? m.product.title, width: m.image.width, height: m.image.height } : null,
        system,
        systemTitle: systemTitle(system),
        vehicle: hasVehicle ? { year: attrs.Year, make: attrs.Make, model: attrs.Model, engine: attrs.Engine } : null,
        platform: attrs[PLATFORM_KEY] ?? null,
        total: formatPrice(l.cost.totalAmount),
      };
    }),
  };
}

/** The attributes written onto a kit line — and from there onto the Shopify order. */
export function vehicleAttributes(v, platform) {
  return [
    { key: "Year", value: v.year },
    { key: "Make", value: v.make },
    { key: "Model", value: v.model },
    { key: "Engine", value: v.engine },
    { key: PLATFORM_KEY, value: platform },
  ];
}

// ---------- remembering the cart -------------------------------------------------

export function storedCartId() {
  try { return localStorage.getItem(CART_KEY); } catch { return null; }
}

/** Last known item count, for painting the nav badge instantly. */
export function cachedCount() {
  try { return Number(localStorage.getItem(COUNT_KEY)) || 0; } catch { return 0; }
}

/** Remember (or forget) the cart and tell the nav badge. */
function remember(id, count) {
  try {
    if (id) {
      localStorage.setItem(CART_KEY, id);
      localStorage.setItem(COUNT_KEY, String(count));
    } else {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(COUNT_KEY);
    }
  } catch {}
  document.dispatchEvent(new CustomEvent("oyn:cart-count", { detail: id ? count : 0 }));
}

// ---------- mutation results -----------------------------------------------------

/** Plain words for the warnings Shopify attaches when it changes what was asked for. */
function warningText(w) {
  switch (w.code) {
    case "MERCHANDISE_OUT_OF_STOCK": return "Sorry — that item is out of stock right now.";
    case "MERCHANDISE_NOT_ENOUGH_STOCK": return "We don't have that many in stock. Your cart shows the most we can sell right now.";
    default: return null;
  }
}

/**
 * Turn a mutation payload into a Cart, or throw with a shopper-readable reason.
 * `notices` are plain-words versions of Shopify's warnings; `warnings` are the raw
 * ones — each warning's `target` is the cart line it's about.
 * @returns {{ cart: Cart, notices: string[], warnings: {code:string, target:string}[] }}
 */
function settle(payload, what) {
  if (payload.userErrors?.length) {
    const msgs = payload.userErrors.map((e) => `${e.code ?? ""} ${e.message}`.trim()).join(" | ");
    const stock = /stock|not available|unavailable/i.test(msgs);
    fail(stock ? "Sorry — that item is out of stock right now." : SORRY, `Shopify refused to ${what}: ${msgs}`, stock ? "warn" : "error");
  }
  if (!payload.cart) fail(SORRY, `Shopify returned no cart after trying to ${what}.`);
  const notices = [];
  for (const w of payload.warnings ?? []) {
    console.warn(`[cart] Shopify warning while trying to ${what}: ${w.code} — ${w.message}`);
    const text = warningText(w);
    if (text && !notices.includes(text)) notices.push(text);
  }
  const cart = toCart(payload.cart);
  remember(cart.id, cart.totalQuantity);
  return { cart, notices, warnings: (payload.warnings ?? []).map((w) => ({ code: w.code, target: w.target })) };
}

// ---------- the operations the pages call ------------------------------------------

/** The current cart, or null if there isn't one (never created, expired, or checked out). */
export async function getCart() {
  const id = storedCartId();
  if (!id) return null;
  const data = await storefront(Q_CART, { id });
  if (!data.cart) {
    remember(null);
    return null;
  }
  const cart = toCart(data.cart);
  remember(cart.id, cart.totalQuantity);
  return cart;
}

/** Re-check the item count with Shopify (for the nav badge on every page). */
export async function refreshCount() {
  const id = storedCartId();
  if (!id) return remember(null);
  const data = await storefront(Q_COUNT, { id });
  if (data.cart) remember(data.cart.id, data.cart.totalQuantity);
  else remember(null);
}

/**
 * Add one line. Creates the cart if there isn't one (or Shopify forgot ours).
 * Throws CartError if Shopify wouldn't add it — e.g. it's out of stock.
 * @returns {Promise<{ cart: Cart, notices: string[] }>}
 */
export async function addLine({ variantId, quantity = 1, attributes = [] }) {
  const line = { merchandiseId: variantId, quantity, attributes };
  let payload = null;

  const id = storedCartId();
  if (id) {
    payload = (await storefront(M_ADD, { cartId: id, lines: [line] })).cartLinesAdd;
    if (!payload.cart) {
      // Either our saved cart is gone (expired, or already checked out) or Shopify
      // refused the item. Only the first means "start a fresh cart" — never throw
      // away a cart that still exists.
      const stillThere = (await storefront(Q_COUNT, { id })).cart;
      if (stillThere) settle(payload, "add to the cart");   // throws with Shopify's reason
      console.info("[cart] Saved cart no longer exists at Shopify; starting a new one.");
      remember(null);
      payload = null;
    }
  }
  if (!payload) payload = (await storefront(M_CREATE, { input: { lines: [line] } })).cartCreate;

  const result = settle(payload, "add to the cart");

  // Out of stock: Shopify (API 2026-07) still accepts the add, but keeps the item
  // as a line with quantity 0 and a MERCHANDISE_OUT_OF_STOCK warning aimed at that
  // line. That is "not added" — take the empty line back out and say so.
  const mine = result.cart.lines.filter((l) => l.variantId === variantId);
  const mineIds = new Set(mine.map((l) => l.id));
  const aboutMine = result.warnings.filter((w) => mineIds.has(w.target));
  if (aboutMine.some((w) => w.code === "MERCHANDISE_OUT_OF_STOCK") || !mine.some((l) => l.quantity > 0)) {
    const empty = mine.filter((l) => l.quantity === 0).map((l) => l.id);
    if (empty.length) {
      await storefront(M_REMOVE, { cartId: result.cart.id, lineIds: empty })
        .then((d) => settle(d.cartLinesRemove, "tidy an out-of-stock line"))
        .catch(() => { /* logged; the cart page shows the line as out of stock */ });
    }
    fail("Sorry — that item is out of stock right now.", `Shopify won't sell ${variantId} right now (out of stock), so nothing was added.`, "warn");
  }
  // Only the warnings about this item belong under its button.
  return { ...result, notices: [...new Set(aboutMine.map(warningText).filter(Boolean))] };
}

/** Change a line's quantity. Keeps its attributes (the vehicle) untouched. */
export async function updateLine(lineId, quantity) {
  const id = storedCartId();
  if (!id) fail(SORRY, "No saved cart to update.");
  return settle((await storefront(M_UPDATE, { cartId: id, lines: [{ id: lineId, quantity }] })).cartLinesUpdate, "change the quantity");
}

/** Remove a line. */
export async function removeLine(lineId) {
  const id = storedCartId();
  if (!id) fail(SORRY, "No saved cart to remove from.");
  return settle((await storefront(M_REMOVE, { cartId: id, lineIds: [lineId] })).cartLinesRemove, "remove the item");
}

/**
 * Which of these variants can be bought right now?
 * @param {string[]} variantIds
 * @returns {Promise<Map<string, boolean>>}
 */
export async function stockFor(variantIds) {
  const data = await storefront(Q_STOCK, { ids: variantIds });
  return new Map(data.nodes.filter(Boolean).map((n) => [n.id, n.availableForSale]));
}
