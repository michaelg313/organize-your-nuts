# OrganizeYourNuts.com

Headless-Shopify storefront, in progress. The architecture is decided and recorded in three ADRs —
read them first; they are authoritative:

- [ADR-001 — production stack](ADR-001-production-stack.md): headless Shopify, kits fit *platforms*.
- [ADR-002 — front-end framework](ADR-002-frontend-framework.md): Astro, fully pre-rendered, on Vercel.
- [ADR-003 — partial-match fitment](ADR-003-partial-match-fitment.md): sub-generation platforms, fitment note as backstop.

**Current state: launch prep — every template is built (Home, Hardware Kits, Hardware Storage, Cart,
About/Contact); what's left before taking orders is in [Launch](#launch).**

## Run it

You need Node 22+ and a `.env` file (copy `.env.example`). It holds three values: your store's
`.myshopify.com` address, the **private** Storefront API token, and the **public** Storefront API
token — both tokens are on Sales channels → Headless → your storefront. `.env` is git-ignored and
must stay that way — the private token is a password. The public one is meant to be in web pages
(the cart uses it); the build refuses if the two are accidentally the same.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:4321. Products and platform copy come from Shopify at build/dev time;
vehicles come from `fitment/vehicle-map.json`.

```bash
npm run build
```

Runs the fitment validator, then fetches from Shopify and writes every page to `dist/`. Vercel runs
this same command on every push. **If the build fails, read the last lines of the log** — every
failure this project can produce is written in plain English and says where to fix it.

## What exists

| Route | Generated from | Notes |
|---|---|---|
| `/` | [`src/pages/index.astro`](src/pages/index.astro) | Home. Quick Vehicle Entry runs the Kits picker's own script, so a vehicle chosen here lands on `/hardware-kits/<platform>?year=…` exactly as it would from the Kits page. Numbers are counted from the real data. |
| `/hardware-kits/<platform>` | one page per entry in `fitment/platforms.json`, via `getStaticPaths()` in [`src/pages/hardware-kits/[platform].astro`](src/pages/hardware-kits/[platform].astro) | Kits from Shopify (`custom.fits_platforms`), grouped by `custom.system`; empty systems omitted. SEO title/description from the Shopify Platform entry. Canonical is always the bare URL. |
| `/hardware-kits` | [`src/pages/hardware-kits/index.astro`](src/pages/hardware-kits/index.astro) | The design's "no vehicle set" state: the picker plus links to every platform page. |
| `/hardware-storage` | [`src/pages/hardware-storage/index.astro`](src/pages/hardware-storage/index.astro) | One card per category, with its live count and "from" price — or "Coming soon". |
| `/hardware-storage/<category>` | one page per entry in [`src/lib/storage.js`](src/lib/storage.js) (`bins`, `organizers`, `cases`), via [`[category].astro`](src/pages/hardware-storage/[category].astro) | Products whose Shopify `custom.storage_type` is that category. Add to cart with no vehicle; live stock. "Sort by" appears at 2+ products. An empty category says "Coming soon" and is `noindex` until it has a product. |
| `/cart` | [`src/pages/cart.astro`](src/pages/cart.astro), filled in by [`src/scripts/cart-page.js`](src/scripts/cart-page.js) | Hi-fi template ⑤ and its empty state. Not indexed (`noindex`). "Proceed to checkout" hands off to Shopify's checkout. |
| `/about` | [`src/pages/about.astro`](src/pages/about.astro) + [`src/scripts/contact-form.js`](src/scripts/contact-form.js) | About and the contact form (see "Contact form and business facts" below). |
| `/sitemap.xml` | [`src/pages/sitemap.xml.js`](src/pages/sitemap.xml.js) | Every page meant to rank, from the same data as the pages. Leaves out `/cart` and empty "Coming soon" categories (both `noindex`). [`public/robots.txt`](public/robots.txt) points to it. |

Vehicle state: the URL is authoritative (`?year=&make=&model=&engine=`, slugged); a chosen vehicle
always lands on *its* platform's page; `localStorage` only re-fills the form on a return visit.
The dropdowns are **derived** from `fitment/vehicle-map.json` in [`src/lib/fitment.js`](src/lib/fitment.js) —
never hand-maintained.

## Storage

Storage products aren't vehicle-specific (ADR-001 §7.11): no platforms, no system, no vehicle on the
cart line. Which page a storage product appears on is its **Storage type** in Shopify
(`custom.storage_type`, a pick-list: `bins`, `organizers`, `cases` — checklist Part I). The same three
values are listed in [`src/lib/storage.js`](src/lib/storage.js), with each category's copy.

