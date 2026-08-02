# ADR-002 — Front-End Framework: Astro

**Status:** Accepted
**Date:** 2026-08-02
**Decides:** the framework for the custom storefront that ADR-001 left open. Phase 1 (the CSS
split) was deliberately framework-agnostic; this record closes that fork before Phase 2+ code.

---

## 1. Decision

**Astro**, deployed as a fully pre-rendered static site. Hosting on **Vercel**, which is already
connected to the GitHub repo and deploying `master` (ADR-001 listed Cloudflare Pages / Netlify;
Vercel occupies the same "managed static host, no server to patch" slot and is already wired —
Cloudflare/Netlify remain acceptable substitutes if Vercel ever becomes a problem).

The cart is the one interactive island: a small hand-wired Storefront API client (create cart,
add/update lines, read `cart.checkoutUrl`) per ADR-001 §5 Phase 5. Everything else ships as
static HTML with the Phase 1 stylesheets.

## 2. Reasoning

ADR-001 fixed the decision criteria; both point the same way.

1. **The binding constraint is pre-rendered, indexable per-platform pages** (ADR-001 §2.2).
   Astro's static generation over a data file (`getStaticPaths()` reading
   `fitment/vehicle-map.json` / the platform list) is literally "generate one page per platform"
   — the ADR's core mechanism is the framework's default behavior. Hydrogen renders at request
   time by default; static output is the thing to be engineered rather than the thing you get.
2. **Operator-safe failure modes** (ADR-001 §2.3). An Astro site fails at *build time*: a broken
   build fails in CI and the host keeps serving the last good deploy — a bad change cannot take
   the store down at 9pm Saturday. Hydrogen's characteristic failures (hydration mismatches,
   loader/server exceptions, framework-upgrade breakage) happen at *run time* and are diagnosed
   by reading stack traces, which is precisely the operator's weakest dimension.
3. **The design ports as-is.** Astro templates are essentially HTML; the Phase 1 container-query
   CSS and the hi-fi markup drop in with minimal translation and near-zero JavaScript shipped.
   Hydrogen would mean re-expressing the templates in React/JSX and operating React alone for no
   feature this store needs at launch scale (30–50 SKUs, ~10 orders/month).

## 3. What is being traded away

1. **Hydrogen's first-party cart/analytics primitives.** The cart is instead ~a few small GraphQL
   calls owned in this repo. Small, stable, well-documented surface; accepted.
2. **Oxygen hosting included with the Shopify plan.** Vercel's free tier covers this traffic;
   no new cost in practice.
3. **Storefront API version bumps are ours** (ADR-001 §6 already schedules this). In Astro this
   is a one-line API-version string in our own fetch wrapper — arguably *less* upgrade surface
   than Hydrogen, where the bump arrives inside framework dependency upgrades.
4. **Distance from Shopify support.** Shopify supports the checkout, orders, and API either way;
   they would not have debugged our React code on Oxygen either. Accepted.

## 4. Alternative rejected

| Alternative | Why rejected |
|---|---|
| **Hydrogen + Oxygen** | Server-rendered React framework whose strengths (personalization, sessions, first-party analytics, team-scale patterns) serve problems this store does not have, priced in operational complexity in exactly the operator's weakest dimension. Real framework churn (Remix → React Router migration) adds upgrade risk. The included hosting saves nothing once a free static host is in place. |

## 5. Consequences

- Phase 4 (`/hardware-kits/<platform>`) is built as Astro static routes generated from the
  fitment data; query-param vehicle state and `<link rel="canonical">` per ADR-001 §5 Phase 4.
- Scaffolding Astro introduces the project's first real dependencies (`astro`, the Vercel
  adapter). Per standing ground rules, each gets named and approved before it is added.
- The ADR-001 §6 fallback (minimal Dawn theme on `.myshopify.com`) is unchanged and remains the
  disaster plan.
