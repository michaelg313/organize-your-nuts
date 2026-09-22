/**
 * shopify.js — reads products and platforms from the Shopify Storefront API
 * ONCE per build, and refuses to build if the data can't make correct pages.
 *
 * Runs only at build time (inside .astro frontmatter). Nothing here reaches
 * the browser — the token stays in the build environment.
 *
 * What makes the build fail, and why (ADR-001 §2.4, ADR-002 §2.2):
 *   - no store domain / token in the environment       → can't fetch anything
 *   - Shopify refuses the request                       → wrong token, wrong permissions
 *   - a platform in fitment/platforms.json isn't in Shopify → its page would be empty
 *   - a platform has zero kits                          → a page with nothing to sell
 *   - a kit fits a platform but has no valid `system`   → it can't be grouped on the page
 *
 * Every message below is written for a person. If the build fails, the LAST
 * lines of the build log say what's wrong and where to fix it.
 */

import { platforms as repoPlatforms } from "./fitment.js";

// Bump this every ~6 months (ADR-001 §6). Shopify releases quarterly; a retired
// version "falls forward" to the oldest supported one, but don't rely on that.
export const STOREFRONT_API_VERSION = "2026-07";

// Metafield identifiers — exactly as recorded in docs/PHASE-2-SHOPIFY-CHECKLIST.md.
const MF_FITS_PLATFORMS = { namespace: "custom", key: "fits_platforms" };
const MF_SYSTEM = { namespace: "custom", key: "system" };
const MF_FITMENT_NOTE = { namespace: "custom", key: "fitment_note" };
const METAOBJECT_TYPE = "platform";

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

/** @typedef {{ id:string, handle:string, title:string, description:string, image:{url:string,alt:string,width:number,height:number}|null, price:{amount:string,currency:string}, fitsPlatforms:string[], system:string|null, fitmentNote:string|null }} Kit */
/** @typedef {{ handle:string, name:string, description:string|null, seoTitle:string|null, seoDescription:string|null }} PlatformRecord */

// ---------- failure helper ---------------------------------------------------

class BuildDataError extends Error {}

function fail(lines) {
  const text = ["", "✗ Can't build the Hardware Kits pages:", "", ...lines.map((l) => `  ${l}`), ""].join("\n");
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
  query Kits($cursor: String, $fitsNs: String!, $fitsKey: String!, $sysNs: String!, $sysKey: String!, $noteNs: String!, $noteKey: String!) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title description
        featuredImage { url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
        fits: metafield(namespace: $fitsNs, key: $fitsKey) { references(first: 20) { nodes { ... on Metaobject { handle } } } }
        system: metafield(namespace: $sysNs, key: $sysKey) { value }
        fitmentNote: metafield(namespace: $noteNs, key: $noteKey) { value }
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

async function fetchAllProducts() {
  const out = [];
  let cursor = null;
  for (;;) {
    const data = await storefront(KITS_QUERY, {
      cursor,
      fitsNs: MF_FITS_PLATFORMS.namespace, fitsKey: MF_FITS_PLATFORMS.key,
      sysNs: MF_SYSTEM.namespace, sysKey: MF_SYSTEM.key,
      noteNs: MF_FITMENT_NOTE.namespace, noteKey: MF_FITMENT_NOTE.key,
    });
    out.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }
  return out;
}

/** @returns {Kit} */
function toKit(p) {
  const note = p.fitmentNote?.value?.trim() || null;
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

/** @type {Promise<{kits:Kit[], platformRecords:Map<string,PlatformRecord>, warnings:string[]}>|null} */
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
  const [products, platformData] = await Promise.all([
    fetchAllProducts(),
    storefront(PLATFORMS_QUERY, { type: METAOBJECT_TYPE }),
  ]);

  const kits = products.map(toKit).filter((k) => k.fitsPlatforms.length > 0); // storage products carry no platforms
  const platformRecords = new Map(platformData.metaobjects.nodes.map(toPlatformRecord).map((r) => [r.handle, r]));

  const problems = [];
  const warnings = [];
  const knownSystems = new Set(SYSTEMS.map((s) => s.value));
  const repoHandles = new Set(repoPlatforms.map((p) => p.handle));

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

  console.log(`✓ Shopify: ${kits.length} kits across ${platformRecords.size} platforms (Storefront API ${STOREFRONT_API_VERSION}).`);
  return { kits, platformRecords, warnings };
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

/** "$109.99" */
export function formatPrice(price) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(Number(price.amount));
}
