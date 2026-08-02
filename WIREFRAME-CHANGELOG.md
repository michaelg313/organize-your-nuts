# OrganizeYourNuts.com — Lo-Fi Wireframe Change Log

Companion notes for `organizeyournuts-wireframe.html` (the restructured-site grayscale wireframe).
Records the structural decisions behind the current file so they don't have to be reverse-engineered later.

---

## What this file is
A single self-contained, grayscale, low-fidelity HTML wireframe of the **restructured** OrganizeYourNuts.com.
Follows the methodology of the existing `engine-hardware-kits-wireframe.html`: fixed top toolbar with a
**Desktop / Mobile** toggle, every section numbered (① Nav → … → Footer) and annotated, and cross-links
between page templates. No brand colors, no real copy, no design system — that comes at the high-fidelity stage.

Annotation chrome (yellow section notes, green "what changed" callout, red open-question flags, blue
cross-link chips) intentionally uses color; the **wireframe canvas itself stays grayscale**.

---

## Current template set (7)
Renumbered after the systems collapse (see Rev. 2). Sub-category pages that share a template are wireframed
once and labeled as the reusable pattern.

1. **Home** — restructured landing page
2. **Hardware Kits — Overview & Shop** — vehicle filter (carries in from Home) + results grouped into labeled
   system sections (absorbed the old system-page template)
3. **Hardware Storage — Overview** — cards for Bins / Organizers / Cases
4. **Storage Sub-category (Bins)** — reusable template for Bins / Organizers / Cases
5. **Cart** — review items (separate from Checkout)
6. **Checkout Flow** — multi-step (Shipping → Payment → Review → Confirmation)
7. **About / Contact**

**Home section order (current):** ① Nav → ② Quick Vehicle Entry → ③ Hero → ④ Two Pillars → ⑤ CTA Banner → ⑥ Footer

---

## Revision history

### Rev. 0 — Initial wireframe (8 templates)
Built from the finalized sitemap. Two shopping pillars (Hardware Kits, Hardware Storage), each a real overview
page laying out sub-categories as cards. Vehicle-system kits were children of Hardware Kits. Included a standalone
**System page template** (Engines) with a **two-layer filter**: a shared Make/Model/Year layer plus a
system-specific layer (engine type, transmission type, etc.), because filter dimensions differ by system.

Templates: Home · Hardware Kits overview (5 system cards) · System page template · Hardware Storage overview ·
Storage sub-category (Bins) · Cart · Checkout · About/Contact.

### Rev. 1 — Vehicle/engine filter moved to the Hardware Kits overview (8 → 7 templates)
**Decision:** the customer now sets **Make / Model / Year / Engine** on the Hardware Kits **overview** page itself,
not on individual system pages.

**Consequences baked into the wireframe:**
- The **5 system pages collapsed** — Engines, Transmissions, Steering & Suspension, Diff/Axle, Body & Trim are no
  longer separate pages/URLs. The old System-page template was removed; its filter + results grid became the
  Hardware Kits overview.
- The **5 systems survive as a results facet** (a chip row to narrow filtered kits to one category), not as sitemap nodes.
- A single vehicle identification (down to the engine) is enough to pull every fitting kit across all systems — this
  is what justified the collapse.
- **Template count 8 → 7.** Storage (×2), Cart, Checkout, About/Contact carried over unchanged.
- **Resolved a prior open question:** "does Make/Model/Year persist across system pages?" no longer applies —
  the filter is set once, on one page.
- Naming collision flagged inline on ②: the **"Engine"** filter field (which motor is in the car) vs. the
  **"Engines"** system facet (engine-hardware kit category) are different axes — watch this when copy is written.
- New open question added on ②: should filtered kits render as a **flat grid + facet row** (current default) or be
  **grouped into labeled system sections**? Presentation, not structure — flagged, not resolved.

### Rev. 1a — Home cleanup
- Removed the **"Shop by System" shortcut row** from Home.
- Kept the **Quick Vehicle Entry** block on Home.