**The build refuses** a product that has both Fits platforms and Storage type (kit or storage?), or
neither (it would be on no page), or a Storage type the site doesn't know. A category with *no*
products is fine — it says "Coming soon".

To add a storage product: create it in Shopify, set **Storage type**, leave Fits platforms and System
blank, publish it to the Headless channel, and redeploy.

## Contact form and business facts

The hi-fi's Home/About copy was design filler — some of it false ("1,400+ kits in stock"), some
undecided (returns, ADR-001 §7.5). Every business fact the site states lives in
[`src/lib/business.js`](src/lib/business.js): returns window, same-day cutoff, bulk pricing, materials,
where orders ship from, email, phone, hours, address. **`null` means not confirmed, and that sentence,
stat or contact row is left off the page.** Catalog numbers (kits, platforms, vehicles covered) are
counted from the real data at build time.

Contact is **by email only** — no phone, no hours, no address (operator's decision, launch prep;
Formspree was dropped). The contact form checks the fields first, the way the hi-fi's "validation
errors" state shows, then "Send" opens the shopper's email app with the message pre-written to
`email` in `business.js`. If that app doesn't open, a note under the form gives the address. With no
`email` set, the form says it isn't connected, the button is off, and **the build prints a warning**.

**`email` is temporarily the operator's personal address** for pre-launch tests. Swap in the
business mailbox before launch (checklist item 0 under Launch).

## The cart

The one interactive part of the site (ADR-002 §1): a small hand-written Storefront API client in
[`src/lib/cart.js`](src/lib/cart.js), no SDK. Shopify holds the cart; the browser only remembers
its ID (`localStorage` key `oyn.cart`).

- **Add to cart** ([`src/scripts/add-to-cart.js`](src/scripts/add-to-cart.js)) on a kit needs a
  vehicle. Without one, the button scrolls to the picker: "Choose your vehicle first — we note it
  on your order." Storage buttons (marked `data-storage`) skip that; every other button needs a
  vehicle, so a kit can't reach the cart without one.
- **Kit lines carry the vehicle** as line-item attributes — `Year`, `Make`, `Model`, `Engine`,
  `Platform` — so the Shopify order and packing slip show which vehicle the kit was bought for.
  Storage lines carry none.
- **Stock is live** on kit and storage pages. A product with no sellable stock shows "Out of
  stock". The page asks Shopify on every load, so entering inventory in the admin turns the button
  on without a redeploy.
- **The nav count** is on every page ([`src/scripts/cart-count.js`](src/scripts/cart-count.js)).
- **Shipping and tax** can't be estimated before Shopify has an address, so the summary says
  "Calculated at checkout" and shows an *estimated* total.
- **Checkout** is Shopify's (`cart.checkoutUrl`) — ADR-001 §3.1.

**When the cart misbehaves:** the shopper sees one plain sentence. The real reason is in the
browser's console (right-click → Inspect → Console), on a line starting `[cart]` — each one says
what to check (token, Headless permissions, stock, or Shopify being unreachable).

## Where things live

```
astro.config.mjs        site URL (for canonicals), static output
vercel.json             clean URLs, no trailing slash
public/robots.txt       allows everything; points crawlers at /sitemap.xml
fitment/                platforms.json + vehicle-map.json — the fitment data (reviewed, CI-checked)
scripts/validate-fitment.mjs   the CI check; runs before every build
src/lib/fitment.js      dropdown derivation, slugs, vehicle → platform resolution (build + browser)
src/lib/shopify.js      the ONE Storefront API fetch per build, plus the plain-English build checks
src/lib/cart.js         the cart's Storefront API client (browser, PUBLIC token)
src/lib/display.js      system names + price format, shared by the build and the browser
src/lib/storage.js      the three storage categories (= Shopify's Storage type choices) and their copy
src/lib/business.js     business facts the pages state; null = not confirmed = left off. The contact email.
src/layouts/Site.astro  <head> (incl. the cart's public settings), nav + ☰ menu + cart count, footer, .page root
src/components/         VehiclePicker.astro, KitCard.astro, StorageCard.astro
src/scripts/kits-picker.js     the cascading picker in the browser (Kits pages AND Home)
src/scripts/add-to-cart.js     Add to cart + live stock check (kits and storage)
src/scripts/cart-page.js       fills in /cart
src/scripts/cart-count.js      the nav's cart count, every page
src/scripts/nav-menu.js        the ☰ menu at phone width, every page
src/scripts/storage-sort.js    "Sort by" on a storage category page
src/scripts/contact-form.js    the /about contact form
src/styles/site.css     Phase 1 shared stylesheet — ported byte-for-byte, never edited
src/styles/shared/site-additions.css  every-page additions the hi-fi didn't design: ☰ menu, Cart
                        pill at 0 items, [hidden]. Loaded right after site.css.
src/styles/pages/       per-route stylesheets (Phase 4/5/6 additions at the end of each, marked)
src/styles/shared/      components used by 2+ routes: cta-banner, notice, filter-panel, prod, form-grid
docs/organizeyournuts-hifi.html   the signed-off design; visual regression reference (permanent)
docs/PHASE-2-SHOPIFY-CHECKLIST.md exact Shopify identifiers (metaobject, metafields, handles)
```

