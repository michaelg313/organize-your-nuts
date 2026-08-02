# OrganizeYourNuts.com — Project Reference

## What This Is
An e-commerce store selling hardware fasteners (nuts, bolts, screws, washers, and assorted hardware kits). The site is built as a static HTML/CSS project — no frameworks, no build step.

---

## Key Links
| Resource | URL |
|---|---|
| GitHub Repo | https://github.com/michaelg313/organize-your-nuts |
| Figma Wireframes | https://www.figma.com/design/KCqnAMw17qf5gR4gfZAFzJ |
| Local project path | `C:\Users\13135\OneDrive\Desktop\Claude Code Projects\Landing Page` |

---

## Running the Site Locally
The dev server is pre-configured. From the project root (`Claude Code Projects`):
```
serve "Landing Page" --listen 3000
```
Or use the launch config — Claude Code will offer to start it automatically via `.claude/launch.json`.

Open: **http://localhost:3000**

---

## File Structure
```
Landing Page/
├── index.html                        # Main landing page (logo embedded as base64)
├── engine-hardware-kits.html         # Engine Hardware Kits product category page
├── engine-hardware-kits-wireframe.html  # Standalone HTML wireframe (desktop + mobile toggle)
├── organizeyournuts.jpg              # Logo / brand badge image
└── ONBOARDING.md                     # This file
```

---

## Pages

### 1. Landing Page (`index.html`)
The main store page. Sections top to bottom:

| # | Section | Notes |
|---|---|---|
| 1 | **Nav** | Sticky, logo + "Shop Now" CTA. Gains solid bg on scroll. |
| 2 | **Hero** | Headline, subheading, dual CTAs, trust badges, floating logo image |
| 3 | **Value Strip** | 3 cards: Top-Quality Fasteners, Fast Shipping, Bulk Discounts |
| 4 | **Categories** | 4 cards — Engine Hardware Kits links to page 2; others link to #cta |
| 5 | **Why Us** | 3 numbered reasons: Selection, Pricing, Shipping |
| 6 | **CTA Banner** | Orange gradient, "Shop All Products" + "View Bulk Pricing" |
| 7 | **Footer** | Logo, copyright, nav links |

**Note:** `index.html` is large (~685KB) because the logo image is base64-embedded directly in the HTML to avoid path issues in different serving environments.

---

### 2. Engine Hardware Kits (`engine-hardware-kits.html`)
Product category page reached by clicking "Browse Engine Hardware Kits →" on the landing page.

| # | Section | Notes |
|---|---|---|
| 1 | **Nav** | "← Back to Store" link + "Order Now" CTA |
| 2 | **Page Hero** | Breadcrumb, eyebrow pill, H1, 3 feature badges |
| 3 | **What's Included** | 8 cards covering every component in an engine kit |
| 4 | **Shop Kits** | Filter bar (All / SB V8 / BB V8 / 4-Cyl / Diesel) + 6 product cards |
| 5 | **CTA Banner** | "Not Sure Which Kit?" + Contact Us / Back to Store |
| 6 | **Footer** | Links back to index.html |

**What's in an engine hardware kit:**
Head bolts/studs, main cap bolts, connecting rod bolts, intake manifold studs, exhaust header bolts, cam & timing hardware, oil pan & valley cover bolts, accessory & dress fasteners.

**Product kits available:**
- Small Block Chevy Complete Engine Kit — $89.99 (Best Seller)
- LS Engine Complete Hardware Kit — $109.99
- Big Block Chevy Hardware Kit — $119.99 (New)
- Small Block Ford Complete Engine Kit — $94.99
- Import 4-Cylinder Engine Kit — $74.99
- Diesel Engine Hardware Kit — $149.99 (Heavy Duty)

---

### 3. EHK Wireframe (`engine-hardware-kits-wireframe.html`)
A grayscale HTML wireframe of the Engine Hardware Kits page for design reference alongside Figma.
- Toggle between **Desktop** and **Mobile** views with the toolbar at the top
- Each section is numbered and annotated (① Nav through ⑥ Footer)
- Links to both the live page and the landing page wireframe

