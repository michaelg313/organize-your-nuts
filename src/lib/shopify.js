/**
 * shopify.js — reads products and platforms from the Shopify Storefront API
 * ONCE per build, and refuses to build if the data can't make correct pages.
 *
 * Runs only at build time (inside .astro frontmatter). The PRIVATE token stays
 * in the build environment. The one thing this file hands to the browser is
 * storefrontPublicConfig() — the store address and the PUBLIC token, which
 * Shopify designed to be shipped in web pages (the cart uses them, Phase 5).
 *
 * What makes the build fail, and why (ADR-001 §2.4, ADR-002 §2.2):
 *   - no store domain / token in the environment       → can't fetch anything
 *   - Shopify refuses the request                       → wrong token, wrong permissions
 *   - a platform in fitment/platforms.json isn't in Shopify → its page would be empty
 *   - a platform has zero kits                          → a page with nothing to sell
 *   - a kit fits a platform but has no valid `system`   → it can't be grouped on the page
 *   - a product is neither a kit nor storage, or both   → it would be on no page, or the wrong one
 *     (Phase 6: a kit has `Fits platforms`; a storage product has `Storage type`)
 *
 * A storage category with no products is NOT a failure — its page says
 * "Coming soon" (operator's decision, Phase 6).
 *
 * Every message below is written for a person. If the build fails, the LAST
 * lines of the build log say what's wrong and where to fix it.
 */

import { platforms as repoPlatforms } from "./fitment.js";
import { SYSTEMS, formatPrice } from "./display.js";
import { STORAGE_TYPES } from "./storage.js";

// The system list and price format moved to display.js in Phase 5 so the cart
// (in the browser) can share them without importing this build-only file.
export { SYSTEMS, formatPrice };

// Bump this every ~6 months (ADR-001 §6). Shopify releases quarterly; a retired
// version "falls forward" to the oldest supported one, but don't rely on that.
export const STOREFRONT_API_VERSION = "2026-07";

// Metafield identifiers — exactly as recorded in docs/PHASE-2-SHOPIFY-CHECKLIST.md.
const MF_FITS_PLATFORMS = { namespace: "custom", key: "fits_platforms" };
const MF_SYSTEM = { namespace: "custom", key: "system" };
const MF_FITMENT_NOTE = { namespace: "custom", key: "fitment_note" };
const MF_STORAGE_TYPE = { namespace: "custom", key: "storage_type" };   // Phase 6 — checklist Part I
const METAOBJECT_TYPE = "platform";

/** @typedef {{ id:string, handle:string, title:string, description:string, image:{url:string,alt:string,width:number,height:number}|null, price:{amount:string,currency:string}, fitsPlatforms:string[], system:string|null, fitmentNote:string|null, storageType:string|null, variantId:string|null, availableForSale:boolean }} Product */
/** @typedef {Product} Kit  — a product with at least one platform in `Fits platforms` */
/** @typedef {Product} StorageProduct  — a product with a `Storage type` */
/** @typedef {{ handle:string, name:string, description:string|null, seoTitle:string|null, seoDescription:string|null }} PlatformRecord */

// ---------- failure helper ---------------------------------------------------

class BuildDataError extends Error {}

function fail(lines, heading = "Can't build the store pages") {
  const text = ["", `✗ ${heading}:`, "", ...lines.map((l) => `  ${l}`), ""].join("\n");
  throw new BuildDataError(text);
}

// ---------- the request ------------------------------------------------------

