# ADR-003 — Partial-Match Fitment: Sub-Generation Platforms, with a Fitment Note as Backstop

**Status:** Accepted
**Date:** 2026-09-20
**Decides:** ADR-001 §7.1 — what happens when a kit fits a platform but not every vehicle in it
(mid-year engine changes, running production changes, regional variants). ADR-001 required this to be
decided before the second platform's vehicle rules were authored; Phase 3 is where that happens, so it
comes due now.

---

## 1. Decision

Two mechanisms, chosen by one question: **can the vehicle picker (year / make / model / engine) tell
the difference?**

1. **If yes — split the platform into sub-generations.** The platform becomes two (or more) narrower
   platforms, each a peer entry in Shopify and in `fitment/platforms.json`, each with its own
   `/hardware-kits/<handle>` page. Vehicle rules point at the narrower handle. A kit that fits both
   sides is tagged with both in `custom.fits_platforms`. The invariant from ADR-001 §2.1 — *a kit fits
   a platform, wholly* — is preserved.

2. **If no — keep the platform whole and put a fitment note on the kit.** Some differences are not
   determined by the vehicle: which cylinder heads are on a small-block, whether a previous owner fitted
   aftermarket parts, a running change with no clean model-year line. For these, the kit carries a
   shopper-facing note (a new product metafield, `custom.fitment_note`) that the card displays
   prominently. The note is required on any kit that does not fit every vehicle on its platform page
   and cannot be resolved by rule 1.

**Per-SKU year overrides are rejected** (reasons in §4).

### The rule of thumb for splitting

Split a platform **only when a kit you actually sell fits one side and not the other.** Never split
speculatively because a difference exists in the real world; split because a product on the shelf
needs it. At launch scale (3–4 platforms) this keeps the list short; at 30–60 platforms it is the only
thing that keeps the list sane.

---

## 2. Reasoning

- **Sub-generations keep fitment logic in the repo, where CI can see it.** ADR-001 §2.4 put the
  vehicle map in the repo because "a wrong fitment claim is somebody's disassembled engine" — it needs
  a diff, a history, a review, and a loud failure. Splitting a platform changes nothing about that: the
  rule shape is unchanged, every rule still resolves to exactly one handle, and the validator still
  checks every handle. The precision lives in the year ranges and engine strings of the rules, which is
  exactly where the validator already looks.
- **No new data-model concepts in Shopify.** More entries in a list that already exists. The
  `custom.fits_platforms` list metafield already expresses "fits several platforms" — that was the point
  of making it a list in Phase 2 Part C.
- **The shopper's promise survives.** A sub-generation page shows only kits that fit every vehicle
  that resolves to it. Nothing on the page needs a caveat, so the site's central claim — *only what
  fits your truck* — stays true on the pages that rank.
- **The note handles what nothing else can.** A difference the picker cannot see cannot be mapped to
  from a vehicle rule, so no sub-generation can express it. Forcing it into a platform produces a
  platform with no vehicle rules pointing at it — an unreachable page. The note is honest about the
  limit of what the site can know, and it is also the "verify fitment before ordering" safeguard
  ADR-001 §6 already asked for.
- **SEO is helped, not hurt, by splitting.** "Small block Chevy Vortec bolt kit" is a query a real
  person types; a page for it is worth more than a broader page it would otherwise be buried in.
  ADR-001 §2.2's argument that the platform pages are the business's traffic applies to sub-generations
  unchanged.

---

## 3. What is being traded away

1. **More platform entries, and a judgment call each time.** Every split is a decision the operator
   makes and owns. The rule of thumb in §1 bounds it but does not remove it.
2. **Splits compound.** If one platform needs both a "Vortec vs. earlier" split and a "one-piece vs.
   two-piece rear main seal" split, that is four sub-generations, and every kit on the parent must be
   re-tagged for the sides it fits. Accepted; the rule of thumb (split only for a kit on the shelf)
   makes this rare in practice.
