# OrganizeYourNuts.com — Project Reference

## What This Is
An e-commerce store selling automotive fastener kits (matched to vehicle platforms) and hardware
storage. The production architecture is **headless Shopify**: Shopify owns catalog, orders,
payments and checkout; a custom static-first front end owns presentation, fitment logic and the
indexable per-platform URLs. That decision, and everything downstream of it, is recorded in
[ADR-001-production-stack.md](ADR-001-production-stack.md) — **the ADR is authoritative**.

**Where the build is right now: Phase 1 complete on branch `phase-1-css-split`** — the signed-off
hi-fi CSS has been split into production stylesheets, and the fitment data layer is scaffolded
(schema + validator + CI, example data only). No framework, routes, or Shopify API code yet.

---

## Key Links
| Resource | URL |
|---|---|
| GitHub Repo | https://github.com/michaelg313/organize-your-nuts |
| Figma Wireframes | https://www.figma.com/design/KCqnAMw17qf5gR4gfZAFzJ |
| Local project path | `C:\Users\13135\OneDrive\Desktop\Claude Code Projects\Landing Page` |

---

## Branches
| Branch | Contents |
|---|---|
| `master` | Pre-Phase-1 state (old flat static pages, now archived) |
| `phase-1-css-split` | **Current work.** CSS split + fitment scaffolding. Merge via PR when reviewed. |

---

## Running Things Locally

Everything runs from the project root. No install step — there are no dependencies.

**Serve the project** (any static server works; `serve` is what's configured):
```bash
npx serve -p 3000 .
```

**Compare the CSS split against the signed-off design** — open both in side-by-side windows:
- http://localhost:3000/docs/split-check.html (split stylesheets, throwaway harness)
- http://localhost:3000/docs/organizeyournuts-hifi.html (the hi-fi reference)

They should be pixel-identical (the harness just sits 52px higher — no review toolbar).
Narrow the window through 768px and 400px to check responsive behaviour.

**Validate fitment data:**
```bash
npm run validate-fitment
```

---

## File Structure
```
Landing Page/
├── ADR-001-production-stack.md   # THE architecture record — read first
├── README.md                     # Quick start: harness, validator, what's not built
├── ONBOARDING.md                 # This file
├── WIREFRAME-CHANGELOG.md        # Design-phase decision log
├── package.json                  # npm scripts only — zero dependencies
├── src/styles/
│   ├── site.css                  # Shared: §1 tokens, §2 base/type, §3 components,
│   │                             #   .page app shell, shared @container rules
│   └── pages/                    # One stylesheet per template (§5 split):
│       ├── home.css              #   / (+ hero entrance motion)
│       ├── hardware-kits.css     #   /hardware-kits
│       ├── storage-overview.css  #   /hardware-storage
│       ├── storage-category.css  #   /hardware-storage/<category> (near-empty; see README)
│       ├── cart.css              #   /cart
│       ├── checkout.css          #   /checkout (mostly superseded by Shopify checkout, ADR §3.1)
│       └── about.css             #   /about
├── docs/
│   ├── organizeyournuts-hifi.html  # PERMANENT visual regression reference — do not delete
│   └── split-check.html            # Throwaway comparison harness
├── fitment/
│   ├── vehicle-map.json          # Vehicle → platform rules (EXAMPLE DATA ONLY so far)
│   └── platforms.json            # Known platform handles (stub until Shopify metaobjects)
├── scripts/
│   └── validate-fitment.mjs      # Plain-Node validator, human-readable errors
├── .github/workflows/
│   └── validate-fitment.yml      # Runs the validator on every pull request
├── organizeyournuts-hifi.html    # Root copy of the hi-fi (docs/ copy is the reference)
├── organizeyournuts-wireframe.html / organizeyournuts-midfi-wireframe_2.html  # Design history
└── archive/                      # The old flat static site, kept for history
```

---

## CSS Architecture (Phase 1)

The hi-fi stylesheet was organised for this split and was moved, not rewritten:

- **`site.css`** = §1 TOKENS + §2 BASE/TYPE + §3 COMPONENTS, **verbatim** — no renaming,
  reordering, or consolidation. Plus the `.page` app-shell rule and the *shared* responsive rules.
- **`pages/*.css`** = §5 page blocks, verbatim, one file per template, plus each page's own
  selectors from the hi-fi's combined `@container` blocks.
- **§4 review chrome** (toolbar, frame, device toggle) was deleted. Its token `--tb-h` is kept
  at `0px` because §2/§5 rules reference it.
- **Responsive is container queries against `.page`** — breakpoints 768px and 400px, *not*
  viewport media queries. `.page` is the app shell wrapper and carries
  `container-type:inline-size`. This is why the old Desktop/Mobile toggle and a real phone hit
  the same code path. **Keep it that way.**
- Some classes are defined in one page's file but used on another page in the hi-fi markup —
  flagged, not fixed. The list lives in [README.md](README.md#known-cross-page-style-reuse-flagged-not-fixed).

Every page needs: `site.css` first, then its own `pages/<page>.css`.

---

## Fitment Data (ADR §2.4, §5 Phase 3)

Two kinds of data, two homes:
- **SKU → platform links** will live in Shopify metaobject references (picked from a list, typo-proof).
  Not built yet — Phase 2.
- **Vehicle → platform rules** live in `fitment/vehicle-map.json` in this repo, because they carry
  real logic (year ranges, engine disambiguation) and a wrong rule is somebody's disassembled
  engine. Rule shape: `make + model + year_start..year_end + engine → platform handle`.

`scripts/validate-fitment.mjs` refuses: unknown/misspelled platform handles (with plain-language
hints — stray spaces, capitalisation, near-miss typos), missing or blank fields, backwards or
implausible year ranges, and two rules that give the same vehicle/engine/year different platforms.
It runs on every PR via GitHub Actions. Platform handles are checked against
`fitment/platforms.json`, a hand-maintained stub **until** platforms live in Shopify metaobjects
(TODO marked in the file — no Shopify API code in Phase 1).

**The three rules currently in `vehicle-map.json` are labelled examples, not real fitment data.**

---

## Branding & Design System

Design tokens live in `src/styles/site.css` §1 and are the single source of truth
(`--orange #FF8C00`, `--bg-deep #0c1120`, Inter 400–900, 12px card radius, 8px button radius,
container-query breakpoints 768px/400px). The full signed-off design — 7 templates plus empty,
partial, and error states — is `docs/organizeyournuts-hifi.html`.

---

## What's Next (per ADR §5)
- [ ] **Decide the front-end framework** — Hydrogen+Oxygen vs Astro+static host. Deliberately
      not chosen in Phase 1; take it back to the architecture discussion.
- [ ] Phase 2 — model platforms + SKUs in Shopify (metaobjects, metafields, 3–4 platforms, ~10 SKUs)
- [ ] Phase 3 — author the real vehicle map (validator is ready for it)
- [ ] Phase 4 — first production page: `/hardware-kits/<platform>`
- [ ] Phase 0 in parallel — PA entity + sales tax license (gates taking money; needs an accountant)
