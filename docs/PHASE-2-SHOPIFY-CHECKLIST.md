# Phase 2 — Shopify Data Model, Click by Click

Per [ADR-001](../ADR-001-production-stack.md) §5 Phase 2. This is all done in the Shopify admin in
a browser — **no code, no deploy**. Budget roughly an hour the first time.

Menu names below match Shopify's current admin (verified against Shopify's help docs). If a label
differs slightly, it's the same screen — Shopify renames "Custom data" / "Metafields and
metaobjects" from time to time.

**Before you start:** you need a Shopify store (the trial from Phase 0 is fine). Log in at
https://admin.shopify.com. Stay on the trial or monthly billing — per ADR-001, don't commit to
annual until the front end proves out.

---

## Part A — Create the `platform` metaobject definition (once)

This is the "what is a platform" template. The entries (SBC Gen I, LS Gen III…) come in Part B.

- [x] 1. In the admin's left sidebar, click **Settings** (gear icon, bottom-left).
- [x] 2. Click **Metafields and metaobjects** (may be labelled **Custom data**).
- [x] 3. Under **Metaobjects**, click **Add definition**.
- [x] 4. In the *Name* box type exactly: `Platform`
      Shopify auto-generates the type identifier `platform` — **check it says `platform`**,
      lowercase, no extra characters. This exact string is what the code will query later.
- [x] 5. Add the fields, one at a time, by clicking **Add field**:

  | # | Field label | Type to pick | Settings |
  |---|---|---|---|
  | 1 | `Name` | Single line text | Mark **required** (the asterisk). Shopify uses the first text field as the entry's display name — this is it. |
  | 2 | `Description` | Multi-line text | Shopper-facing description of the platform. |
  | 3 | `SEO title` | Single line text | Page title for the future `/hardware-kits/<platform>` page. |
  | 4 | `SEO description` | Single line text | Meta description for that page. |
  | 5 | `Notes` | Multi-line text | Internal only — "which years/engines this covers," reminders to yourself. |

