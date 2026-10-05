/**
 * business.js — the facts about the business that the pages state (Phase 6).
 *
 * The hi-fi's Home and About copy was written as design filler: some of it is
 * false ("1,400+ kits in stock") and some is undecided (returns — ADR-001 §7.5).
 * So every business fact the site states lives HERE, and the rule is:
 *
 *     null = not confirmed = that sentence, stat or contact row is left off.
 *
 * Nothing on a page invents a fact; numbers about the catalog (how many kits,
 * platforms, vehicles) are counted from the real data at build time instead.
 * To publish a fact: put the confirmed value here, commit, and the next
 * deploy shows it. The letters match the list the operator was asked about
 * in the Phase 6 session.
 */

export const business = {
  /** (b) Same-day shipping cutoff, e.g. "3pm ET". Shown on Home and About. */
  sameDayCutoff: null,

  /** (c) Bulk pricing starts at this many kits, e.g. 10. Home readout + About contact card. */
  bulkPricingFrom: null,

  /** (d) Returns window in days. About copy + stat. ADR-001 §7.5, decided at launch prep
   *  (2026-10-04): free returns for any reason within this many days. Keep the Refund
   *  policy in Shopify (Settings → Policies) saying the same thing. */
  returnsDays: 30,

  /** (e) Materials the kits come in, e.g. "grade-8 and stainless". Home kit card + About. */
  kitMaterials: null,

  /** (f) true once confirmed: "Every kit is assembled against the factory fastener list…" (About). */
  factoryFastenerList: false,

  /** (g) Where orders ship from, e.g. { city: "Covington", state: "Georgia" }. Footer + About. */
  shipsFrom: null,

  /** (h) The mailbox shoppers can write to, e.g. "help@organizeyournuts.com". About contact card;
   *  also where the contact form falls back to (a pre-written email) if Formspree isn't set. */
  email: null,

  /** (i) e.g. { display: "(770) 555-0142", tel: "+17705550142" }. About contact card. */
  phone: null,

  /** (j) e.g. ["Mon–Fri, 8am–6pm ET", "Sat, 9am–2pm ET"]. About contact card. */
  hours: null,

  /** (k) Street address shown on the page, e.g. ["1420 Industrial Way", "Covington, GA 30014"]. */
  address: null,

  /**
   * The contact form's Formspree address, e.g. "https://formspree.io/f/abcdwxyz".
   * Public by design (it's in the page's HTML) — not a password. Formspree
   * emails each message to the address on the Formspree account.
   */
  contactFormEndpoint: null,
};

/** How the contact form sends: "formspree", "email" (opens a pre-written email), or null (not connected). */
export function contactMode() {
  if (business.contactFormEndpoint) return "formspree";
  if (business.email) return "email";
  return null;
}
