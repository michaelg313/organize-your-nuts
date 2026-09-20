# ADR-001 — Production Stack for OrganizeYourNuts.com

**Status:** Accepted
**Date:** 2026-07-26
**Decides:** the production architecture, before any production code and before the per-page split of `organizeyournuts-hifi.html`.

---

## 1. Recommendation

**Headless Shopify.** Shopify is the commerce backend (catalog, orders, payments, tax, checkout). A custom
statically-generated front end is the storefront, reading products via the Storefront API and handing the
buyer off to Shopify's hosted checkout.

| Layer | Choice | Why |
|---|---|---|
| Commerce backend | Shopify Basic ($39/mo monthly, $29/mo annual) | Orders, payments, tax, checkout, admin — rented |
| Payments | Shopify Payments (2.9% + 30¢ online) | Avoids the 2% third-party gateway surcharge on Basic; near-zero PCI scope |
| Front end | Custom, static-first, own repo | Keeps the hi-fi CSS and the indexable per-platform URLs |
| Front-end hosting | Oxygen (included with paid plans) or Cloudflare Pages / Netlify | Managed, no server to patch |
| Product data | Shopify admin | Browser Save button, no deploy for price/copy/image edits |
| Platform definitions | Shopify **metaobjects** | Admin-editable; SKU→platform links are *picked from a list*, not typed |
| Vehicle→platform rules | JSON/CSV **in the repo**, validated in CI | The part with real logic — needs diffs, review, and a loud failure |
| Vehicle state | URL path + query params, canonicalised; localStorage as convenience only | Shareable, indexable, cacheable |
| Fitment data source | Hand-built platform model. **No ACES/VCdb.** | Kits fit platforms, so the licensed database is unnecessary |

**Launch scope:** 3–4 platforms, 30–50 SKUs. Not 400.

---

## 2. Reasoning

### 2.1 The decisive fact: kits fit platforms, not vehicles

A main cap bolt set fits a small-block Chevy, not "a 1996 Silverado." That single answer removed the largest
cost and the largest ongoing risk in the project:

- **Per-vehicle fitment** would have meant ~400 SKUs × thousands of vehicle configurations, a licensed
  ACES/VCdb subscription, an Auto Care Association membership, and a quarterly data-ingest pipeline owned
  forever by a solo operator who cannot yet read a stack trace. That pipeline was the most fragile thing in
  the project, and fragile in precisely the operator's weakest dimension.
- **Per-platform fitment** means ~30–60 platform records (SBC Gen I, LS Gen III/IV, 4.6 Modular, 7.3
  Powerstroke, 5.9 Cummins 12v/24v, 22R-E/3RZ, K-series, LT1, Coyote…), each SKU tagged with the platforms
  it fits, plus a few hundred rules mapping vehicles into platforms. One person can hold that in their head.

It is also *more correct* than per-vehicle rows, because it matches how the parts actually work. And adding
SKU 401 means tagging a platform, not touching thousands of rows.

**Design consequence:** the Engine dropdown stops being cosmetic. It is the field that resolves platform
ambiguity — a 1999 Silverado is a different platform depending on whether it's the 4.8 or the old 5.7 Vortec.
The hi-fi already requires engine before results appear, so the design survives this intact.

### 2.2 Deriving the vehicle list makes the SEO nearly free

Because the dropdown only offers vehicles that platform rules cover, the set of possible filter results is
**finite and enumerable**. Every filtered Kits view is therefore a page that can be generated ahead of time:
a real URL, real HTML, indexable, cacheable, no server thinking at request time.

Had the dropdown offered every vehicle since the mid-90s, the URL space would have been effectively infinite,
forcing a choice between not indexing the primary shopping page at all, or generating tens of thousands of
thin near-duplicate pages that search engines treat as spam. That problem was dodged.

This matters more than it looks. At ten orders a month at $150 AOV (~$1,500/mo), there is no budget to buy
traffic. `"LS Gen IV engine hardware kit"` is a query a real person types, and a static page targeting it is
worth more than any amount of homepage polish. **Whether anyone finds the store is the binding constraint on
this business, not operational efficiency** — nobody drowns in ten orders a month. That is the single
strongest argument in the whole analysis, and it is what rules out the standard Shopify theme.

### 2.3 Why Shopify keeps the money-critical parts

The operator can author with AI assistance but cannot yet diagnose a failure, and Claude Code is not on call
at 9pm on a Saturday. So the split is deliberate:

- **Owned:** catalog presentation, fitment logic, routing, the front end. A bug here costs a customer's
  patience.
- **Rented:** payment capture, tax calculation, order recording, checkout. A bug here costs a customer's
  money, and these need a support number and a status page.

Shopify also resolves an inconsistency in the earlier answers: with Shopify in the picture there is no reason
to use the Stripe Dashboard as an order desk. Shopify's admin gives fulfillment state, tracking emails, and a
customer-facing order status page — free with the subscription, and strictly better.

### 2.4 Where fitment data lives, and why it is split

Two different kinds of data with two different failure modes:

