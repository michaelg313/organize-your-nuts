# Refund and Shipping policy — drafts to paste into Shopify

Drafted at launch prep (2026-10-04) to match what the site already says:
**free returns for any reason within 30 days** (ADR-001 §7.5, About page) and **same-day shipping
on orders before 2pm ET, Monday–Friday** (Home and About). If you change a policy, change
`src/lib/business.js` in the same sitting so the site and the policy never disagree.

**Not legal advice.** These are plain-language drafts. Have your accountant or attorney look them
over, especially anything about refunds and sales tax in Pennsylvania.

## How to use

1. Fill every **[bracket]** below — each one is a fact only you know. Delete the bracket notes
   that start with "Choose:" once you've picked.
2. Shopify admin → **Settings → Policies** → **Refund policy** → paste the Refund text → Save.
   Same for **Shipping policy**.
3. Redeploy the site (or wait for the next merge). The footer's "Shipping" and "Returns" become
   links automatically, and the build's ⚠ line about missing policies goes away.

**Contact email:** both policies say **[support email]**. Use the business mailbox you're creating
before launch — not the temporary personal address the site uses for testing.

---

## Refund policy

### Free returns, for any reason, within 30 days

Changed your mind, ordered the wrong kit, or it just isn't what you needed? Send it back within
**30 days of delivery** and we'll refund you. You don't need to give a reason, and the return
shipping is on us.

### What we accept

- Kits and storage items that are unused and haven't been installed. Fasteners that have been
  torqued — especially torque-to-yield head bolts — are single-use and can't be resold.
- Opened bags and boxes are fine — we know you have to open the kit to check it.
- Please send back everything that came in the kit.

### How to return something

1. Email michaelg13@gmail.com with your order number. You don't need to tell us why.
2. We'll email you a **prepaid return label** within 2 business days.
3. Pack the items, attach the label, and drop the package off with the carrier.

### Your refund

- We refund the item price to your **original payment method** within 3 business days of
  the return arriving. Your bank or card company may take another 5–10 business days to show it.
- Sales tax on the returned items is refunded with them.
- Original shipping charges are refunded only when the mistake was ours (see below).

### When the mistake is ours

- **Our site said a kit fits your vehicle and it doesn't:** email us within **30 days of
  delivery** — we know fitment problems often show up partway through a build.
- **We sent the wrong item, or it arrived damaged or with parts missing:** email us within
  **7 days of delivery** (a photo helps).

Either way, we'll make it right — a replacement or a full refund **including the original
shipping** — and you won't pay for anything.

### Exchanges

We don't do direct exchanges. Return the item for a refund and place a new order for the one you
need — that way the right kit ships right away instead of waiting for your return to arrive.

### Questions

Email michaelg13@gmail.com. We reply by email.

---

## Shipping policy

### Where we ship

We currently ship to the 48 contiguous United States and Washington, D.C. We don't yet ship to
Alaska, Hawaii, US territories, military (APO/FPO) addresses, or outside the US.

### When your order ships

- Orders placed **before 2pm Eastern, Monday–Friday**, ship the **same business day**.
- Orders placed after 2pm Eastern, on a weekend, or on a US federal holiday ship the next
  business day.
- You'll get an email with tracking as soon as your order ships.

### Shipping cost and speed

- **Standard shipping is $8, and free on orders of $70 or more. Express shipping is $15.** You'll
  see the cost at checkout before you pay.
- We ship with USPS and UPS. Most orders arrive within 2–5 business days of shipping.

### Check your address

Please double-check your shipping address at checkout. If a package comes back to us because the
address was wrong or incomplete, we'll email you and reship it once you confirm the address. You
pay for the new shipping label.

### Changing or cancelling an order

Email michaelg13@gmail.com as soon as possible. Because most orders ship the same day, we can only
change or cancel an order that hasn't shipped yet. After it ships, you can return it under our
Refund policy.

### Lost, late or damaged packages

- Damaged or missing items: email us within 7 days of delivery with your order number and
  a photo, and we'll send a replacement or refund — see "When the mistake is ours" in our Refund
  policy.
- Tracking says delivered but it isn't there: check with neighbors and around your door, then
  email us within 7 days. We'll open a claim with the carrier and work it out with you.
- Late: if tracking hasn't updated in 5 business days, email us and we'll chase it.

### Questions

Email michaelg13@gmail.com. We reply by email.