async function storefront(query, variables = {}) {
  const domain = import.meta.env.SHOPIFY_STORE_DOMAIN;
  const token = import.meta.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;

  if (!domain || !token) {
    fail([
      "The build needs two environment variables and at least one is missing:",
      `  SHOPIFY_STORE_DOMAIN             ${domain ? "✓ set" : "✗ missing"}`,
      `  SHOPIFY_STOREFRONT_PRIVATE_TOKEN ${token ? "✓ set" : "✗ missing"}`,
      "",
      "Locally: they go in a file called .env next to package.json (see .env.example).",
      "On Vercel: Project → Settings → Environment Variables.",
    ]);
  }

  let res;
  try {
    res = await fetch(`https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Shopify-Storefront-Private-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    fail([
      `Couldn't reach Shopify at ${domain}.`,
      `The network said: ${e.message}`,
      "Check the store domain in SHOPIFY_STORE_DOMAIN and that this machine is online.",
    ]);
  }

  if (res.status === 401 || res.status === 403) {
    fail([
      `Shopify refused the request (HTTP ${res.status}).`,
      "This almost always means the PRIVATE Storefront API token is wrong, was deleted, or",
      "isn't the private one. Check SHOPIFY_STOREFRONT_PRIVATE_TOKEN against",
      "Sales channels → Headless → your storefront → Storefront API tokens.",
    ]);
  }
  if (!res.ok) {
    fail([`Shopify answered HTTP ${res.status} ${res.statusText}. Try the build again; if it persists, check status.shopify.com.`]);
  }

  const json = await res.json();
  if (json.errors?.length) {
    const msgs = json.errors.map((e) => `  • ${e.message}`);
    fail([
      "Shopify accepted the request but rejected the query:",
      ...msgs,
      "",
      "If a message mentions 'access' or 'permission', the Headless storefront is missing a",
      "Storefront API permission — it needs 'Read products' and 'Read metaobjects'.",
      "(Sales channels → Headless → your storefront → Storefront API permissions → Edit.)",
    ]);
  }
  return json.data;
}

// ---------- queries ----------------------------------------------------------

const KITS_QUERY = /* GraphQL */ `
  query Kits($cursor: String, $fitsNs: String!, $fitsKey: String!, $sysNs: String!, $sysKey: String!, $noteNs: String!, $noteKey: String!, $storNs: String!, $storKey: String!) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title description
        featuredImage { url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 1) { nodes { id availableForSale } }
        fits: metafield(namespace: $fitsNs, key: $fitsKey) { references(first: 20) { nodes { ... on Metaobject { handle } } } }
        system: metafield(namespace: $sysNs, key: $sysKey) { value }
        fitmentNote: metafield(namespace: $noteNs, key: $noteKey) { value }
        storageType: metafield(namespace: $storNs, key: $storKey) { value }
      }
    }
  }
`;

const PLATFORMS_QUERY = /* GraphQL */ `
  query Platforms($type: String!) {
    metaobjects(type: $type, first: 50) {
      nodes { handle fields { key value } }
    }
  }
`;

// Launch prep: the footer's "Shipping · Returns · Privacy" links point at the
// policy pages Shopify hosts (Settings → Policies). Their addresses come from
// here, so nobody types them, and they follow the store's primary domain.
const POLICIES_QUERY = /* GraphQL */ `
  query Policies {
    shop {
      shippingPolicy { url }
      refundPolicy { url }
      privacyPolicy { url }
    }
  }
`;

/**
 * The three footer policy links. A policy that doesn't exist yet comes back
 * null and its word stays plain text. Never fails the build — a missing policy
 * is something to fix in the admin, not a reason to stop the site updating.
 * @returns {Promise<{shipping:string|null, returns:string|null, privacy:string|null}>}
 */
async function fetchPolicies(warnings) {
  try {
    const { shop } = await storefront(POLICIES_QUERY);
    const out = { shipping: shop.shippingPolicy?.url ?? null, returns: shop.refundPolicy?.url ?? null, privacy: shop.privacyPolicy?.url ?? null };
    const missing = [["Shipping", out.shipping], ["Refund", out.returns], ["Privacy", out.privacy]].filter(([, u]) => !u).map(([n]) => n);
    if (missing.length) {
      warnings.push(`No ${missing.join(" / ")} policy in Shopify yet, so the footer shows ${missing.length === 1 ? "that word" : "those words"} without a link. Write ${missing.length === 1 ? "it" : "them"} in Settings → Policies and redeploy.`);
    }
    return out;
  } catch (e) {
    if (!(e instanceof BuildDataError)) throw e;
    warnings.push("Couldn't read the store's policies from Shopify, so the footer's Shipping · Returns · Privacy are plain text this build. The reason:" + e.message);
    return { shipping: null, returns: null, privacy: null };
  }
}