3. **Splitting a platform after launch is a real change.** The existing handle keeps the larger or
   more common side; the carved-out side gets a new handle. Every kit tagged with the old handle must be
   re-checked and re-tagged in the **same change** as the vehicle-map update — a kit that fits only the
   carved-out side, left on the old handle, is a wrong fitment claim. Pre-launch (now), handles can
   simply be renamed in both places.
4. **The note pushes some work back to the shopper.** On any kit that carries one, the shopper has to
   read and check their own vehicle. That is the honest position for a difference the site cannot
   determine; it is not a substitute for rule 1 when rule 1 applies.

---

## 4. Alternative rejected

| Alternative | Why rejected |
|---|---|
| **Per-SKU year overrides** (keep platforms coarse; give each product fields narrowing the years it fits) | Moves fitment *logic* out of the reviewed repo and into typed admin fields, where it gets no diff, no review, and no CI check — the exact failure mode ADR-001 §2.4 was designed to make impossible. Modelling it correctly in Shopify needs a "fitment line" metaobject (platform + start year + end year) per product-platform pair, because a kit fitting two platforms rarely has the same year window on both; that is a heavier data model than sub-generations for less safety. It also only handles year-based differences, so it needs the note as a backstop anyway. Anything it can express, a sub-generation expresses with the existing rule shape. |

---

## 5. Consequences

### 5.1 Repo — `fitment/vehicle-map.json` and `fitment/platforms.json`

- **The rule shape does not change.** `make`, `model`, `year_start`, `year_end`, `engine`, `platform`
  — all required, exactly as the Phase 1 scaffolding and validator define them.
- **A sub-generation is an ordinary platform entry.** There is no parent/child structure in the data.
  Every platform is a peer with its own handle and its own page. The relationship is carried by the
  handle naming convention only: `<parent>-<qualifier>`, lowercase, hyphens — e.g. `sbc-gen1-vortec`.
  The `display_name` should make the scope obvious to a shopper without knowing the convention.
- **Every platform must be reachable.** A platform with no vehicle rule pointing at it is a page the
  picker can never land on. The validator should warn about this (Phase 3, same PR as the first real
  rules). It is a warning rather than a failure only because a platform may legitimately be added in
  Shopify a day before its rules land.
- The ADR-001 §2.4 check "a platform has zero SKUs" still requires reading Shopify; deferred to
  Phase 4+ with the rest of the API work.

### 5.2 Shopify

- **One new product metafield: `Fitment note`**, expected namespace/key `custom.fitment_note`,
  multi-line text, one value, Storefront API access on, no other options. Optional at the definition
  level — set only on kits that need it under rule 2. Storage products never get one.
- Recorded as **Part G** in `docs/PHASE-2-SHOPIFY-CHECKLIST.md`. It must exist before Phase 4 renders
  product cards; it does not need to exist for Phase 3, which is repo-only.
- No platform entries are added or split in Shopify as a consequence of this ADR alone. Any split
  happens when the Phase 3 rules require it, on a branch, with `fitment/platforms.json` updated in the
  same PR and `npm run validate-fitment` passing.

### 5.3 Phase 4 — `/hardware-kits/<platform>`

- The card renders `custom.fitment_note` prominently when present — not as fine print. Copy is a
  Phase 4 concern; the data is decided here.
- The general "verify fitment before ordering" line from ADR-001 §6 appears on every kit card
  regardless of whether a note is present.
- Astro's `getStaticPaths()` generates one page per platform handle, sub-generations included; nothing
  special-cases them.

### 5.4 Still deferred

- **Returns policy for fitment errors** (ADR-001 §7.5) is directly downstream of this decision and
  remains open. The note in rule 2 reduces the exposure but does not decide the policy.
- **Grouping sub-generations on the Home page or in the picker** (e.g. showing "Small-Block Chevy" as
  one family with two entries) is a presentation question for Phase 6. The data carries no grouping on
  purpose; if it is ever needed, it can be derived from the handle prefix or added as an optional field
  then.
