# OrganizeYourNuts.com

Headless-Shopify storefront, in progress. The architecture is decided and recorded in three ADRs —
read them first; they are authoritative:

- [ADR-001 — production stack](ADR-001-production-stack.md): headless Shopify, kits fit *platforms*.
- [ADR-002 — front-end framework](ADR-002-frontend-framework.md): Astro, fully pre-rendered, on Vercel.
- [ADR-003 — partial-match fitment](ADR-003-partial-match-fitment.md): sub-generation platforms, fitment note as backstop.

**Current state: Phase 5 — the cart (`/cart`, "Add to cart" on the kit pages).**

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

Then open http://localhost:4321/hardware-kits. Products and platform copy come from Shopify at
build/dev time; vehicles come from `fitment/vehicle-map.json`.

```bash
npm run build
```

Runs the fitment validator, then fetches from Shopify and writes every page to `dist/`. Vercel runs
this same command on every push. **If the build fails, read the last lines of the log** — every
failure this project can produce is written in plain English and says where to fix it.

## What exists

| Route | Generated from | Notes |
|---|---|---|
| `/hardware-kits/<platform>` | one page per entry in `fitment/platforms.json`, via `getStaticPaths()` in [`src/pages/hardware-kits/[platform].astro`](src/pages/hardware-kits/[platform].astro) | Kits from Shopify (`custom.fits_platforms`), grouped by `custom.system`; empty systems omitted. SEO title/description from the Shopify Platform entry. Canonical is always the bare URL. |
| `/hardware-kits` | [`src/pages/hardware-kits/index.astro`](src/pages/hardware-kits/index.astro) | The design's "no vehicle set" state: the picker plus links to every platform page. |
| `/cart` | [`src/pages/cart.astro`](src/pages/cart.astro), filled in by [`src/scripts/cart-page.js`](src/scripts/cart-page.js) | Hi-fi template ⑤ and its empty state. Not indexed (`noindex`). "Proceed to checkout" hands off to Shopify's checkout. |

Vehicle state: the URL is authoritative (`?year=&make=&model=&engine=`, slugged); a chosen vehicle
always lands on *its* platform's page; `localStorage` only re-fills the form on a return visit.
The dropdowns are **derived** from `fitment/vehicle-map.json` in [`src/lib/fitment.js`](src/lib/fitment.js) —
never hand-maintained.

Home, Hardware Storage, About: not built (Phase 6). The nav links to them so the chrome matches
the design; they 404 today.

## The cart

The one interactive part of the site (ADR-002 §1): a small hand-written Storefront API client in
[`src/lib/cart.js`](src/lib/cart.js), no SDK. Shopify holds the cart; the browser only remembers
its ID (`localStorage` key `oyn.cart`).

- **Add to cart** (kit pages, [`src/scripts/add-to-cart.js`](src/scripts/add-to-cart.js)) needs a
  vehicle. Without one, the button scrolls to the picker: "Choose your vehicle first — we note it
  on your order."
- **Kit lines carry the vehicle** as line-item attributes — `Year`, `Make`, `Model`, `Engine`,
  `Platform` — so the Shopify order and packing slip show which vehicle the kit was bought for.
  Storage lines carry none.
- **Stock is live.** A kit with no sellable stock shows "Out of stock". The page asks Shopify on
  every load, so entering inventory in the admin turns the button on without a redeploy.
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
src/layouts/Site.astro  <head> (incl. the cart's public settings), nav + cart count, footer, .page root
src/components/         VehiclePicker.astro, KitCard.astro
src/scripts/kits-picker.js     the cascading picker in the browser
src/scripts/add-to-cart.js     kit-page Add to cart + live stock check
src/scripts/cart-page.js       fills in /cart
src/scripts/cart-count.js      the nav's cart count, every page
src/styles/site.css     Phase 1 shared stylesheet — ported byte-for-byte
src/styles/pages/       per-route stylesheets (Phase 4/5 additions at the end of each, marked)
src/styles/shared/      cta-banner.css (Home, Kits), notice.css (Kits, Cart)
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
| `pages/hardware-kits.css` | Storage sub-category | `.filter-panel`, `.filter-grid`, `.prod` | open — resolve when the Storage pages are built (Phase 6) |
| `pages/cart.css` | Checkout | `.summary`, `.sum-row` | moot — the designed checkout is replaced by Shopify's (ADR-001 §3.1) |
| `pages/checkout.css` | About (contact form) | `.form-grid`, `.span2` | open — resolve when About is built (Phase 6) |

See [ONBOARDING.md](ONBOARDING.md) for the full project reference and [docs/](docs/) for the design.