- **SKU → platform links** live in Shopify as `list.metaobject_reference` metafields. The operator *picks*
  platforms from a list in the admin, so a slug typo (`ls-gen-4` vs `ls-gen4`) is structurally impossible.
  No deploy required.
- **Vehicle → platform rules** live in the repo as a data file (`fitment/vehicle-map.json`), because this is
  the part with actual logic — year ranges, engine-option disambiguation, mid-year splits. It needs a diff,
  a history, and a review, because **a wrong fitment claim is somebody's disassembled engine.** CI refuses
  the build if a rule references an unknown platform handle, if a required field is blank, or if a platform
  has zero SKUs.

This supersedes the earlier "spreadsheet export/import" plan, and keeps what was good about it: a spreadsheet
remains a fine authoring surface for bulk SKU data via Shopify's own CSV import.

---

## 3. What is being traded away

1. **The designed multi-step checkout (template ⑥, steps 2–3) is dead.** Shopify's checkout replaces it.
   Basic allows branding — logo, colors, fonts — not layout. Deeper checkout customisation is a Plus-tier
   feature at ~$2,300/mo. The Cart (template ⑤) survives and is built as designed; the confirmation page is
   Shopify's. **Accepted knowingly.**
2. **Payments architecture changed.** The Stripe-hosted card field and Stripe Tax are both out. Net positive:
   less PCI scope, one system of record.
3. **~2.6% of revenue in subscription** at launch volume ($39 on ~$1,500/mo), shrinking as revenue grows.
   Card processing (2.9% + 30¢) is *not* a platform premium — it is charged on a custom build too.
4. **An ongoing maintenance tax.** Storefront API versions are released quarterly and retire; the front end
   needs periodic upgrades. This is real and lands on the operator. Mitigations in §6.
5. **Most of the Shopify app ecosystem and theme editor become unavailable.** Anything that injects into a
   Liquid theme won't work. Fitment apps in particular are not usable — which is fine, since they are also
   the thing that would have destroyed the indexable URLs.
6. **A build step now exists.** The repo is no longer flat files served by `serve`.

---

## 4. Alternatives rejected

| Alternative | Why rejected |
|---|---|
| **Shopify standard (Liquid theme)** | Lowest ops burden, and the closest call. Rejected because fitment apps filter client-side against a saved garage — the filtered view is a JS state change, not a crawlable URL. It costs exactly the organic traffic the business cannot afford to lose. Keeping ~50 hand-maintained collection pages in sync is worse than owning the front end. |
| **Shopify as catalog CMS + Stripe checkout** | Literally what two earlier answers described, and the weakest option: pay a storefront subscription for a product admin, get no order management from it, model platforms awkwardly, and sit in a gray area with Shopify's terms by selling outside their checkout. |
| **Fully custom (own DB + Node + self-hosted Medusa/Saleor)** | Ruled out by the operator profile. Not because it couldn't be learned, but because the learning window coincides exactly with launch — when a broken checkout costs the business. Also imports PCI scope, tax engine, fraud, refunds, chargebacks. |
| **WooCommerce / self-hosted WordPress** | Same objection, plus a permanent patching obligation on a high-value attack surface. |
| **BigCommerce** | Better native faceting than Shopify, but the same fundamental URL problem for custom fitment, a smaller ecosystem, and no advantage that outweighs switching cost. |
| **Licensed ACES/VCdb** | Unnecessary once fitment is per-platform. Revisit only if selling into marketplaces that require ACES (see §7). |
| **"Custom build to escape the revenue tax"** | Rejected as reasoning, not just as an option. The 2.9% + 30¢ does not go away by building your own. There are good reasons to own the front end — SEO and design control — and this was not one of them. |

---

## 5. Migration path: hi-fi HTML → first working production page

### Phase 0 — Prerequisites (start now, they are slow not hard)
- Register the PA entity and obtain a PA sales tax license. Shopify Payments requires a legal entity to pay
  out to, so this gates *taking money*, not launch week. **Not legal or tax advice — confirm with an
  accountant or attorney.**
- Open the Shopify trial; do not commit to annual billing until the front end proves out.

### Phase 1 — Extract the stylesheet (preserves the design work)
The hi-fi CSS is already organised for exactly this, so it ports rather than gets rewritten:
- **Delete §4 (review chrome)** — toolbar, frame, device simulation. Zero out its tokens.
- **§1 tokens + §2 base/type + §3 components → `site.css`, moved verbatim.** No refactor, no renaming.
- **§5 page rules → per-route stylesheets**, one file per template, imported only by that route.
- **Container queries against `.page` survive unchanged** — `.page` becomes the app shell wrapper. This is
  why a real phone and the old Desktop/Mobile toggle hit the same code path, and it should stay that way.
- Keep `organizeyournuts-hifi.html` in the repo under `docs/` as the visual regression reference. Do not
  delete it after the split.

### Phase 2 — Model the data in Shopify
- Metaobject definition **`platform`**: display name, handle, description, SEO title/meta, notes. Mark
  *Storefronts* so the Storefront API can read it.