async function fetchAllProducts() {
  const out = [];
  let cursor = null;
  for (;;) {
    const data = await storefront(KITS_QUERY, {
      cursor,
      fitsNs: MF_FITS_PLATFORMS.namespace, fitsKey: MF_FITS_PLATFORMS.key,
      sysNs: MF_SYSTEM.namespace, sysKey: MF_SYSTEM.key,
      noteNs: MF_FITMENT_NOTE.namespace, noteKey: MF_FITMENT_NOTE.key,
      storNs: MF_STORAGE_TYPE.namespace, storKey: MF_STORAGE_TYPE.key,
    });
    out.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }
  return out;
}

/** @returns {Product} */
function toProduct(p) {
  const note = p.fitmentNote?.value?.trim() || null;
  // Every product is sold as its one variant ("Default Title"); that variant is
  // what the cart adds. availableForSale is only the build-time snapshot — the
  // kit and storage pages re-ask Shopify in the browser, so restocking needs no
  // redeploy.
  const variant = p.variants?.nodes?.[0] ?? null;
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description ?? "",
    image: p.featuredImage
      ? { url: p.featuredImage.url, alt: p.featuredImage.altText ?? p.title, width: p.featuredImage.width, height: p.featuredImage.height }
      : null,
    price: { amount: p.priceRange.minVariantPrice.amount, currency: p.priceRange.minVariantPrice.currencyCode },
    fitsPlatforms: (p.fits?.references?.nodes ?? []).map((n) => n.handle).filter(Boolean),
    system: p.system?.value?.trim() || null,
    fitmentNote: note,
    storageType: p.storageType?.value?.trim() || null,
    variantId: variant?.id ?? null,
    availableForSale: Boolean(variant?.availableForSale),
  };
}

/** @returns {PlatformRecord} */
function toPlatformRecord(m) {
  const f = Object.fromEntries(m.fields.map((x) => [x.key, x.value]));
  return {
    handle: m.handle,
    name: f.name ?? m.handle,
    description: f.description?.trim() || null,
    seoTitle: f.seo_title?.trim() || null,
    seoDescription: f.seo_description?.trim() || null,
  };
}

// ---------- the one build-time load -----------------------------------------

/** @type {Promise<{kits:Kit[], storage:StorageProduct[], platformRecords:Map<string,PlatformRecord>, policies:{shipping:string|null, returns:string|null, privacy:string|null}, warnings:string[]}>|null} */
let loaded = null;

/**
 * Fetch everything once per build, cross-check it against the repo's platform
 * list, and either return clean data or fail the build with a readable reason.
 */
export function loadCatalog() {
  if (!loaded) loaded = doLoad();
  return loaded;
}