## Validate fitment data

```bash
npm run validate-fitment
```

Checks `fitment/vehicle-map.json` against `fitment/platforms.json`: unknown or misspelled platform
handles, blank fields, backwards year ranges, two rules claiming the same vehicle for different
platforms, unreachable platforms, engine names spelled two ways. Runs on every pull request
(`.github/workflows/validate-fitment.yml`) and at the start of every build. The *live* checks —
every handle exists in Shopify, every platform has at least one kit — run at build time in
`src/lib/shopify.js`, because they need the token.

## Storefront API version

Pinned in `src/lib/shopify.js` (`STOREFRONT_API_VERSION`). Bump it and redeploy every ~6 months
(ADR-001 §6). Shopify releases quarterly and retires versions after a year.

## Launch

Decided 2026-10-04 (recorded in ADR-001 §6 and §7): **free returns for any reason within 30 days**;
**Google Search Console + Vercel Web Analytics**; a **hand-written sitemap**; the fallback store is
**Horizon** (Shopify's default theme, already live). Products are on the Online Store, Point of Sale and
Headless channels only (Shop and Microsoft Copilot removed 2026-10-04). Shopify ships to the **48
contiguous states + Washington, D.C.** only (Domestic zone set 2026-10-04, matching the Shipping
policy); rates are Standard $8, free at $70+, Express $15.

What the code does for launch:

- **Footer "Shipping · Returns · Privacy"** link to Shopify's own policy pages. The build asks Shopify
  for the addresses (`fetchPolicies` in `src/lib/shopify.js`), so nobody types them and they follow the
  store's primary domain. A policy that isn't written yet stays plain text and the build prints a ⚠
  line saying which. It never fails the build.
- **`/sitemap.xml` + `robots.txt`** — see the route table above.
- **Vercel Web Analytics**: one script tag in `Site.astro`, only in builds on Vercel. It does nothing
  until Analytics is turned on in the Vercel project (Analytics tab → Enable). No cookies.

### Checklist

| # | Item | Who | Breaks if skipped |
|---|---|---|---|
| 0 | Create the business mailbox, then replace the temporary personal `email` in `src/lib/business.js` (and the contact email in Shopify's policies) | Operator creates it; code change | Shoppers' messages go to a personal inbox, and that address stays published on the site |
| 1 | Vercel plan. Hobby is non-commercial only under Vercel's terms; staying on it for now is the operator's call. Move to Pro (or Cloudflare Pages, ADR-002 §1) before it matters | Operator | Vercel may pause the project |
| 2 | Production env vars: `SHOPIFY_STORE_DOMAIN` (stays the `.myshopify.com` address), `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, `PUBLIC_SHOPIFY_STOREFRONT_TOKEN` — each ticked for **Production** | Operator (Vercel → Settings → Environment Variables) | Production build fails; last good deploy keeps serving |
| 3 | Shopify Payments active; PA sales-tax number added (Settings → Taxes and duties). Not tax advice — confirm with an accountant | Operator | No card payments; PA tax not collected |
| 4 | Policies: **Refund** (free returns, any reason, 30 days — must match the About page), **Shipping**, Terms of Service; check Privacy. Refund + Shipping drafts: [docs/POLICY-DRAFTS.md](docs/POLICY-DRAFTS.md) | Operator (Settings → Policies) | Footer words stay unlinked; no returns terms on record |
| 5 | `checkout.organizeyournuts.com`: CNAME → `shops.myshopify.com` at the registrar, then Shopify → Settings → Domains → connect, and make it the **primary** domain | Operator | Checkout shows a `myshopify.com` address |
| 6 | Horizon fallback: stays published; products stay on Online Store; its menu links to the products; hide it from Google (Online Store → Themes → Edit code → `theme.liquid`, add `<meta name="robots" content="noindex">` inside `<head>`) | Operator (the connector can't edit the live theme) | No fallback store; a duplicate store competes in search |
| 7 | Test order (below) | Operator types the card | Launching an untested checkout |
| 8 | `organizeyournuts.com` + `www` → Vercel (Vercel → Domains; DNS records exactly as Vercel shows them; `www` redirects to the bare domain) | Operator | Canonical URLs point at a domain that doesn't serve the site |
| 9 | Search Console: add a **Domain** property, verify with the DNS TXT record, submit `https://organizeyournuts.com/sitemap.xml` | Operator | No search data; slower discovery |
| 10 | Inventory → real quantities | Operator (or connector, after approval) | Everything says "Out of stock" |
| 11 | Remove the password (Online Store → Preferences) | Operator | Checkout shows a password page — nobody can buy |
| 12 | Storefront API bump `2026-07` → `2027-01` on **2027-01-15** (hard limit ≈ 2027-07-01) | Code | Build may break when 2026-07 retires |

Order: 1–4 (3 takes days) → 5 → 6 → 7 → 8 → 9 → launch day: 10 → 11.

### Launch-day runbook

1. **Inventory** — enter quantities. Check: reload a kit page; the button says "Add to cart" (no redeploy).
2. **Password off.** Check, in a private window: add a kit and a bin → Proceed to checkout → you land on
   `checkout.organizeyournuts.com` with **no password page**; a PA address shows PA tax and shipping rates.
3. *(Optional)* one real-card order, then refund it in full — proves money reaches the bank (~$0.90 in
   card fees aren't refunded).

### Rollback

| Problem | Do this | Time |
|---|---|---|
| A bad deploy | Vercel → Deployments → the last good one → **Instant Rollback** | 1 min |
| Checkout misbehaving | Turn the store password back **on** — stops all orders | 30 s |
| Site down and not fixable tonight | **Fallback:** Vercel → Domains → `organizeyournuts.com` → redirect to `https://checkout.organizeyournuts.com` (Horizon: same products, prices, checkout). Remove the redirect when fixed | 2 min |
| Checkout domain broken | Shopify → Domains → set `organizeyournuts.myshopify.com` back as primary | 2 min |
| Main domain broken | Remove it in Vercel; `organize-your-nuts.vercel.app` keeps working | 1 min |

### Test order — no real card

1. Temporarily stock **1** of "Interior Trim Clip Assortment" and the bin rack (approved change list first).
2. Shopify Payments → **test mode** on (or, if Payments isn't active yet, Settings → Payments → the
   "Bogus Gateway" for testing).
3. With the password still on, on the live site: pick a vehicle → add the kit → add the bin rack →
   checkout → Shopify's published test card, a PA address. The operator types the card.
4. Check the order in Shopify: kit line shows Year / Make / Model / Engine / Platform; bin line shows
   none; PA tax charged; shipping right; confirmation email arrived; order marked test.
5. Archive the test order, test mode off (or remove Bogus Gateway), inventory back to 0, read back.

## Dependencies

Exactly one: `astro`. No adapter (Vercel detects Astro and serves `dist/` as static files), no
integrations, no CSS tooling. Per the standing rule, anything new is named and approved first.

## Cross-page style reuse

Phase 1 flagged classes defined in one page's stylesheet but used by another. Status:

| Defined in | Also used by | Classes | Status |
|---|---|---|---|
| `shared/cta-banner.css` | Home, Hardware Kits | `.cta-banner` | **resolved in Phase 4** — moved verbatim to a shared file both routes import |
| `pages/hardware-kits.css` → `shared/notice.css` | Cart | `.notice` (Phase 4 addition) | **resolved in Phase 5** — moved unchanged to a shared file both routes import |
| `pages/hardware-kits.css` → `shared/filter-panel.css`, `shared/prod.css` | Storage sub-category | `.filter-panel`, `.filter-grid`, `.prod` | **resolved in Phase 6** — moved verbatim (with their responsive lines) to shared files both routes import |
| `pages/cart.css` | Checkout | `.summary`, `.sum-row` | moot — the designed checkout is replaced by Shopify's (ADR-001 §3.1) |
| `pages/checkout.css` → `shared/form-grid.css` | About (contact form) | `.form-grid`, `.span2` | **resolved in Phase 6** — moved verbatim to a shared file both stylesheets import |

**A hi-fi bug, fixed in Phase 6:** site.css's `a.card{display:block}` outranks the page rules
`.pillar{display:flex}` (Home) and `.stor-card{display:flex}` (Storage overview), so those cards'
designed column layout never applied — in the hi-fi too (the count and "Shop bins →" ran together on
one line). `home.css` and `storage-overview.css` each restore it with one more-specific line, marked.

See [ONBOARDING.md](ONBOARDING.md) for the full project reference and [docs/](docs/) for the design.
