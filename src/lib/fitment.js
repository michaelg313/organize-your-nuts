/**
 * fitment.js — everything the site knows about vehicles, derived from
 * fitment/vehicle-map.json and fitment/platforms.json. Nothing here is
 * hand-maintained: add a rule to vehicle-map.json and the dropdowns, the
 * URL slugs and the platform resolution all pick it up (ADR-001 §5 Phase 3).
 *
 * Used in two places with the same code:
 *   - at build time, in the .astro pages (server-rendered option lists)
 *   - in the browser, by src/scripts/kits-picker.js (the cascading picker)
 *
 * Validity of the data itself is the job of scripts/validate-fitment.mjs,
 * which runs before every build. This file assumes the data is valid.
 */

import vehicleMap from "../../fitment/vehicle-map.json";
import platformsDoc from "../../fitment/platforms.json";

/** @typedef {{make:string, model:string, year_start:number, year_end:number, engine:string, platform:string}} Rule */
/** @typedef {{year:string, make:string, model:string, engine:string}} Vehicle  — the four picker values, as they appear in the rules */

/** @type {Rule[]} */
export const rules = vehicleMap.rules;

/** @type {{handle:string, display_name:string}[]} */
export const platforms = platformsDoc.platforms;

/** Display name for a platform handle, or the handle itself if unknown. */
export function platformName(handle) {
  return platforms.find((p) => p.handle === handle)?.display_name ?? handle;
}

// ---------- URL slugs -------------------------------------------------------
// Query params carry slugs, not raw strings: ?make=chevrolet&model=silverado-1500&engine=5-3l-v8
// The slug is derived from the rule's exact text, and unslug() maps it back by
// slugging every known value — so the URL never has to be hand-decoded.

export function slug(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Find the exact known value whose slug matches, among a list of candidates. */
function unslug(value, candidates) {
  if (!value) return null;
  const s = slug(value);
  return candidates.find((c) => slug(c) === s) ?? null;
}

// ---------- the cascade ------------------------------------------------------
// The picker order follows the hi-fi: Make → Model → Year → Engine.
// Each step offers only what the rules cover for the choices made so far.

const uniqSorted = (arr) => [...new Set(arr)].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

export function makes() {
  return uniqSorted(rules.map((r) => r.make));
}

export function modelsFor(make) {
  return uniqSorted(rules.filter((r) => r.make === make).map((r) => r.model));
}

/** Years covered for a make/model — the union of every matching rule's range, newest first. */
export function yearsFor(make, model) {
  const years = new Set();
  for (const r of rules) {
    if (r.make !== make || r.model !== model) continue;
    for (let y = r.year_start; y <= r.year_end; y++) years.add(y);
  }
  return [...years].sort((a, b) => b - a).map(String);
}

export function enginesFor(make, model, year) {
  const y = Number(year);
  return uniqSorted(
    rules
      .filter((r) => r.make === make && r.model === model && r.year_start <= y && y <= r.year_end)
      .map((r) => r.engine),
  );
}

// ---------- resolution -------------------------------------------------------

/**
 * The single rule that matches a complete vehicle, or null if we don't cover it.
 * validate-fitment.mjs guarantees at most one platform can match.
 * @param {Partial<Vehicle>} v
 * @returns {Rule|null}
 */
export function resolve(v) {
  if (!v || !v.year || !v.make || !v.model || !v.engine) return null;
  const y = Number(v.year);
  return (
    rules.find(
      (r) => r.make === v.make && r.model === v.model && r.engine === v.engine && r.year_start <= y && y <= r.year_end,
    ) ?? null
  );
}

/**
 * Turn query-param slugs (any subset of year/make/model/engine) back into the
 * exact known strings, walking the cascade so an impossible combination
 * collapses to the longest valid prefix. Returns the canonical Vehicle with
 * nulls for anything missing or unknown.
 * @param {{year?:string|null, make?:string|null, model?:string|null, engine?:string|null}} q
 * @returns {{year:string|null, make:string|null, model:string|null, engine:string|null}}
 */
export function fromSlugs(q) {
  const make = unslug(q.make, makes());
  const model = make ? unslug(q.model, modelsFor(make)) : null;
  const year = model ? unslug(q.year, yearsFor(make, model)) : null;
  const engine = year ? unslug(q.engine, enginesFor(make, model, year)) : null;
  return { year, make, model, engine };
}

/** Query string for a vehicle: ?year=…&make=…&model=…&engine=… (slugged). */
export function toQuery(v) {
  const p = new URLSearchParams();
  if (v.year) p.set("year", slug(v.year));
  if (v.make) p.set("make", slug(v.make));
  if (v.model) p.set("model", slug(v.model));
  if (v.engine) p.set("engine", slug(v.engine));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** "1997 Toyota Tacoma · 2.7L I4" — the chip text. */
export function describeVehicle(v) {
  return `${v.year} ${v.make} ${v.model} · ${v.engine}`;
}
