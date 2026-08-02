# OrganizeYourNuts.com

Headless-Shopify storefront, in progress. The architecture is decided and recorded in
[ADR-001-production-stack.md](ADR-001-production-stack.md) — read that first; it is authoritative.

**Current state: Phase 1 (CSS split) + fitment data scaffolding, on branch `phase-1-css-split`.**

## Run the split-check harness

The hi-fi design was split from one review file into `src/styles/site.css` (shared) plus one
stylesheet per page in `src/styles/pages/`. The harness proves the split renders identically.

```bash
npx serve -p 3000 .
```

Then open, in two browser windows side by side:

- **http://localhost:3000/docs/split-check.html** — the same markup styled by the *split* files
- **http://localhost:3000/docs/organizeyournuts-hifi.html** — the signed-off hi-fi reference

What to look for: every frame (7 templates + 4 states) should be pixel-identical between the two,
at full width and when you narrow the window through 768px and 400px. The one intended difference:
the harness has no review toolbar, so everything sits 52px higher and the sticky nav sticks to the
very top. `docs/split-check.html` is throwaway scaffolding, not a production page.
`docs/organizeyournuts-hifi.html` is permanent — it is the visual regression reference.

## Validate fitment data

```bash
npm run validate-fitment
```

Checks `fitment/vehicle-map.json` (vehicle → platform rules; **example data only** right now)
against `fitment/platforms.json` (known platform handles; a hand-maintained stub until platforms
live in Shopify metaobjects). It fails loudly, in plain English, on: unknown or misspelled platform
handles (including stray spaces and wrong capitalisation), missing or blank fields, backwards or
implausible year ranges, and two rules that claim the same vehicle/engine/years but different
platforms. The same check runs automatically on every GitHub pull request
(`.github/workflows/validate-fitment.yml`).

## Deliberately not built yet

- **No front-end framework.** The Hydrogen-vs-Astro decision is still open; Phase 1 is
  framework-agnostic on purpose. Nothing is scaffolded.
- **No front-end routes, no Shopify Storefront API code, no cart or checkout logic.** Phases 2+.
- **No real fitment data.** The three rules in `fitment/vehicle-map.json` are labelled examples.
- **No dependencies.** The validator is plain Node; the stylesheet is plain CSS
  (no framework, no preprocessor).

## Known cross-page style reuse (flagged, not fixed)

§5 of the hi-fi assigns some classes to one page that its markup also uses on another. The split
follows §5's own labels, so these work in the harness (which loads every file) but must be resolved
before routes each load only their own stylesheet — either promote the shared rules to `site.css`
or have the second page import the first page's file:

| Defined in | Also used by | Classes |
|---|---|---|
| `pages/home.css` | Hardware Kits | `.cta-banner` (the hi-fi's own comment says "shared by Home and Kits") |
| `pages/hardware-kits.css` | Storage sub-category | `.filter-panel`, `.filter-grid`, `.prod` |
| `pages/cart.css` | Checkout | `.summary`, `.sum-row` |
| `pages/checkout.css` | About (contact form) | `.form-grid`, `.span2` |

`pages/storage-category.css` is consequently near-empty: the hi-fi has no dedicated §5 block for
that template.

See [ONBOARDING.md](ONBOARDING.md) for the full project reference and
[docs/](docs/) for the design reference.
