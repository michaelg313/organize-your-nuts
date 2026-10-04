/**
 * storage.js — the three Hardware Storage categories (Phase 6).
 *
 * `value` is the exact `custom.storage_type` choice on a Shopify product
 * (docs/PHASE-2-SHOPIFY-CHECKLIST.md, Part I) and is also the URL:
 * /hardware-storage/<value>. The two lists must match; Shopify's pick-list
 * stops a typo on the product side, and the build refuses a value it doesn't
 * know (src/lib/shopify.js).
 *
 * Storage isn't vehicle-specific (ADR-001 §7.11): no platforms, no system,
 * no vehicle on the cart line.
 *
 * Copy here describes the category, not products we don't sell — a category
 * with no products shows "Coming soon" (operator's decision, Phase 6).
 */

export const STORAGE_TYPES = [
  {
    value: "bins",
    title: "Bins",
    one: "bin",
    many: "bins",
    blurb: "Bins and bin racks for bulk nuts, bolts and washers.",
    lede: "Bins and bin racks for bulk fasteners — the hardware that comes out of a kit and needs somewhere to live.",
  },
  {
    value: "organizers",
    title: "Organizers",
    one: "organizer",
    many: "organizers",
    blurb: "Compartment organizers for small fasteners, clips and washers.",
    lede: "Compartment organizers for small fasteners, clips and washers.",
  },
  {
    value: "cases",
    title: "Cases",
    one: "case",
    many: "cases",
    blurb: "Hard cases for hardware that travels between the bench and the truck.",
    lede: "Hard cases for hardware that travels between the bench and the truck.",
  },
];

/** The category for a `custom.storage_type` value, or null. */
export function storageType(value) {
  return STORAGE_TYPES.find((t) => t.value === value) ?? null;
}

/** "1 bin" / "3 bins" */
export function countLabel(type, n) {
  return `${n} ${n === 1 ? type.one : type.many}`;
}
