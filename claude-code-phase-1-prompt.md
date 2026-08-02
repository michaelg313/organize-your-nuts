# Claude Code — Phase 1 kickoff prompt

Paste everything below the line into Claude Code, from the project root
(`C:\Users\13135\OneDrive\Desktop\Claude Code Projects\Landing Page`).

Attach or make sure Claude Code can read: `ADR-001-production-stack.md`, `organizeyournuts-hifi.html`,
`ONBOARDING.md`, `WIREFRAME-CHANGELOG.md`.

---

## PROMPT

I'm starting the production build of OrganizeYourNuts.com. The architecture is already decided and
recorded in `ADR-001-production-stack.md` — read that file first, in full, before doing anything else.
It is authoritative. If something I ask for here contradicts it, stop and tell me rather than guessing.

**This session is Phase 1 only, plus repo scaffolding. Do not build front-end routes, do not integrate
the Shopify Storefront API, do not write cart or checkout logic, do not invent product or fitment data.**

### Context you need

- The repo today is flat static HTML/CSS with no build step, served by `serve`.
- `organizeyournuts-hifi.html` is a finished high-fidelity design pass: seven page templates in one review
  file, dark palette, Inter, container-query responsive, with complete interaction and empty/error states.
  **The design is finished and signed off. Your job is to port it, not to improve it.**
- Its stylesheet is deliberately organised for this split, and the section markers are in the file:
  - `§1 TOKENS` — shared
  - `§2 BASE + TYPE` — shared
  - `§3 COMPONENTS` — shared (buttons, cards, forms, spec plates, nav, footer, chips, states)
  - `§4 REVIEW CHROME` — **delete on split** (toolbar, frame, device simulation)
  - `§5 PAGE RULES` — one block per page

### Task 1 — Branch and safety

Create and work on a branch (`phase-1-css-split`). Do not commit to `master`. I can `git push` but I
cannot read a stack trace, so if anything errors, explain it in plain language and tell me what to do —
don't just paste the trace.

### Task 2 — Extract the stylesheet

1. Copy `organizeyournuts-hifi.html` to `docs/organizeyournuts-hifi.html` and leave it there permanently
   as the visual regression reference. Do not delete it.
2. Create `src/styles/site.css` containing **§1, §2 and §3 moved verbatim.** Verbatim means: no renaming
   of custom properties, no reordering, no consolidation of "duplicate" rules, no conversion of the
   container queries to media queries, no reformatting, no "modernising." If you believe something is a
   genuine bug rather than a choice, list it for me at the end — do not fix it inline.
3. Delete §4 entirely, including its tokens (zero them out or remove them, whichever leaves §1 coherent).
4. Split §5 into one file per template under `src/styles/pages/` — `home.css`, `hardware-kits.css`,
   `storage-overview.css`, `storage-category.css`, `cart.css`, `checkout.css`, `about.css`. Each file gets
   only the rules for that page.
5. Preserve the container-query architecture exactly. Responsive behaviour is container queries against
   `.page`, not viewport media queries, at 768px and 400px. `.page` becomes the app shell wrapper. This is
   why the old Desktop/Mobile toggle and a real phone hit the same code path, and it must stay that way.

### Task 3 — Prove the split didn't break anything

Build a temporary local harness (`docs/split-check.html`) that loads `site.css` plus each page stylesheet
and reproduces the seven templates' markup from the hi-fi file, so I can compare it side by side against
`docs/organizeyournuts-hifi.html` in a browser. Tell me exactly how to run it and what to look for. This
harness is throwaway scaffolding, not a production page.

### Task 4 — Fitment data scaffolding (schema only, no real data)

Per ADR §5 Phase 3:

1. Create `fitment/vehicle-map.json` with **two or three clearly-labelled example entries only** — I will
   author the real data. Entry shape: make, model, year range, engine, → platform handle.
2. Write `scripts/validate-fitment.mjs` that fails loudly if: a rule references a platform handle not in
   the known-platforms list, a required field is missing or blank, a year range is inverted or malformed,
   or two rules collide on the same make/model/year/engine with different platforms.
3. For now, read known platform handles from a local `fitment/platforms.json` stub. Leave a clearly marked
   TODO that this list will later come from Shopify metaobjects. **Do not write any Shopify API code.**
4. Error messages must be readable by a non-developer — e.g. `row 214: unknown platform 'sbc-gen1 '
   (note trailing space)`. That is the whole point of this validator.
5. Wire it as an npm script and as a GitHub Actions check on pull requests.

### Task 5 — Update the docs

Update `ONBOARDING.md` to reflect the new structure, the branch, and how to run things. Add a short
`README.md` covering: how to run the harness, how to run fitment validation, and what is deliberately
not built yet.

### Ground rules

- Ask before adding any dependency. I want to know what each one is for.
- No CSS framework, no Tailwind, no preprocessor. The stylesheet ports as-is.
- Don't pick the front-end framework in this session — that decision is still open (see below) and Phase 1
  is deliberately framework-agnostic. Don't scaffold Astro, Next, Hydrogen, or anything else yet.
- If you find yourself about to do something not on this list, stop and ask.

When you're done, give me: a summary of what changed, the list of anything you flagged rather than fixed,
and the exact commands to review it locally.

---

## After this session, bring back to the architecture chat

**The front-end framework is not chosen yet.** Phase 1 is framework-agnostic on purpose, so this doesn't
block you — but it's the next decision, and it's a real fork:

- **Hydrogen + Oxygen** — Shopify's own React framework and edge hosting. Hosting is included with your
  paid plan, and it has first-party cart, checkout handoff, and analytics primitives. Costs you React and
  a heavier framework to operate alone.
- **Astro + Cloudflare Pages / Netlify** — lighter, static-first, ships almost no JavaScript, and maps
  very naturally onto "pre-render one page per platform." You'd wire the Storefront API yourself.

Both can deliver the indexable per-platform URLs the ADR is built around. The tradeoff is roughly
first-party integration versus operational simplicity, and it deserves the same treatment as the rest of
the stack rather than being picked by whichever one Claude Code scaffolds first.
