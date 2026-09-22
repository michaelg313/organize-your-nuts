# OrganizeYourNuts.com

Headless-Shopify storefront, in progress. The architecture is decided and recorded in three ADRs —
read them first; they are authoritative:

- [ADR-001 — production stack](ADR-001-production-stack.md): headless Shopify, kits fit *platforms*.
- [ADR-002 — front-end framework](ADR-002-frontend-framework.md): Astro, fully pre-rendered, on Vercel.
- [ADR-003 — partial-match fitment](ADR-003-partial-match-fitment.md): sub-generation platforms, fitment note as backstop.

**Current state: Phase 4 — the first production page, `/hardware-kits/<platform>`.**

## Run it

You need Node 22+ and a `.env` file (copy `.env.example`; the two values are your store's
`.myshopify.com` address and the **private** Storefront API token from Sales channels → Headless).
`.env` is git-ignored and must stay that way — the token is a password.

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

Vehicle state: the URL is authoritative (`?year=&make=&model=&engine=`, slugged); a chosen vehicle
always lands on *its* platform's page; `localStorage` only re-fills the form on a return visit.
The dropdowns are **derived** from `fitment/vehicle-map.json` in [`src/lib/fitment.js`](src/lib/fitment.js) —
never hand-maintained.

Home, Hardware Storage, About, Cart: not built (Phases 5–6). The nav links to them so the chrome
matches the design; they 404 today.

## Where things live

```
astro.config.mjs        site URL (for canonicals), static output
vercel.json             clean URLs, no trailing slash
fitment/                platforms.json + vehicle-map.json — the fitment data (reviewed, CI-checked)
scripts/validate-fitment.mjs   the CI check; runs before every build
src/lib/fitment.js      dropdown derivation, slugs, vehicle → platform resolution (build + browser)
src/lib/shopify.js      the ONE Storefront API fetch per build, plus the plain-English build checks
src/layouts/Site.astro  <head>, nav, footer, .page container-query root
src/components/         VehiclePicker.astro, KitCard.astro
src/scripts/kits-picker.js     the cascading picker in the browser
src/styles/site.css     Phase 1 shared stylesheet — ported byte-for-byte
src/styles/pages/       per-route stylesheets (hardware-kits.css has Phase 4 additions at the end)
src/styles/shared/      cta-banner.css — used by Home and Kits
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
| `pages/hardware-kits.css` | Storage sub-category | `.filter-panel`, `.filter-grid`, `.prod` | open — resolve when the Storage pages are built (Phase 6) |
| `pages/cart.css` | Checkout | `.summary`, `.sum-row` | moot — the designed checkout is replaced by Shopify's (ADR-001 §3.1) |
| `pages/checkout.css` | About (contact form) | `.form-grid`, `.span2` | open — resolve when About is built (Phase 6) |

See [ONBOARDING.md](ONBOARDING.md) for the full project reference and [docs/](docs/) for the design.
