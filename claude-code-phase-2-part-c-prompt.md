I'm continuing the production build of OrganizeYourNuts.com. This is Phase 2 — modeling the data
in Shopify — and this session covers **Part C only**: the `Fits platforms` product metafield.

Read these first, in full, in this order. They are authoritative; if something I ask for
contradicts them, stop and tell me rather than guessing:

1. `ADR-001-production-stack.md` — the architecture (headless Shopify, per-platform fitment).
   §2.4 and §5 Phase 2 are the relevant sections.
2. `ADR-002-frontend-framework.md` — Astro is decided; **do not scaffold it in this session**.
3. `docs/PHASE-2-SHOPIFY-CHECKLIST.md` — the working document. Part C is the section for today.

### State of the build when this chat starts

- `master` is at the merge of PR #3 and contains both ADRs, the Phase 1 CSS split, the fitment
  scaffolding (`fitment/platforms.json`, `fitment/vehicle-map.json`, `scripts/validate-fitment.mjs`,
  `npm run validate-fitment`, and a GitHub Actions check on PRs), and the Phase 2 checklist.
  There are no open PRs and no working branches. The repo has zero npm dependencies, deliberately.
- The Shopify trial store exists and I'm logged into the admin.
- **Part A is done:** the `Platform` metaobject definition exists, type identifier `platform`,
  with fields Name (required), Description, SEO title, SEO description, Notes. Storefronts access
  is enabled. "Web pages" is off.
- **Part B is done:** three Platform entries exist, all Active, with handles that match
  `fitment/platforms.json` character for character:
    - `Small-Block Chevy — Gen I` → `sbc-gen1`
    - `GM LS — Gen III` → `ls-gen3`
    - `Toyota 3RZ-FE 2.7L I4` → `toyota-3rz`
- Parts D, E, and F have not been started.

### Task — walk me through Part C

I do the clicking; the checklist is the script. Your job is to guide me screen by screen, answer
questions as they come up, explain anything in the Shopify admin that doesn't match the checklist,
and troubleshoot **in plain language** — I cannot read stack traces or error dumps, so tell me
what's wrong and what to do about it.

Part C creates a product metafield named `Fits platforms` that references the Platform metaobject
as a **list of values**, with Storefronts access enabled. When it's saved, ask me for the exact
namespace and key Shopify generated (expected to be something like `custom.fits_platforms`) and
tell me whether that needs recording anywhere for Phase 4.

Do not enter credentials or payment details for me, ever. If I get stuck, I may share my screen
via the Chrome tools — look, don't drive, unless I explicitly ask.

### Hard scope limits

- Part C only. Do not run ahead into Part D, E, or F — I'll start those in their own sessions.
- No Storefront API code and no API tokens (that's Phase 4). No Astro scaffolding. No front-end
  routes. No cart/checkout logic. No real fitment data authoring (Phase 3 — the three example
  rules in `vehicle-map.json` stay examples unless I say otherwise).
- Ask before adding any dependency, and tell me what it's for.
- Never commit to `master` — branches and PRs only. I approve merges.
- If anything I create in Shopify ends up differing from `fitment/platforms.json`, don't silently
  fix it: tell me, and we'll sync the repo on a branch with a PR after `npm run validate-fitment`.
- ADR-001 §7.1 (partial-match behavior) is deliberately undecided. Flag it if it becomes relevant;
  don't decide it for me.
- If you find yourself about to do something not on this list, stop and ask.

When we're done, tell me: what state Shopify is in, anything flagged rather than fixed, whether
the repo needs any change, and what's next in the phase plan.