- [x] 6. In the **Access** section, make sure **Storefronts** is toggled **on**. This is what lets
      the future Astro front end read platforms through the Storefront API. (ADR-001: "Mark
      *Storefronts*.")
- [x] 7. Ignore the **Web pages** feature (publishing entries as standalone Shopify pages) — our
      platform pages come from the Astro front end, not Shopify.
- [x] 8. Click **Save**.

> **Done 2026-08 — recorded for Phase 4:** metaobject type identifier is `platform`.

---

## Part B — Create the platform entries (3–4 of them)

- [x] 1. Left sidebar → **Content** → **Metaobjects** → click **Platform**.
- [x] 2. Click **Add entry**. Fill in the fields, then — **the part that matters most** — set the
      entry's **handle** so it *exactly* matches [`fitment/platforms.json`](../fitment/platforms.json):
      lowercase, hyphens, no spaces. The handle is usually shown near the top of the entry (often
      behind a small edit/pencil control). Shopify auto-generates it from the name; fix it if it
      differs.

  | Name to enter | Handle — must be exactly | 
  |---|---|
  | `Small-Block Chevy — Gen I` | `sbc-gen1` |
  | `GM LS — Gen III` | `ls-gen3` |
  | `Toyota 3RZ-FE 2.7L I4` | `toyota-3rz` |

  (If you'd rather launch with different platforms, that's fine — but then update
  `fitment/platforms.json` and `fitment/vehicle-map.json` to match, and run
  `npm run validate-fitment`. The two lists must agree, character for character.)

- [x] 3. Write a sentence or two of Description, the SEO title/description, any Notes.
- [x] 4. Set the entry's status to **Active** (not Draft), then **Save**.
- [x] 5. Repeat for each platform.

> **Done 2026-08:** all three entries exist, Active, handles verified against
> `fitment/platforms.json` character for character.

> **Why handles are sacred:** the repo's vehicle-map rules point at these handles, and the CI
> validator refuses anything that doesn't match. `ls-gen3` with a trailing space or `LS-Gen3`
> is a different string and will (correctly) fail the build.

---

## Part C — Product metafield: `Fits platforms` (once)

This is what makes SKU→platform links *picked from a list* instead of typed — a typo becomes
structurally impossible (ADR-001 §2.4).

- [x] 1. **Settings** → **Metafields and metaobjects**.
- [x] 2. This time, under **Metafields**, choose **Products** → **Add definition**.
- [x] 3. Name: `Fits platforms`. Shopify generates a namespace/key like `custom.fits_platforms` —
      the default is fine; just note down what it says (the front end will need it in Phase 4).
- [x] 4. For the content type, pick **Metaobject** from the type list, then choose **Platform**
      as the referenced metaobject.
- [x] 5. Click **One value** and change it to **List of values** — a kit can fit several platforms.
      **This cannot be changed after Save** — if it's saved as one value, delete the definition
      and recreate it.
- [x] 6. In **Access**, enable **Storefronts**. (On the saved definition's page this toggle is
      labelled **Storefront API access** — same setting.)
- [x] 7. **Save**.

> **Done 2026-09-12 — recorded for Phase 4:** namespace and key are exactly
> **`custom.fits_platforms`**. Type is *List* of `platform` metaobject references. Storefront API
> access is on. The "Filter on the product list" and "Use as a condition in collections" options
> are off, deliberately — platform pages come from Astro, not Shopify collections.

---

## Part D — Product metafield: `System` (once)

The five result groupings on the Kits page (never URLs — ADR-001 §5 Phase 2). ADR-001 allowed
"metafield or tag"; use a metafield with preset choices — same typo-proofing logic as Part C.

- [x] 1. **Settings** → **Metafields and metaobjects** → **Products** → **Add definition**.
- [x] 2. Name: `System` (namespace/key will be like `custom.system` — note it down).
- [x] 3. Content type: open the type picker and, directly beneath **Single line text**, pick
      **Choice list (Single line text)**. Keep it **One value** — a kit belongs to one system.
      (Older admin versions had this as a *Limit to preset choices* checkbox under Validation;
      the current admin exposes it as this type variant instead. Same underlying type.)
- [x] 4. The **Validation** section now shows a list of choice rows. Use **Add item** to enter
      exactly these five values, one per row:
      ```
      engine
      transmission
      steering-suspension
      diff-axle
      body-trim
      ```
- [x] 5. Under **Options**, turn on **Storefront API access** (this is the *Storefronts* access
      toggle). Leave *Filter on the product list*, *Use as a condition in collections*, and
      *Filter or group data in Analytics* off.
- [x] 6. **Save**.

> **Done 2026-09-12 — recorded for Phase 4:** namespace and key are exactly
> **`custom.system`**. Type is *One* value, **Choice list (Single line text)** — i.e. a
> single-line text field limited to preset choices. The five choices, verified character for
> character against ADR-001 §5 Phase 2: `engine`, `transmission`, `steering-suspension`,
> `diff-axle`, `body-trim`. Storefront API access is on; the other three Options toggles are
> off, deliberately. Definition is pinned so it shows on the product page in Part E.

> Storage products (bins, organizers, cases) get **neither** metafield — they aren't
> vehicle-specific (ADR-001 §7.11). Leave both blank on those.

---

## Part E — Create ~10 products

Enough to build against, not a data-entry project. Skip photos for now (they're Phase "photography
is the critical path" — ADR-001 §6). Prices below are the hi-fi's placeholder prices; change any
you already know are wrong.

For each: left sidebar → **Products** → **Add product** → enter title, a short description, and
price → set status **Active** → then scroll to the **Metafields** section at the bottom of the
product page and set `Fits platforms` (pick from the list) and `System` (pick a preset) → **Save**.

| # | Product title | Price | Fits platforms | System |
|---|---|---|---|---|
| 1 | LS Complete Engine Hardware Kit | $109.99 | `ls-gen3` | `engine` |
| 2 | Small Block Chevy Engine Kit | $89.99 | `sbc-gen1` | `engine` |
| 3 | Import 4-Cylinder Engine Kit | $74.99 | `toyota-3rz` | `engine` |
| 4 | Cam & Timing Cover Hardware Set | $34.99 | `sbc-gen1` | `engine` |
| 5 | 6L80 Transmission Bolt Kit | $59.99 | `ls-gen3` | `transmission` |
| 6 | Steering Rack Mounting Kit | $32.99 | `ls-gen3` + `toyota-3rz` | `steering-suspension` |
| 7 | Shock & Sway Bar Bolt Set | $41.99 | `ls-gen3` + `toyota-3rz` | `steering-suspension` |
| 8 | Differential Cover Bolt Kit | $22.99 | `ls-gen3` | `diff-axle` |
| 9 | Interior Trim Clip Assortment | $19.99 | `ls-gen3` + `toyota-3rz` | `body-trim` |
| 10 | Wall-Mount Bin Rack — 12 Bins | $46.99 | *(leave blank — storage)* | *(leave blank)* |

Product #6/#7/#9 fitting multiple platforms is deliberate — it exercises the list metafield.
Product #10 is deliberate too — it proves the storage path (no fitment) works.

---

## Part F — Sanity checks when done

- [ ] Every platform entry has at least one product pointing at it (ADR-001 wants CI to catch
      zero-SKU platforms eventually; for now, eyeball it).
- [ ] Every handle in Shopify matches `fitment/platforms.json` exactly. If you changed anything,
      update the JSON and run:
      ```bash
      npm run validate-fitment
      ```
- [ ] All platform entries are **Active**, all products are **Active**.
- [ ] Both metafields and the metaobject show **Storefronts** access enabled.

**Explicitly NOT in Phase 2:** no Storefront API token, no API calls, no Astro scaffolding, no
theme work. Creating the API credential happens at the start of Phase 4, when there's code to
use it.
