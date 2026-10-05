/**
 * /sitemap.xml — the list of pages search engines should index (launch prep;
 * ADR-001 §7.8: needed before judging whether the SEO thesis works).
 *
 * Hand-written instead of @astrojs/sitemap (operator's decision: no new
 * dependency). It lists exactly the pages that are meant to rank, built from
 * the same data as the pages themselves, so it can't drift:
 *   - Home, Hardware Kits, every platform page (fitment/platforms.json)
 *   - Hardware Storage, and each storage category that HAS products
 *   - About
 * Left out on purpose: /cart and empty "Coming soon" storage categories —
 * both carry noindex, and a sitemap must not ask Google to index them.
 *
 * Submit https://organizeyournuts.com/sitemap.xml in Google Search Console once
 * the domain is connected. public/robots.txt points crawlers here too.
 */
import { loadCatalog, storageIn } from "../lib/shopify.js";
import { platforms } from "../lib/fitment.js";
import { STORAGE_TYPES } from "../lib/storage.js";

export async function GET({ site }) {
  const { storage } = await loadCatalog();
  const paths = [
    "/",
    "/hardware-kits",
    ...platforms.map((p) => `/hardware-kits/${p.handle}`),
    "/hardware-storage",
    ...STORAGE_TYPES.filter((t) => storageIn(storage, t.value).length > 0).map((t) => `/hardware-storage/${t.value}`),
    "/about",
  ];
  // Same spelling as each page's canonical: no trailing slash (the origin keeps its "/").
  const urls = paths.map((p) => new URL(p, site).href);
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