async function doLoad() {
  const warnings = [];
  const [products, platformData, policies] = await Promise.all([
    fetchAllProducts(),
    storefront(PLATFORMS_QUERY, { type: METAOBJECT_TYPE }),
    fetchPolicies(warnings),
  ]);

  const all = products.map(toProduct);
  const kits = all.filter((p) => p.fitsPlatforms.length > 0);   // a kit fits at least one platform
  const storage = all.filter((p) => p.storageType);              // storage has a Storage type (and no platforms)
  const platformRecords = new Map(platformData.metaobjects.nodes.map(toPlatformRecord).map((r) => [r.handle, r]));

  const problems = [];
  const knownSystems = new Set(SYSTEMS.map((s) => s.value));
  const knownStorage = new Set(STORAGE_TYPES.map((t) => t.value));
  const repoHandles = new Set(repoPlatforms.map((p) => p.handle));

  // 0. Every product belongs on exactly one kind of page (Phase 6).
  for (const p of all) {
    if (p.fitsPlatforms.length > 0 && p.storageType) {
      problems.push(
        `Product "${p.title}" has both Fits platforms and Storage type, so the site can't tell whether it's a kit or storage. ` +
        `Open it in the admin and clear the one that's wrong (kits: Fits platforms + System; storage: Storage type only).`,
      );
    } else if (p.fitsPlatforms.length === 0 && !p.storageType) {
      problems.push(
        `Product "${p.title}" has neither Fits platforms nor Storage type, so it would appear on no page. ` +
        `Open it in the admin and set one: a kit gets Fits platforms + System; storage gets Storage type (bins, organizers or cases).`,
      );
    }
  }
  // 0b. Every storage product must be placeable and buyable.
  for (const s of storage) {
    if (!knownStorage.has(s.storageType)) {
      problems.push(
        `Product "${s.title}" has Storage type '${s.storageType}', which isn't one of the site's categories (${[...knownStorage].join(", ")}). ` +
        `Shopify's pick-list and src/lib/storage.js must list the same three values — fix whichever one changed.`,
      );
    }
    if (!s.variantId) {
      problems.push(`Product "${s.title}" came back with no variant, so the cart has nothing to add. Open it in the admin and check it has a price and is published to the Headless channel.`);
    }
  }

  // 1. Every platform the repo wants a page for must exist in Shopify.
  for (const p of repoPlatforms) {
    if (!platformRecords.has(p.handle)) {
      problems.push(
        `Platform '${p.handle}' is in fitment/platforms.json but there is no Platform entry with that handle in Shopify ` +
        `(Content → Metaobjects → Platform). Either the handle differs by a character, or the entry is missing or not Active.`,
      );
    }
  }
  // 2. A platform in Shopify the repo doesn't know about isn't fatal — but no page will be built for it.
  for (const handle of platformRecords.keys()) {
    if (!repoHandles.has(handle)) {
      warnings.push(`Shopify has a Platform '${handle}' that fitment/platforms.json doesn't list — no page is built for it. Add it to the repo (and rules for it) when it's ready.`);
    }
  }
  // 3. Every kit must be groupable.
  for (const k of kits) {
    if (!k.system) {
      problems.push(`Product "${k.title}" fits a platform but has no System set. Open it in the admin and pick one of: ${[...knownSystems].join(", ")}.`);
    } else if (!knownSystems.has(k.system)) {
      problems.push(`Product "${k.title}" has System '${k.system}', which isn't one of the five groupings (${[...knownSystems].join(", ")}). Fix it in the admin.`);
    }
    if (!k.variantId) {
      problems.push(`Product "${k.title}" came back with no variant, so the cart has nothing to add. Open it in the admin and check it has a price and is published to the Headless channel.`);
    }
    for (const h of k.fitsPlatforms) {
      if (!repoHandles.has(h)) {
        warnings.push(`Product "${k.title}" is tagged with platform '${h}', which fitment/platforms.json doesn't list — it won't appear on any page for that platform.`);
      }
    }
  }
  // 4. No platform page may be empty (ADR-001 §2.4: "a platform has zero SKUs").
  for (const p of repoPlatforms) {
    const count = kits.filter((k) => k.fitsPlatforms.includes(p.handle)).length;
    if (count === 0 && platformRecords.has(p.handle)) {
      problems.push(
        `Platform '${p.handle}' (${p.display_name}) has no kits. Its page would have nothing to sell. ` +
        `Either tag at least one product with it (Fits platforms) or remove the platform from fitment/platforms.json and its rules.`,
      );
    }
  }
  if (kits.length === 0) {
    problems.push(
      "Shopify returned no products with a 'Fits platforms' value at all. Usual causes: the products aren't published to the Headless " +
      "sales channel, or the storefront is missing the 'Read metaobjects' permission (then the platform links come back empty).",
    );
  }

  for (const w of warnings) console.warn(`⚠ ${w}`);
  if (problems.length) fail([`${problems.length} problem${problems.length === 1 ? "" : "s"} with the Shopify data:`, "", ...problems.map((p) => `• ${p}`), "", "Fix the items above in the Shopify admin (or the repo, where it says so) and run the build again."]);

  console.log(`✓ Shopify: ${kits.length} kits across ${platformRecords.size} platforms, ${storage.length} storage product${storage.length === 1 ? "" : "s"} (Storefront API ${STOREFRONT_API_VERSION}).`);
  return { kits, storage, platformRecords, policies, warnings };
}

