I'm continuing the production build of OrganizeYourNuts.com. This is Phase 2 — modeling the data
in Shopify — and this session covers **Part D only**: the `System` product metafield.

Read these first, in full, in this order. They are authoritative; if something I ask for
contradicts them, stop and tell me rather than guessing:

1. `ADR-001-production-stack.md` — the architecture (headless Shopify, per-platform fitment).
   §2.4 and §5 Phase 2 are the relevant sections. Note that §5 Phase 2 says the five systems are
   "the five result groupings — never URLs."
2. `ADR-002-frontend-framework.md` — Astro is decided; **do not scaffold it in this session**.
3. `docs/PHASE-2-SHOPIFY-CHECKLIST.md` — the working document. Parts A–C are ticked off with
   recorded values. Part D is the section for today.

### State of the build when this chat starts

- `master` contains both ADRs, the Phase 1 CSS split, the fitment scaffolding
  (`fitment/platforms.json`, `fitment/vehicle-map.json`, `scripts/validate-fitment.mjs`,
  `npm run validate-fitment`, and a GitHub Actions check on PRs), the Phase 2 checklist, and the
  carry-over prompts for the Part C and Part D sessions. There are no open PRs and no working
  branches (if `git status` disagrees, tell me before doing anything). The repo has zero npm
  dependencies, deliberately.
- The Shopify trial store exists and I'm logged into the admin.
- **Part A is done:** the `Platform` metaobject definition exists, type identifier `platform`,
  with fields Name (required), Description, SEO title, SEO description, Notes. Storefronts access
  is enabled. "Web pages" is off.
- **Part B is done:** three Platform entries exist, all Active, with handles that match
  `fitment/platforms.json` character for character:
    - `Small-Block Chevy — Gen I` → `sbc-gen1`
    - `GM LS — Gen III` → `ls-gen3`
    - `Toyota 3RZ-FE 2.7L I4` → `toyota-3rz`
- **Part C is done:** product metafield `Fits platforms`, namespace and key exactly
  `custom.fits_platforms`, type *List* of `platform` metaobject references, Storefront API access
  on, definition pinned. Recorded in the checklist for Phase 4.
- Parts E and F have not been started.

### Task — walk me through Part D

I do the clicking; the checklist is the script. Your job is to guide me screen by screen, answer
questions as they come up, explain anything in the Shopify admin that doesn't match the checklist,
and troubleshoot **in plain language** — I cannot read stack traces or error dumps, so tell me
what's wrong and what to do about it.

Part D creates a product metafield named `System`: **Single line text**, **one value** (not a
list — a kit belongs to exactly one system), with a validation rule limiting it to exactly these
five preset choices and nothing else:

```
engine
transmission
steering-suspension
diff-axle
body-trim
```

Storefronts access enabled. Before I click Save, remind me which settings are permanent after
saving (the namespace/key and the content type) so I check them first. When it's saved, ask me
for the exact namespace and key Shopify generated (expected `custom.system`) and for the list of
preset choices as saved, so you can verify them character for character against the five above.
Then record the confirmed values in the checklist the same way Parts A–C were recorded — on a
branch, with a PR, after running `npm run validate-fitment`.

Do not enter credentials or payment details for me, ever. If I get stuck, I may share a
screenshot or my screen via the Chrome tools — look, don't drive, unless I explicitly ask.

### Hard scope limits

- Part D only. Do not run ahead into Part E or F — I'll start those in their own sessions.
- No Storefront API code and no API tokens (that's Phase 4). No Astro scaffolding. No front-end
  routes. No cart/checkout logic. No real fitment data authoring (Phase 3 — the three example
  rules in `vehicle-map.json` stay examples unless I say otherwise).
- The five system values are fixed by ADR-001. If Shopify won't accept one of them as written
  (for example, if it objects to hyphens), stop and tell me — don't substitute a different
  spelling.
- Ask before adding any dependency, and tell me what it's for.
- Never commit to `master` — branches and PRs only. I approve merges.
- If anything I create in Shopify ends up differing from the repo, don't silently fix it: tell
  me, and we'll sync on a branch with a PR after `npm run validate-fitment`.
- ADR-001 §7.1 (partial-match behavior) is deliberately undecided and comes due before Phase 3.
  Flag it if it becomes relevant; don't decide it for me.
- ADR-001 §7.10 (the Engine / Engines naming collision — the filter field vs. the `engine`
  system grouping) is also undecided and is a copywriting problem, not a data-model one. The
  metafield value stays `engine` regardless.
- If you find yourself about to do something not on this list, stop and ask.

When we're done, tell me: what state Shopify is in, anything flagged rather than fixed, whether
the repo needs any change, and what's next in the phase plan. Then give me a prompt for Part E to
use in a separate chat.
