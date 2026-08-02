#!/usr/bin/env node
/**
 * validate-fitment.mjs — checks fitment/vehicle-map.json against
 * fitment/platforms.json and fails loudly if anything is wrong.
 *
 * Run it with:  npm run validate-fitment
 *
 * What it checks (per ADR-001 §2.4 / §5 Phase 3):
 *   1. Every rule has every required field, and none are blank.
 *   2. Year ranges are real years and not inverted (start ≤ end).
 *   3. Every rule's platform is a known handle in platforms.json —
 *      with a plain-language hint when it's a near miss (stray space,
 *      wrong capitalisation, small typo).
 *   4. No two rules claim the same make/model/engine for overlapping
 *      years but point at DIFFERENT platforms.
 *
 * Error messages are written for a person, not a stack trace. The script
 * exits with code 1 if anything fails, which is what makes the CI check red.
 *
 * TODO (Phase 2/3): read the platform handle list from the live Shopify
 * platform metaobjects instead of fitment/platforms.json. Deliberately not
 * built yet — no Shopify API code in Phase 1.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_FILE = "fitment/vehicle-map.json";
const PLATFORMS_FILE = "fitment/platforms.json";

const problems = [];
const warnings = [];

// ---------- helpers ----------------------------------------------------

function loadJson(relPath) {
  let text;
  try {
    text = readFileSync(join(root, relPath), "utf8");
  } catch {
    console.error(`✗ Can't find ${relPath}. It should be in the project, next to this script's folder.`);
    process.exit(1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`✗ ${relPath} isn't valid JSON, so nothing else could be checked.`);
    console.error(`  The JSON reader said: "${e.message}"`);
    console.error(`  Usual causes: a missing or extra comma, a missing quote, or a stray bracket.`);
    process.exit(1);
  }
}

/** small edit-distance for "did you mean" hints */
function editDistance(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return m[a.length][b.length];
}

/** one-line human description of a rule, so problems are findable */
function describe(rule, n) {
  const bits = [rule.make, rule.model].filter((v) => typeof v === "string" && v.trim());
  const yrs =
    rule.year_start != null || rule.year_end != null
      ? ` ${rule.year_start ?? "?"}–${rule.year_end ?? "?"}`
      : "";
  const eng = typeof rule.engine === "string" && rule.engine.trim() ? `, ${rule.engine.trim()}` : "";
  const what = bits.length ? `${bits.join(" ")}${yrs}${eng}` : "unidentifiable rule";
  return `rule ${n} (${what})`;
}

function explainUnknownPlatform(value, handles) {
  if (value !== value.trim()) {
    const which = value !== value.trimStart() && value !== value.trimEnd()
      ? "leading and trailing spaces"
      : value !== value.trimEnd() ? "a trailing space" : "a leading space";
    if (handles.includes(value.trim()))
      return `unknown platform '${value}' — note ${which}. Remove the space and it will match '${value.trim()}'.`;
    return `unknown platform '${value}' — it has ${which}, and even trimmed it doesn't match any known platform.`;
  }
  const lower = value.toLowerCase();
  const caseHit = handles.find((h) => h.toLowerCase() === lower);
  if (caseHit)
    return `unknown platform '${value}' — capitalisation doesn't match. Platform handles are exact; use '${caseHit}'.`;
  let best = null, bestD = Infinity;
  for (const h of handles) {
    const d = editDistance(lower, h.toLowerCase());
    if (d < bestD) { bestD = d; best = h; }
  }
  if (best && bestD <= 2)
    return `unknown platform '${value}' — did you mean '${best}'? (Known platforms are listed in ${PLATFORMS_FILE}.)`;
  return `unknown platform '${value}'. It isn't in ${PLATFORMS_FILE} — add it there (and in Shopify, once platforms live there) or fix the rule.`;
}

// ---------- load -------------------------------------------------------

const platformsDoc = loadJson(PLATFORMS_FILE);
const mapDoc = loadJson(MAP_FILE);

const platformList = Array.isArray(platformsDoc.platforms) ? platformsDoc.platforms : null;
if (!platformList) {
  console.error(`✗ ${PLATFORMS_FILE} should contain a "platforms" list, but doesn't. Nothing could be checked.`);
  process.exit(1);
}
const handles = [];
platformList.forEach((p, i) => {
  if (!p || typeof p.handle !== "string" || !p.handle.trim()) {
    problems.push(`${PLATFORMS_FILE}, entry ${i + 1}: every platform needs a non-blank "handle".`);
  } else if (p.handle !== p.handle.trim()) {
    problems.push(`${PLATFORMS_FILE}, entry ${i + 1}: handle '${p.handle}' has stray spaces around it.`);
  } else if (handles.includes(p.handle)) {
    problems.push(`${PLATFORMS_FILE}, entry ${i + 1}: handle '${p.handle}' is listed twice.`);
  } else {
    handles.push(p.handle);
  }
});