---

## Categories on the Landing Page
| Card | Links To | Status |
|---|---|---|
| Engine Hardware Kits | `engine-hardware-kits.html` | ✅ Page built |
| Bolts & Screws | `#cta` (placeholder) | 🔲 Page not yet built |
| Washers & More | `#cta` (placeholder) | 🔲 Page not yet built |
| Nutsacks | `#cta` (placeholder) | 🔲 Page not yet built |

---

## Branding & Design System

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `--orange` | `#FF8C00` | Primary CTAs, accents, links |
| `--orange-light` | `#FF9F1C` | Gradient end on buttons |
| `--orange-dim` | `rgba(255,140,0,0.12)` | Icon box backgrounds |
| `--orange-border` | `rgba(255,140,0,0.35)` | Icon box borders |
| `--bg-deep` | `#0c1120` | Page background |
| `--bg-mid` | `#111827` | Alternating section background |
| `--bg-card` | `#161f34` | Card backgrounds |
| `--text-primary` | `#f0f4ff` | Main text |
| `--text-muted` | `#8fa0c0` | Secondary text, labels |

### Typography
- **Font:** Inter (Google Fonts)
- **Weights used:** 400 (Regular), 500, 600 (Semi Bold), 700 (Bold), 800 (Extra Bold), 900

### Key Design Patterns
- Cards: `border-radius: 12px`, `border: 1px solid rgba(255,255,255,0.06)`, hover lifts with `translateY(-4px)`
- Icon boxes: 44×44px (small) or 64×64px (large), `border-radius: 10–16px`, orange tint background
- Buttons: 8px radius, orange gradient for primary, transparent + orange border for outline
- Section headers: Small uppercase label in orange → large Extra Bold H2 → muted subheading
- Sticky nav: Frosted glass at top, solid dark background after 20px scroll

---

## Responsive Breakpoints
| Breakpoint | Behavior |
|---|---|
| `> 768px` | Full desktop layout |
| `≤ 768px` | Single column, stacked CTAs, full-width buttons |
| `≤ 400px` | Smaller H1, brand name hidden in nav |

---

## Figma Wireframes
**File:** [OrganizeYourNuts — Landing Page Wireframes](https://www.figma.com/design/KCqnAMw17qf5gR4gfZAFzJ)
**Team:** Squirrel Team 6

| Figma Page | Contents |
|---|---|
| Landing Page | Desktop (1440px) + Mobile (390px) wireframes of `index.html` |
| Engine Hardware Kits | To be added — use `engine-hardware-kits-wireframe.html` in the meantime |

**Prototype connections wired:**
- Landing page "Engine Hardware Kits" card → EHK desktop frame
- Landing page mobile EHK card → EHK mobile frame
- EHK "← Back to Store" → Landing page frames

---

## Git & GitHub

**Repo:** https://github.com/michaelg313/organize-your-nuts
**Branch:** `master`
**Auth:** GitHub CLI (`gh`) authenticated as `michaelg313`

```bash
# Push changes
cd "C:\Users\13135\OneDrive\Desktop\Claude Code Projects\Landing Page"
git add <files>
git commit -m "your message"
git push origin master
```

**Commit history:**
- `005d0ef` — Add Engine Hardware Kits page and update category links
- `8233ae7` — Initial commit: OrganizeYourNuts.com landing page

---

## What's Next (Suggested)
- [ ] Build category pages for Bolts & Screws, Washers & More, and Nutsacks
- [ ] Add Figma Page 2 (Engine Hardware Kits wireframe) — requires Figma plan upgrade for MCP
- [ ] Add product images to replace placeholder icon boxes on EHK page
- [ ] Wire up "Contact Us" and "View Bulk Pricing" CTAs
- [ ] Add a shopping cart flow