/** Storage products in one category, in the order Shopify lists them. */
export function storageIn(storage, type) {
  return storage.filter((s) => s.storageType === type);
}

/** The lowest price among some products, as "$46.99", or null if there are none. */
export function fromPrice(products) {
  if (!products.length) return null;
  const lowest = products.reduce((a, b) => (Number(b.price.amount) < Number(a.price.amount) ? b : a));
  return formatPrice(lowest.price);
}

/** Kits for one platform, grouped into the five systems in page order; empty systems omitted. */
export function groupForPlatform(kits, handle) {
  const mine = kits.filter((k) => k.fitsPlatforms.includes(handle));
  const groups = SYSTEMS.map((s) => ({ ...s, kits: mine.filter((k) => k.system === s.value) }));
  return {
    total: mine.length,
    shown: groups.filter((g) => g.kits.length > 0),
    omitted: groups.filter((g) => g.kits.length === 0),
  };
}

// ---------- what the browser gets (the cart, Phase 5) -------------------------

/**
 * The cart runs in the shopper's browser (ADR-002 §1), so the browser needs the
 * Storefront API address and a token. That token is the PUBLIC one: Shopify
 * designed it to sit in web pages — it can only do shopper things (read
 * products, build a cart) and is rate-limited per shopper. Site.astro writes
 * these two values into every page's <head>.
 *
 * The build refuses to continue if the public token is missing (the cart and
 * the nav count would be dead on every page) or if it is the same value as the
 * private token (that would publish the private token to the world).
 *
 * @returns {{ endpoint:string, token:string }}
 */
export function storefrontPublicConfig() {
  const domain = import.meta.env.SHOPIFY_STORE_DOMAIN;
  const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  const heading = "Can't build the cart";

  if (!domain || !token) {
    fail([
      "The cart needs these environment variables and at least one is missing:",
      `  SHOPIFY_STORE_DOMAIN             ${domain ? "✓ set" : "✗ missing"}`,
      `  PUBLIC_SHOPIFY_STOREFRONT_TOKEN  ${token ? "✓ set" : "✗ missing"}`,
      "",
      "PUBLIC_SHOPIFY_STOREFRONT_TOKEN is the PUBLIC Storefront API token (not the private one) from",
      "Sales channels → Headless → your storefront → Storefront API tokens.",
      "Locally: add it to .env next to package.json (see .env.example).",
      "On Vercel: Project → Settings → Environment Variables.",
    ], heading);
  }
  if (token === import.meta.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN) {
    fail([
      "PUBLIC_SHOPIFY_STOREFRONT_TOKEN holds the same value as SHOPIFY_STOREFRONT_PRIVATE_TOKEN.",
      "Anything in a PUBLIC_ variable is written into the web page for anyone to read, so this",
      "would publish your private token. Put the PUBLIC token from Sales channels → Headless →",
      "your storefront → Storefront API tokens into PUBLIC_SHOPIFY_STOREFRONT_TOKEN instead.",
    ], heading);
  }
  return { endpoint: `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`, token };
}
