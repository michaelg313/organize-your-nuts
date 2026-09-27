/**
 * display.js — names and number formats used both at build time (the .astro
 * pages, via shopify.js) and in the browser (the cart). Nothing here fetches
 * anything or reads the environment, so it is safe to ship to the browser.
 */

/**
 * The five result groupings (ADR-001 §5 Phase 2), in page order. `value` is the
 * exact `custom.system` choice; `blurb` is the sub-line from the hi-fi headings.
 * These are groupings on the page — never URLs.
 */
export const SYSTEMS = [
  { value: "engine",              id: "engines", title: "Engines",               blurb: "head, main, rod, manifold and accessory fasteners" },
  { value: "transmission",        id: "trans",   title: "Transmissions",         blurb: "bellhousing, pan and crossmember hardware" },
  { value: "steering-suspension", id: "steer",   title: "Steering & Suspension", blurb: "control arm, knuckle and shock hardware" },
  { value: "diff-axle",           id: "diff",    title: "Diff / Axle",           blurb: "cover, ring gear and axle flange hardware" },
  { value: "body-trim",           id: "body",    title: "Body & Interior Trim",  blurb: "fender, bed, door and panel fasteners" },
];

/** "Engines" for "engine"; null for anything that isn't one of the five. */
export function systemTitle(value) {
  return SYSTEMS.find((s) => s.value === value)?.title ?? null;
}

/**
 * "$109.99". Accepts the build's {amount, currency} and the Storefront API's
 * {amount, currencyCode}.
 */
export function formatPrice(price) {
  const currency = price.currency ?? price.currencyCode;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(price.amount));
}
