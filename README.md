# OrganizeYourNuts.com

Headless-Shopify storefront, in progress. The architecture is decided and recorded in three ADRs —
read them first; they are authoritative:

- [ADR-001 — production stack](ADR-001-production-stack.md): headless Shopify, kits fit *platforms*.
- [ADR-002 — front-end framework](ADR-002-frontend-framework.md): Astro, fully pre-rendered, on Vercel.
- [ADR-003 — partial-match fitment](ADR-003-partial-match-fitment.md): sub-generation platforms, fitment note as backstop.

**Current state: Phase 6 — every template is built: Home, Hardware Kits, Hardware Storage, Cart, About/Contact.**

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

The contact form sends through **Formspree** (a form service — no code dependency, keeps the site
static per ADR-002). How it sends follows `business.js`:

- `contactFormEndpoint` set (`https://formspree.io/f/…`, public by design) → Formspree emails the
  message to the address on your Formspree account.
- only `email` set → "Send" opens the shopper's email app with the message pre-written.
- neither → the form says it isn't connected, the button is off, and **the build prints a warning**.

The form checks the fields first, the way the hi-fi's "validation errors" state shows. **When it
misbehaves:** the shopper sees one plain sentence (plus the email address, if set); the reason is in
the browser console on a line starting `[contact]`.

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
fitment/                platforms.json + vehicle-map.json — the fitment data (reviewed, CI-checked)
scripts/validate-fitment.mjs   the CI check; runs before every build
src/lib/fitment.js      dropdown derivation, slugs, vehicle → platform resolution (build + browser)
src/lib/shopify.js      the ONE Storefront API fetch per build, plus the plain-English build checks
src/lib/cart.js         the cart's Storefront API client (browser, PUBLIC token)
src/lib/display.js      system names + price format, shared by the build and the browser
src/lib/storage.js      the three storage categories (= Shopify's Storage type choices) and their copy
src/lib/business.js     business facts the pages state; null = not confirmed = left off. Contact form address.
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