### Rev. 2 — Quick Vehicle Entry moved above the Hero (current)
**Decision:** move Quick Vehicle Entry to sit **between Nav and Hero** on Home, matching auto-parts retailers
(AutoZone, Advance Auto Parts) where the vehicle/fitment selector sits at the top before any marketing — because
nothing on those sites is usable until the site knows the car.

**Scope chosen (per review):**
- **Home-only on-ramp** — the block is a convenience entry on the landing page that submits into the Hardware Kits
  results (②). It is not a global persistent nav bar (confirmed in Rev. 3).

### Rev. 3 — Home-only entry confirmed; no global nav bar
**Decision:** Quick Vehicle Entry stays a **Home-only on-ramp**. The block will **not** be promoted into a global
"Your Vehicle" bar in the nav on other pages. This closes the UI-placement half of the old persistence question.

- The red flag on Home §2 that pointed toward a possible global nav bar is now obsolete as a *placement* question —
  the placement is decided (Home only).
- What remains genuinely open is narrower: **does a vehicle selected on Home carry as state into ② and the cart, or
  is it re-entered on ②?** This is data/state behavior, not UI placement, and is still deferred (see open question #1).

### Rev. 4 — Both remaining open questions resolved (current)
**Decisions:**
- **Vehicle-state carry (was open Q1):** a vehicle selected in the Home entry block **carries as state** into the
  Hardware Kits overview (②) and the **Cart**. On ② the carried vehicle arrives pre-filled and stays editable; the
  Cart shows the carried vehicle as fitment context on kit line items (storage items are unaffected — storage isn't
  vehicle-specific).
- **Results presentation on ② (was open Q2):** filtered kits are **grouped into labeled system sections** (Engines,
  Transmissions, Steering & Suspension, Diff/Axle, Body & Interior Trim), each with its own header + card grid —
  **not** a flat grid with a facet row. A lightweight "jump to system" anchor row sits above the groups; systems with
  no fitting kits for the vehicle are omitted.

**Wireframe changes:**
- Home §2: the open-question flag is removed; the decided behavior (Home-only placement + vehicle carries into ② and
  Cart) is stated in the section note.
- ② §3 (Vehicle Filter): adds a "Your Vehicle" carried-state indicator; note updated to say the vehicle arrives
  pre-filled from Home and carries forward to the Cart.
- ② §4: replaces the "Browse by System (results facet)" chip row + flat results grid with grouped-by-system labeled
  sections (open-question removed). The "Engine" field vs "Engines" section naming note is preserved. ② renumbered
  from 7 sections to 6 (facet + flat grid merged into one grouped-results section).
- Cart §2: adds a "Your Vehicle" carried-context indicator.

---

## Open questions still outstanding (deliberately unresolved in the wireframe)
None. Both previously-flagged questions were resolved in **Rev. 4**:
1. **Vehicle-state carry (Home §2 → ② / cart):** RESOLVED — the vehicle carries as state into ② (pre-filled,
   editable) and into the Cart (fitment context on kit line items).
2. **Results presentation on ② (Hardware Kits):** RESOLVED — results are grouped into labeled system sections
   (not a flat grid + facet row).

The wireframe now reflects settled decisions throughout; the only remaining deferrals are the high-fidelity items below.

---

## Deferred to the high-fidelity stage (not in this wireframe)
- Real design system: orange palette (`--orange #FF8C00` etc.), Inter font, frosted/sticky nav, hover lifts, gradients.
- Real copy and product imagery (placeholder greeked text and hatched image slots for now).
- Actual filter option values, product data, and cart/checkout logic.

---

## File locations
- Wireframe deliverable: `organizeyournuts-wireframe.html` (save into the project folder alongside
  `engine-hardware-kits-wireframe.html`).
- Project reference: `ONBOARDING.md` (design system, existing pages, git/GitHub details).