const rules = Array.isArray(mapDoc.rules) ? mapDoc.rules : null;
if (!rules) {
  console.error(`✗ ${MAP_FILE} should contain a "rules" list, but doesn't. Nothing could be checked.`);
  process.exit(1);
}

// ---------- per-rule checks -------------------------------------------

const REQUIRED_TEXT = ["make", "model", "engine", "platform"];
const REQUIRED_YEAR = ["year_start", "year_end"];
const YEAR_MIN = 1900, YEAR_MAX = 2100;

rules.forEach((rule, i) => {
  const n = i + 1;
  const who = describe(rule, n);

  if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
    problems.push(`rule ${n}: this entry isn't a rule object at all — check the JSON around it.`);
    return;
  }

  for (const f of REQUIRED_TEXT) {
    if (!(f in rule)) problems.push(`${who}: the "${f}" field is missing.`);
    else if (typeof rule[f] !== "string" || !rule[f].trim())
      problems.push(`${who}: the "${f}" field is blank — every rule needs it.`);
  }
  for (const f of REQUIRED_YEAR) {
    if (!(f in rule)) problems.push(`${who}: the "${f}" field is missing.`);
    else if (typeof rule[f] !== "number" || !Number.isInteger(rule[f]))
      problems.push(`${who}: "${f}" should be a plain year like 1999, not "${rule[f]}". (No quotes around numbers.)`);
    else if (rule[f] < YEAR_MIN || rule[f] > YEAR_MAX)
      problems.push(`${who}: "${f}" is ${rule[f]}, which isn't a plausible model year (${YEAR_MIN}–${YEAR_MAX}).`);
  }
  if (
    Number.isInteger(rule.year_start) && Number.isInteger(rule.year_end) &&
    rule.year_start > rule.year_end
  ) {
    problems.push(`${who}: the year range is backwards — it starts in ${rule.year_start} but ends in ${rule.year_end}. Swap them.`);
  }

  if (typeof rule.platform === "string" && rule.platform.trim() && handles.length &&
      !handles.includes(rule.platform)) {
    problems.push(`${who}: ${explainUnknownPlatform(rule.platform, handles)}`);
  }
});

// ---------- collision check -------------------------------------------

const norm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
for (let i = 0; i < rules.length; i++) {
  for (let j = i + 1; j < rules.length; j++) {
    const a = rules[i], b = rules[j];
    if (norm(a.make) && norm(a.make) === norm(b.make) &&
        norm(a.model) === norm(b.model) &&
        norm(a.engine) === norm(b.engine) &&
        Number.isInteger(a.year_start) && Number.isInteger(a.year_end) &&
        Number.isInteger(b.year_start) && Number.isInteger(b.year_end) &&
        a.year_start <= b.year_end && b.year_start <= a.year_end) {
      const overlapFrom = Math.max(a.year_start, b.year_start);
      const overlapTo = Math.min(a.year_end, b.year_end);
      const span = overlapFrom === overlapTo ? `${overlapFrom}` : `${overlapFrom}–${overlapTo}`;
      if (norm(a.platform) !== norm(b.platform)) {
        problems.push(
          `${describe(a, i + 1)} and ${describe(b, j + 1)} both claim ${span} for the same ` +
          `vehicle and engine but point at different platforms ('${a.platform}' vs '${b.platform}'). ` +
          `One of them is wrong — a customer in ${span} would get two different answers.`,
        );
      } else {
        warnings.push(
          `${describe(a, i + 1)} and ${describe(b, j + 1)} overlap in ${span} with the same platform — ` +
          `not fatal, but one of them is probably redundant.`,
        );
      }
    }
  }
}

// ---------- report -----------------------------------------------------

for (const w of warnings) console.warn(`⚠ ${w}`);
if (problems.length) {
  console.error(`\n✗ ${MAP_FILE}: ${problems.length} problem${problems.length === 1 ? "" : "s"} found:\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error(`\nFix the entries above and run "npm run validate-fitment" again.`);
  process.exit(1);
}
console.log(`✓ ${MAP_FILE} — ${rules.length} rule${rules.length === 1 ? "" : "s"} checked against ${handles.length} known platforms, no problems found.`);