- Product metafield **`fits_platforms`**: `list.metaobject_reference` → `platform`.
- Product metafield or tag **`system`**: engine / transmission / steering-suspension / diff-axle / body-trim.
  These are the five result groupings — never URLs.
- Create 3–4 platforms and ~10 SKUs. Enough to build against, not enough to be a data-entry project.

### Phase 3 — Author the vehicle map
`fitment/vehicle-map.json` — entries of the shape *make, model, year range, engine → platform handle*.
CI validates every platform handle against the live metaobject list. The cascading dropdown options are
**derived from this file**, which is what makes "only offer vehicles we cover" automatic and permanently
accurate rather than a thing to maintain twice.

### Phase 4 — First production page: **`/hardware-kits/<platform>`**
Not Home. Home is the easy page and proves nothing. The Kits page is the one that exercises every unknown at
once: cascading dropdowns fed by derived data, the fitment query, grouping into five system sections,
omission of systems with no fit, the empty and "not covered yet" states, and the SEO target. If this page
works, the project works.

- **Canonical URL:** `/hardware-kits/<platform-handle>` — pre-rendered, indexed, the page that ranks.
- **Specific vehicle:** query params (`?year=1997&model=tacoma&engine=2.7-i4`) for the chip display and the
  pre-filled selects, with `<link rel="canonical">` pointing at the bare platform URL so the variants don't
  fragment indexing.
- **localStorage:** convenience only — re-fills the form on return visits. Never the source of truth.
  This resolves the open vehicle-state question: **URL is authoritative.**

### Phase 5 — Cart
Build the designed Cart (template ⑤) against the Storefront API Cart. Carry the vehicle as **line item
attributes** on kit lines — this is what makes settled decision #2 (fitment context on cart line items) work,
and those attributes appear on the order in the Shopify admin, so the packing slip shows which truck the kit
was bought for. Storage items carry no attributes. Then hand off to `cart.checkoutUrl`.

### Phase 6 — Remaining templates
Home (Quick Vehicle Entry submits to `/hardware-kits/<platform>`), Hardware Storage overview + sub-category,
About/Contact. All straightforward once Phases 4–5 hold.

---

## 6. Risk register and mitigations

| Risk | Mitigation |
|---|---|
| Front end breaks and the operator cannot diagnose it | Keep a minimal Dawn theme published on the `.myshopify.com` domain. Products, prices, and checkout already live in Shopify, so this is a working fallback store reachable in minutes, not a rebuild. |
| Storefront API version retires | Calendar reminder every 6 months to bump the API version and redeploy. Small, predictable, ignorable for a while — but not forever. |
| A wrong fitment claim ships | CI validation (Phase 3) plus a manual review of `vehicle-map.json` diffs. Consider a visible "verify fitment before ordering" note and a generous returns policy on fitment errors. |
| Agency guides price headless builds at $30k–$150k | Those are Plus-tier brands with multi-market requirements, dedicated dev retainers, and Algolia. Not comparable to a 50-SKU single-market store. Cited only so the number isn't a surprise if encountered. |
| Photography becomes the critical path | It usually does. 30–50 SKUs of photography is a weekend; 400 is a project. Another reason the scope cut is right. |

---

## 7. Deferred — explicitly not decided

1. **Partial-match behavior.** The largest remaining open question. What happens when a kit fits a platform
   but not every year in it (mid-year engine changes, running production changes, regional variants)? Options:
   platform sub-generations, per-SKU year overrides, or a fitment note surfaced on the card. Decide before
   authoring the second platform. **Decided 2026-09-20 in
   [ADR-003](ADR-003-partial-match-fitment.md):** sub-generations where the vehicle picker can tell the
   difference, a fitment note on the kit where it cannot; per-SKU overrides rejected.
2. **The "we don't cover this yet" capture.** Agreed in principle for covered-vehicle / no-kit-in-system
   cases. Copy, whether it captures an email, and whether it feeds a build-next queue — undecided.
3. **Product photography.** Not started. Likely the real critical path.
4. **PA registration and sales tax specifics.** Prerequisite, not designed. Requires an accountant.
5. **Returns policy for fitment errors.** Directly downstream of item 1. Still open after ADR-003.
6. **Customer accounts.** Guest checkout only at launch, unless a reason appears.
7. **Search.** No site search at launch; the platform pages are the navigation.
8. **Analytics.** Nothing chosen. Needs to exist before judging whether the SEO thesis is working.
9. **ACES/VCdb, revisited.** If selling into marketplaces or supplying data to distributors later, ACES
   becomes a requirement of *that* channel, not of this website. Do not pre-build for it.
10. **The Engine / Engines naming collision** flagged in the wireframe changelog — the filter field (which
    motor is in the car) vs. the system grouping (engine-hardware kit category). Still a copywriting problem,
    still unresolved.
11. **Storage merchandising.** Storage items are not vehicle-specific and currently have no discovery path
    beyond the Storage pages. Fine at launch; revisit if storage becomes a meaningful share of revenue.

---

## 8. What this record does not do

It does not authorise implementation. The next artifact should be Phase 1 (the CSS split) and Phase 2 (the
Shopify data model), both reviewable in isolation, before any front-end route is built.
