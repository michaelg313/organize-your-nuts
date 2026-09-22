/**
 * kits-picker.js — the browser half of the vehicle picker.
 *
 * Rules it follows (ADR-001 §5 Phase 4):
 *   - The URL is the source of truth: ?year=&make=&model=&engine= (slugs).
 *   - localStorage is convenience only: it re-fills the form on a return visit
 *     and is never trusted over the URL.
 *   - A complete vehicle always lands on ITS platform's page. If the URL's
 *     vehicle belongs to a different platform than the page, we go there.
 *   - A URL vehicle that no rule covers shows the "not covered yet" notice; the
 *     page still shows its platform's kits, honestly labelled for the platform.
 *
 * The same picker markup is used on /hardware-kits (no platform) and on every
 * /hardware-kits/<platform> page; `data-platform` on the form tells us which.
 */
import { fromSlugs, resolve, modelsFor, yearsFor, enginesFor, toQuery, describeVehicle } from "../lib/fitment.js";

const STORAGE_KEY = "oyn.vehicle";
const ORDER = ["make", "model", "year", "engine"];

const form = document.querySelector("[data-picker]");
if (form) init(form);

function init(form) {
  const pagePlatform = form.dataset.platform || null;
  const sel = Object.fromEntries(ORDER.map((k) => [k, form.querySelector(`[data-sel="${k}"]`)]));
  const submit = form.querySelector("[data-submit]");
  const chip = form.querySelector("[data-chip]");
  const chipText = form.querySelector("[data-chip-text]");
  const chipEmpty = form.querySelector("[data-chip-empty]");
  const change = form.querySelector("[data-change]");
  const notice = document.querySelector("[data-not-covered]");
  const noticeText = document.querySelector("[data-not-covered-text]");
  const headingPlatform = document.querySelector("[data-heading-platform]");
  const headingVehicle = document.querySelector("[data-heading-vehicle]");
  const headingModel = document.querySelector("[data-vehicle-model]");

  // ---- form helpers -------------------------------------------------------

  const current = () => ({ make: sel.make.value, model: sel.model.value, year: sel.year.value, engine: sel.engine.value });

  function fill(select, options, placeholder, value = "") {
    select.innerHTML = "";
    select.append(new Option(placeholder, ""));
    for (const o of options) select.append(new Option(o, o));
    select.value = options.includes(value) ? value : "";
    select.disabled = options.length === 0;
  }

  /** Rebuild every select downstream of `changed`, keeping values that are still valid. */
  function cascade(changed, keep = {}) {
    const v = { ...current(), ...keep };
    const from = ORDER.indexOf(changed);
    if (from < 1) fill(sel.model, v.make ? modelsFor(v.make) : [], "Select model", v.model);
    v.model = sel.model.value;
    if (from < 2) fill(sel.year, v.model ? yearsFor(v.make, v.model) : [], "Select year", v.year);
    v.year = sel.year.value;
    if (from < 3) fill(sel.engine, v.year ? enginesFor(v.make, v.model, v.year) : [], "Select engine", v.engine);
    updateSubmit();
  }

  function setForm(v) {
    sel.make.value = v.make ?? "";
    cascade("make", { model: v.model ?? "", year: v.year ?? "", engine: v.engine ?? "" });
  }

  function updateSubmit() {
    submit.disabled = !resolve(current());
  }

  // ---- what the page shows for the chosen vehicle --------------------------

  function showVehicle(v) {
    chipText.textContent = describeVehicle(v);
    chip.hidden = false;
    chipEmpty.hidden = true;
    change.hidden = false;
    if (headingVehicle && headingPlatform && headingModel) {
      headingModel.textContent = v.model;
      headingVehicle.hidden = false;
      headingPlatform.hidden = true;
    }
  }

  function clearVehicle() {
    chip.hidden = true;
    chipEmpty.hidden = false;
    change.hidden = true;
    if (headingVehicle && headingPlatform) {
      headingVehicle.hidden = true;
      headingPlatform.hidden = false;
    }
    if (notice) notice.hidden = true;
  }

  function showNotCovered(text) {
    if (!notice) return;
    noticeText.textContent = text;
    notice.hidden = false;
  }

  // ---- localStorage: convenience only --------------------------------------

  function save(v) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {}
  }
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      return v && resolve(v) ? v : null;   // ignore anything stale or no longer covered
    } catch { return null; }
  }
  function forget() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // ---- wiring ---------------------------------------------------------------

  for (const k of ORDER) sel[k].addEventListener("change", () => cascade(k));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = current();
    const rule = resolve(v);
    if (!rule) return;
    save(v);
    const url = `/hardware-kits/${rule.platform}${toQuery(v)}`;
    if (rule.platform === pagePlatform) {
      history.replaceState(null, "", url);   // same page: no reload needed, the kits don't change
      if (notice) notice.hidden = true;
      showVehicle(v);
      form.scrollIntoView({ block: "start" });
    } else {
      location.assign(url);
    }
  });

  change.addEventListener("click", (e) => {
    e.preventDefault();
    forget();
    setForm({});
    clearVehicle();
    history.replaceState(null, "", location.pathname);
  });

  // ---- on load: URL first, then the saved vehicle ----------------------------

  const params = new URLSearchParams(location.search);
  const raw = Object.fromEntries(["year", "make", "model", "engine"].map((k) => [k, params.get(k)]));
  const hasParams = Object.values(raw).some(Boolean);

  if (hasParams) {
    const v = fromSlugs(raw);
    const rule = resolve(v);
    if (rule) {
      if (rule.platform !== pagePlatform) {
        location.replace(`/hardware-kits/${rule.platform}${toQuery(v)}`);
        return;
      }
      setForm(v);
      showVehicle(v);
      save(v);
    } else {
      // The URL names a vehicle we have no rule for. Fill in whatever prefix IS
      // known so the shopper can finish the pick, and say plainly what happened.
      setForm(v);
      const words = ["year", "make", "model", "engine"].map((k) => v[k] ?? raw[k]).filter(Boolean).join(" ");
      showNotCovered(words || "that vehicle");
    }
  } else {
    const saved = load();
    if (saved) {
      setForm(saved);
      // Only claim "your vehicle" when the saved one really belongs to this page.
      if (pagePlatform && resolve(saved).platform === pagePlatform) showVehicle(saved);
    }
  }
  updateSubmit();
}
