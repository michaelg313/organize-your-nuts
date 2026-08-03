# Prompt for the Phase 2 session (paste into a new chat)

I'm continuing the production build of OrganizeYourNuts.com. This session is **Phase 2: modeling
the data in Shopify** — plus landing the checklist branch left over from the last session.

Read these first, in full, in this order. They are authoritative; if something I ask for
contradicts them, stop and tell me rather than guessing:

1. `ADR-001-production-stack.md` — the architecture (headless Shopify, per-platform fitment)
2. `ADR-002-frontend-framework.md` — Astro is decided; **do not scaffold it in this session**
3. `docs/PHASE-2-SHOPIFY-CHECKLIST.md` — the working document for this session

### State of the repo when this chat starts

- `master` is at the merge of PR #2 and contains: the Phase 1 CSS split (`src/styles/site.css` +
  `src/styles/pages/*`), the split-check harness (`docs/split-check.html`), the fitment
  scaffolding (`fitment/vehicle-map.json` with 3 labelled EXAMPLE rules, `fitment/platforms.json`
  handle stub, `scripts/validate-fitment.mjs`, `npm run validate-fitment`, and a GitHub Actions
  check on PRs), and both ADRs. PRs #1 and #2 are merged; their branches are deleted.
- A local branch **`phase-2-checklist`** exists with one commit containing
  `docs/PHASE-2-SHOPIFY-CHECKLIST.md` and this prompt file. It has **not been pushed yet.**
- Vercel is connected to the GitHub repo and auto-deploys `master` plus PR previews.
- The repo has **zero npm dependencies** and that's deliberate.
- My Shopify store may or may not exist yet (Phase 0 trial) — ask me before assuming.

### Task 1 — Land the checklist branch

Push `phase-2-checklist`, open a PR into `master` (the `validate-fitment` and Vercel checks
should go green), and wait for me to say merge. After merging, delete the branch on GitHub and
locally — that's the established pattern.

### Task 2 — Support me through the Shopify admin work

I do the clicking; the checklist is the script. Your job: answer questions as they come up,
explain any Shopify screen that doesn't match the checklist, and troubleshoot **in plain
language** — I cannot read stack traces or error dumps, so tell me what's wrong and what to do.
Do not enter credentials or payment details for me, ever. If I get stuck, I may share my screen
via the Chrome tools — look, don't drive, unless I explicitly ask.

### Task 3 — Sync the repo afterwards

If the platform handles or names I actually create in Shopify differ in any way from
`fitment/platforms.json`, update `platforms.json` (and `vehicle-map.json` if affected) on a new
branch, run `npm run validate-fitment`, and PR it. The Shopify handles and the JSON must match
character for character — that invariant is the whole point of the validator.

### Ground rules (unchanged from Phase 1)

- **Hard scope limits:** no Storefront API code and no API tokens (Phase 4); no Astro
  scaffolding; no front-end routes; no cart/checkout logic; no real fitment data authoring
  (that's Phase 3 — the three example rules stay examples unless I say otherwise).
- Ask before adding any dependency, and tell me what it's for.
- Never commit to `master` — branches and PRs only. I approve merges.
- ADR-001 §7.1 (partial-match behavior) is deliberately undecided. It must be decided **before
  the second platform's real fitment data is authored** — flag it when it becomes relevant, but
  don't decide it for me.
- If you find yourself about to do something not on this list, stop and ask.

When you're done, give me: what changed in the repo, anything flagged rather than fixed, and
where that leaves the phase plan (what's next).
