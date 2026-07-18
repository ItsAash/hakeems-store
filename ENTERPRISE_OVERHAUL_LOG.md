# ENTERPRISE OVERHAUL LOG — Unified Luxury Storefront, Colorway Architecture & Production Seeding

> **Date:** 2026-07-18
> **Scope:** `apps/storefront` (Next.js 16 / Tailwind v4), `apps/strapi` (Strapi 5.50), seed pipelines.
> **Reference aesthetic:** Skims / Prada / Athleta — tone-and-space hierarchy, minimalist grid, robust media.
> **Rule:** all blueprints below are compiled **before** any database operation runs. Statuses are updated in place as work lands.

---

## 0. Ground-Truth Audit (what actually exists — corrects stale plan docs)

A fresh read of the code shows `PRODUCTION_HARDENING_PLAN.md` is partially stale. Inventory:

### 0.1 Already production-grade (do NOT rebuild)
| Area | Evidence |
|---|---|
| Shadow tokens (4-step scale) | `globals.css:35-38` (`--shadow-card/raised/sticky/overlay`) |
| Font-size micro tokens | `globals.css:40-42` (`--text-3xs/2xs/sm-base`) — **defined but unused; components still hardcode `text-[10px]`/`[11px]`/`[15px]`** |
| Tracking tokens | `--tracking-eyebrow: 0.14em`, `--tracking-label: 0.1em` + `.eyebrow`/`.tracking-label` utilities |
| `LOW_STOCK` emission | `pdp.ts:40-48` `getStockLevel()` — the "never emitted" bug in the old plan is already fixed; PDP (`product-detail.tsx:152`) and cards (`product-card.tsx:126`) both render it |
| PLP color-swatch triggers | `product-card.tsx:146-171` — per-color image isolation, hover auto-cycle (1.5 s), arrows, quick-add |
| PLP skeletons | `plp-skeleton.tsx`, `loading.tsx` on shop/collections/search |
| Multi-state filter sidebar | `facet-filter-sidebar.tsx` + `filter-drawer.tsx` + `active-filter-pills.tsx` (in-app faceting over ≤500 candidates, `facets.ts`) |
| Sticky mobile buy bar | `product-detail.tsx:176-195` (IntersectionObserver-driven) |
| Dynamic-zone page builder | Strapi `page` content type: 9 `section.*` blocks; exhaustive `SectionRenderer` with per-block Suspense; unknown blocks skipped, never crash |
| Zod boundary validation | `lib/strapi/schemas.ts` — single source of truth, `z.infer` types, tolerant dynamic zone |
| Z-index ladder, focus-visible rule, reduced-motion handling | `globals.css:45-47, 67-70, 138-153` |

### 0.2 Identified design flaws (this overhaul's targets)
| # | Flaw | Location | Severity |
|---|---|---|---|
| F1 | Font-size tokens exist but 11 call sites still use arbitrary `text-[10px]`(4) / `text-[11px]`(6) / `text-[15px]`(1) | cards, badges, legal page | Med |
| F2 | Tracking drift: `tracking-[0.2em]`(4), `tracking-[0.15em]`(1), `tracking-[0.14em]`(2 — duplicates the eyebrow token), `tracking-[0.02em]`(1) | carousel headers, PDP CTA, banner display type | Med |
| F3 | Easing drift: `ease-[cubic-bezier(0.4,0,0.2,1)]`(2), `ease-in-out`(2) vs the de-facto `ease-out` standard (7) | overlay, hero-slider | Low |
| F4 | Un-tokenized display duration `duration-[600ms]` + container-mirroring `md:pl-[calc(max((100vw-72rem)/2,0px)+2.5rem)]` hardcoded in `new-arrivals-banner.tsx` (drifts if `CONTAINER` changes) | new-arrivals-banner | Med |
| F5 | **No CMS colorway media model** — PDP/PLP colorway imagery depends entirely on Medusa variant images; merchandising cannot curate per-color galleries, and swatch hexes live only in Medusa option-value `metadata.swatch` | Strapi + PDP | **High** |
| F6 | PDP detail panels render as horizontal tabs on desktop — luxury reference (Prada/Skims) is accordion drop-downs; tabs also cap panel count | `product-details-tabs.tsx` | Med |
| F7 | PDP gallery is single-image + thumb rail only — no grid presentation mode (the "dynamic image grid column switch" of editorial PDPs) | `product-gallery.tsx` | Med |
| F8 | Homepage block family lacks a promotional **split hero**, an **asymmetric editorial grid**, and an autoplay **product carousel** with editor-controlled item limit | Strapi `section.*` + renderer | **High** |
| F9 | `product-page.panels` is `required: true` — an entry that only wants colorways (post-F5) can't exist; `productSlug` has no format validation | Strapi schema | Med |
| F10 | `shared.cta.href` / `shared.link.href` accept any string (hero-slide already regex-validates; the shared primitives don't) | Strapi components | Low |

### 0.3 Consciously out of scope (documented so they aren't "missed")
- Quantity selector, wishlist, express checkout, back-in-stock, zoom-lens, video gallery — tracked in `PRODUCTION_HARDENING_PLAN.md` Phases 2–4; not part of this mission's three steps.
- PLP-side Strapi colorway fetch: wiring CMS galleries into every product card would add an N+1 Strapi query per PLP page (or a bulk join layer). PLP keeps Medusa variant-image isolation; the CMS colorway engine targets the PDP where the editorial payoff is. Revisit with a bulk `filters[productSlug][$in]` query if needed.
- Real Fonepay integration, Redis event bus — backend concerns outside this storefront/CMS mission.

---

## 1. STEP 1 Blueprint — Design Token Framework & Visual Consistency

**Goal:** zero arbitrary styling values in components; every value resolves to a token or a documented Tailwind step.

### 1.1 Token additions (`globals.css @theme`)
```
--tracking-hero:    0.2em   /* display/eyebrow letterspacing on carousels & overlays (replaces tracking-[0.2em]) */
--tracking-cta:     0.15em  /* primary buy-button letterspacing (replaces tracking-[0.15em]) */
--tracking-display: 0.02em  /* tight display-serif banner headlines (replaces tracking-[0.02em]) */
--ease-luxe: cubic-bezier(0.25, 0.1, 0.25, 1)  /* single named easing for slow media moves */
```
Tailwind v4 generates `tracking-hero`, `tracking-cta`, `tracking-display`, and `ease-luxe` utilities from these namespaces automatically.

### 1.2 Replacement sweep (mechanical, verified by grep-to-zero)
| From | To | Sites |
|---|---|---|
| `text-[10px]` | `text-3xs` | 4 |
| `text-[11px]` | `text-2xs` | 6 |
| `text-[15px]` | `text-sm-base` | 1 |
| `tracking-[0.2em]` | `tracking-hero` | 4 |
| `tracking-[0.15em]` | `tracking-cta` | 1 |
| `tracking-[0.14em]` | `tracking-eyebrow` (existing token) | 2 |
| `tracking-[0.02em]` | `tracking-display` | 1 |
| `ease-[cubic-bezier(0.4,0,0.2,1)]`, `ease-in-out` | `ease-out` (interaction) / `ease-luxe` (media) | 4 |
| `duration-[600ms]` | `duration-500` (standard slow step) | 1 |
| `md:pl-[calc(max((100vw-72rem)/2,0px)+2.5rem)]` | shared `.pl-container-bleed` utility in `globals.css`, derived from the same 72rem/2.5rem constants as `CONTAINER` | 1 |

Durations stay on the existing 200/300/500 ladder (already consistent: 5/21/5 usages) — no new duration tokens needed, just the two stragglers above.

### 1.3 Missing-module resolution
- **Homepage**: delivered via STEP 2 blocks (split hero, asymmetric editorial grid, autoplay carousel) — composition stays in Strapi, not JSX.
- **PLP**: audit shows filtering sidebar, swatch triggers, skeletons, clean grid already exist (§0.1) — no rebuild.
- **PDP**: F6 (accordion-first details) + F7 (gallery grid/column switch) fixed in STEP 3 work; sticky mobile buy bar already exists.

---

## 2. STEP 2 Blueprint — Strapi Component-Driven Architecture & Colorway Engine

### 2.1 New dynamic-zone blocks (registered on `page.sections`)
| Block | Fields | Renders as |
|---|---|---|
| `section.hero-split` | `header` (shared.section-header), `media` (shared.media, required), `cta` (shared.cta), `promoLabel` (string ≤40), `imageSide` (enum left/right, default right), `backgroundToken` (palette enum) | Promotional split hero: editorial copy panel + full-bleed image, marketing-flippable orientation |
| `section.editorial-grid` | `header`, `tiles` (repeatable `layout.editorial-tile`, min 2 max 6, required) | Asymmetric editorial mosaic (first tile spans 2×2 by default) |
| `layout.editorial-tile` (new component) | `image` (media, required), `alt` (string ≤160, required), `label` (string ≤80), `tagline` (string ≤120), `href` (string, regex `^$\|^(/[^\s]*\|https?://[^\s]+)$`), `span` (enum standard/wide/tall/feature, default standard) | One mosaic cell |
| `section.product-carousel` | `header`, `collectionSlug` (required, slug regex), `cta`, `itemLimit` (integer 4–24, default 12), `autoplay` (boolean, default false) | Autoplay-capable product carousel with editor-capped item count |

**Duplication note (deliberate):** `section.product-rail` already renders a scroll rail; `section.product-carousel` is the *configurable* variant (autoplay + item limit + centered header). Both share the same `SpotlightCarousel` renderer — one implementation, two editorial presets — so this does **not** reintroduce the spotlight/new-arrival duplication the CMS audit killed.

### 2.2 Colorway Media Engine — `product.colorway-gallery`
New component category `product`. Schema (all constraints enforced by Strapi at write time):
```jsonc
// components/product/colorway-gallery.json
{
  "colorName": { "type": "string", "required": true, "maxLength": 60,
                 "regex": "^[A-Za-z][A-Za-z0-9' &-]*$" },        // "Onyx", "Espresso", "Sandstone"
  "colorHex":  { "type": "string", "required": true,
                 "regex": "^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$" }, // swatch rendering
  "gallery":   { "type": "media", "multiple": true, "required": true, "allowedTypes": ["images"] }
}
```
Attached to **`product-page`** (the existing editorial layer keyed by Medusa handle) as:
```jsonc
"colorways": { "type": "component", "repeatable": true, "component": "product.colorway-gallery" }
```
**Join key contract:** `colorway.colorName` matches the Medusa Color option *value* case-insensitively (`"Onyx"` ⇄ option value `"Onyx"`). Strapi never stores a Medusa DB id — consistent with the repo's slug/code reference protocol.

### 2.3 Data-protection hardening (F9/F10)
- `product-page.productSlug`: add regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` (matches Medusa handle format; existing data complies).
- `product-page.panels`: `required: true → false` (a colorway-only entry is now legal).
- `shared.cta.href` + `shared.link.href`: add the same href regex hero-slide already uses; `label` maxLength 60.
- All new fields carry required/maxLength/regex as listed in §2.1–2.2.

### 2.4 Storefront contract updates
- `lib/strapi/schemas.ts`: `colorwaySchema` (+ on `productPageSchema`), three new section schemas added to the discriminated union (older storefront deploys simply skip unknown blocks — forward-compatible by design).
- `lib/strapi/queries.ts`: `PAGE_POPULATE.sections.on` entries for the three blocks; `POPULATE.productPage` gains `colorways.gallery`.

---

## 3. STEP 3 Blueprint — Colorway Swatch Interaction Engine (frontend)

**Resolution chain when a swatch is clicked (PDP):**
1. `products/[slug]/page.tsx` builds `colorwayMap: { [colorNameLower]: { hex, images[] } }` from the Strapi `product-page.colorways` (already fetched — zero extra requests).
2. `ProductDetail` gallery isolation order for the selected color: **Strapi colorway gallery** → Medusa variant images → product-level images. Selecting a swatch instantly swaps the gallery to *only* that color family's assets (gallery is keyed by color, resetting the active image).
3. Swatch chip color: **Strapi `colorHex`** → Medusa `option value metadata.swatch` → transparent. CMS-curated hex wins.
4. PLP cards keep Medusa variant-image isolation (see §0.3 scope note) — the interaction contract (click swatch ⇒ isolated color imagery) is already live there.

**PDP presentation upgrades riding along:**
- F6: `ProductDetailsTabs` → accordion at **all** breakpoints (shared `Accordion` primitive already ships the mobile path; the desktop tab branch is removed). Materials/Care/Shipping panels come from product metadata + Strapi panels as today.
- F7: gallery column switch — desktop toggle between single-image + thumbnails (default) and a 2-column editorial grid of the active colorway's full gallery.

---

## 4. Script & Seeding Details (run ONLY after everything above lands)

| Script | Change | Run |
|---|---|---|
| `apps/strapi/scripts/seed.ts` | **New `seedProductPages()`**: creates/updates `product-page` entries for the color-bearing seed products with 2–3-image colorway galleries per color (Unsplash, idempotent by file name), colorNames matched to the Medusa seed's Color option values, colorHexes mirroring the seed `metadata.swatch` values. **`seedPages()`**: home pages gain a `section.hero-split` (promo) and `section.editorial-grid`; the spotlight rail becomes `section.product-carousel` (autoplay, itemLimit 12) to exercise the new block. | `pnpm --filter @hakeems/strapi seed` |
| `apps/strapi/scripts/verify-overhaul.ts` | **New, read-only**: prints each product-page's panels/colorways and each home page's section composition — post-seed smoke check. | `npx tsx scripts/verify-overhaul.ts` |
| Strapi schema application | Strapi applies schema JSON changes at boot (dev auto-migration) — the seed script's `compileStrapi()+load()` does this before writing. | implicit |
| Order of operations | Medusa data must exist (collection sync) before the Strapi seed's enrichment. **Environment note:** both apps' local `.env` files point at the shared remote Railway Postgres (Medusa in schema `medusa`, Strapi in schema `strapi`) — the local Docker Postgres is vestigial for the current setup. | root `pnpm seed` |
| `apps/strapi/scripts/purge.ts` | No change needed — it purges by content-type UID and `product-page` is already covered. | — |

**Rollback:** schema additions are purely additive (new components, new optional field, one `required` relaxed). No destructive migration. Removing the blocks from `page.sections` and deleting the component JSONs reverts cleanly; seeded entries are draft-and-publish documents deletable in admin or via purge.

---

## 5. Execution Tracker

| # | Work item | Status |
|---|---|---|
| 1 | Audit + this log | ✅ done |
| 2 | Strapi: `product.colorway-gallery` + product-page attach + validation hardening (F5, F9, F10) | ✅ done |
| 3 | Strapi: `section.hero-split`, `section.editorial-grid`, `section.product-carousel`, `layout.editorial-tile` + zone registration (F8) | ✅ done |
| 4 | Storefront: token sweep to zero arbitrary values (F1–F4) | ✅ done — grep-to-zero verified |
| 5 | Storefront: Zod/populate/renderer wiring + 3 new block components (F8) | ✅ done |
| 6 | Storefront: PDP colorway engine + accordion details + gallery grid switch (F5, F6, F7) | ✅ done |
| 7 | Seeds: `seedProductPages` colorways + new home sections | ✅ done — ran against Railway DB |
| 8 | Verify: typecheck/build + seed + rendered-page smoke checks | ✅ done (see §6) |

---

## 6. Verification Evidence (2026-07-18)

- **`tsc --noEmit`** on `apps/storefront`: clean. **`next build`**: succeeded, 38 static pages; built CSS contains `tracking-hero`, `ease-luxe`, `pl-container-bleed` **and** its `md:` responsive variant (confirming the `@utility` form works).
- **Arbitrary-value sweep**: `grep tracking-[ | text-[10/11/15px] | ease-[cubic | ease-in-out | duration-[600ms] | calc(max((100vw` across `src/**/*.tsx` → **zero matches**.
- **Strapi seed** (`pnpm --filter @hakeems/strapi seed`): schema compiled + applied, all seeders green including `Seeded product-pages with colorway galleries (coaster-luxe-sweatshirt, salutation-stash-tight)`, `Enriched 5/5 collection-page entries`.
- **`verify-overhaul.ts`** (Document Service, published status): both product-pages show 2 panels + 3 colorways × 2 images with correct hexes; both channels' home pages read `hero-slider, value-props, category-grid, product-carousel, hero-split, brand-story, editorial-grid, editorial-banner, testimonials`.
- **Rendered pages** (running dev servers): `GET /nepal` → 200 with "The Monsoon Layer" (hero-split + "This Week Only" promo label), "Worn On The Street" (editorial-grid), "This Week, Front Row" (product-carousel). `GET /nepal/products/coaster-luxe-sweatshirt` → 200 with all six CMS colorway images in the payload, CMS swatch hexes (#C4A882/#0F0F0F/#BEC5B0), and the accordion panels (Materials & Care, Size Guide).
- **Strapi REST** (public role): `GET /api/product-pages?filters[productSlug][$eq]=coaster-luxe-sweatshirt&populate[colorways][populate]=*` returns colorways with full media entities from the Railway media host.

---

# PART II — FOUR-PHASE PREMIUM REDESIGN (2026-07-18, second mission)

> **Scope:** visual system, proportions, component structure, product presentation, motion, responsive behavior.
> **References:** Athleta (disciplined product discovery) + Prada (editorial, minimal luxury). Principles only — no copied code/branding/layouts.
> **Preserved invariants:** routing, Strapi dynamic-zone driving all marketing content, colorway architecture, cart/checkout logic, auth.

## R0. Visual Audit — why the current UI reads "generic template"

| # | Flaw | Evidence |
|---|---|---|
| V1 | **Narrow, timid shell** — `CONTAINER = max-w-6xl (1152px) px-6/md:px-10`; every luxury reference breathes at ~1400px+ with larger gutters. Nav is a 64px `h-16` strip. | `lib/ui.ts`, `nav-bar.tsx:57` |
| V2 | **Weak typographic hierarchy** — page titles `text-3xl/4xl`, card name and price the *same* `text-sm`, no display scale, no line-height discipline for serif display sizes. | `shop/page.tsx:52`, `product-card.tsx` |
| V3 | **Two competing button languages** — `Cta` renders `rounded-full` pills while the PDP buy button is square uppercase-tracked; footer/rail links use a third underline style. | `ui/cta.tsx:8-14` vs `product-detail.tsx:164` |
| V4 | **App-like navigation** — sentence-case `text-sm font-semibold` links, a cramped min-w-40 dropdown card, icons crowded at `gap-5`. Fashion nav = uppercase micro labels, wide tracking, generous air, full-panel dropdowns. | `nav-bar.tsx:15-42,65-87` |
| V5 | **Crowded product cards** — image (4:5) carries hover-zoom + paging arrows + OOS overlay + 2 badges + a floating `+` quick-add + swatches + promo line. Prada card = image + whisper of text; Athleta = image/swatches/name/price, nothing else visible until hover. | `product-card.tsx` |
| V6 | **Undifferentiated section rhythm** — one `--spacing-section: 6rem` everywhere; homepage reads as N equal full-width strips (the "repetitive template" smell). | `globals.css:29`, home sections |
| V7 | **PLP toolbar/sidebar are unstyled utility UI** — plain `220px` column, "N items" + native-ish sort select, no sticky behavior, no hairline structure, filter groups not collapsible on desktop. | `plp-results.tsx:45-77` |
| V8 | **PDP info column capped at `max-w-md`** with a thumbnail-rail gallery — imagery underweighted for a fashion PDP; info column doesn't stick; single/grid toggle is a control where a designed layout should be. | `product-detail.tsx:107-111` |
| V9 | **PLP swatches not wired to CMS colorways** (variant images only), and colorway hex on cards ignores the CMS hex. | `product-card.ts:collectColors` |
| V10 | **No wishlist affordance** anywhere (nav, card, PDP) — flagged in both this brief and the hardening plan. | — |

## R1. The Design System (Phase 1 blueprint → implemented in `globals.css` + `lib/ui.ts` + `ui/cta.tsx`)

**Container widths**
- `CONTAINER` → `mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12` (≈1408px shell, stepped gutters). One constant; every surface inherits the new proportions.
- `pl-container-bleed` recomputed for 88rem with a `lg` gutter step (media query inside the `@utility`).
- Prose/legal keeps a narrow reading measure (existing `max-w-*` in prose contexts).

**Typography scale (Tailwind v4 `--text-*` tokens with baked line-heights)**
| Token | Size | Use |
|---|---|---|
| `text-display-2xl` | clamp(3rem→5.75rem), lh 0.98, serif | Hero headlines |
| `text-display-xl` | clamp(2.5rem→4.25rem), lh 1.02 | Editorial banners, split heroes |
| `text-display-lg` | clamp(2rem→3rem), lh 1.08 | Section headings, PDP title |
| `text-display` | clamp(1.65rem→2.25rem), lh 1.12 | Page titles (PLP), card-level features |
| Existing `text-3xs/2xs/sm-base` | — | micro labels/badges (kept) |
Rules: serif (Fraunces) for display sizes only; Inter for UI/body; uppercase micro labels always `tracking-label`/`tracking-eyebrow`/`tracking-hero` — never re-invented.

**Spacing rhythm**
- `--spacing-section: 7.5rem` (120px), `--spacing-section-sm: 4rem`; new `--spacing-section-lg: 10rem` for editorial set-pieces. Vertical card-grid gaps ≥ 3× horizontal (fashion-grid convention).

**Radius & borders** — zero radius on all rectangular UI (buttons, inputs, panels, cards). Round is reserved for inherently circular elements (swatch dots, icon-button hit targets). Structure drawn with `hairline` borders, not shadows; shadows only on floating layers (drawers/dropdowns/sticky bars).

**Buttons — one language** (`ui/cta.tsx` rewritten; PDP/buy/checkout buttons align to it)
- `primary`: square, ink fill, `text-2xs uppercase tracking-cta`, generous `px-10 py-4`.
- `secondary`: square, 1px ink border, same type treatment.
- `link`: hairline underline reveal, no border-radius anywhere.

**Motion language** — 200 (interaction) / 300 (state) / 500–700 (media) on `ease-out`; slow media moves on `ease-luxe`; image swaps always crossfade (`animate-fade-in`); hover zoom unified at `scale-[1.04] duration-700 ease-luxe`; reduced-motion kill-switch already global.

**Image ratios** — product imagery standardizes on **3:4** (cards, PDP, quick views); editorial imagery 4:5 or 16:10 by block. No more mixed 4:5/3:4 product crops.

**Responsive rules** — mobile is designed, not shrunk: nav h-16 mobile / h-20 desktop; PLP 2-col mobile with `gap-x-3`, 4-col ≥lg; PDP mobile = swipe gallery + sticky buy bar, desktop = scrolling image column + sticky info; drawers for filters/menu/cart on mobile only.

**Page directions**
- **Home**: hero (full-bleed, display-2xl serif, minimal progress indicator) → micro value strip (no boxes) → category grid (edge-to-edge tiles) → product carousel (disciplined header row) → split hero → brand story → editorial mosaic → editorial banner → testimonials (plain pull-quotes). Density varies; every section keeps its Strapi block.
- **PLP**: display serif title + collection tagline, hairline-framed sticky toolbar (count · filters · sort), collapsible sidebar groups, 3:4 cards, slide-up quick-add, CMS-colorway swatches.
- **PDP**: desktop two-column — scrolling image stack (all of the selected colorway's images, large) left, sticky info right; mobile swipe gallery; unified buy button; size guide affordance; accordions; wishlist.

## R2–R4. Phase plans (all executed — see R5 for results)
- **Phase 2 (shell+home)**: `announcement-bar` → h-9 micro `tracking-label`; `nav-bar` → h-20 desktop, uppercase micro links `gap-10`, full-width hairline dropdown panel, thinner icons `gap-6`; `footer` → editorial: oversized serif brand statement, micro-label columns, refined newsletter; homepage block components restyled per R1 type/spacing (Strapi contracts untouched).
- **Phase 3 (PLP/cards/colorways)**: `product-card` rebuilt (3:4, swatch row, name/price hierarchy, hover slide-up Add, no arrows, text badges); `product-grid` gaps; toolbar/sidebar/drawer/pagination restyle; **bulk colorway merge**: one Strapi `filters[productSlug][$in]` query per listing page merges CMS hex+gallery into card colors (kills V9 without N+1); wishlist heart (localStorage, nav count).
- **Phase 4 (PDP/motion/cleanup)**: `product-detail` restructured (sticky info, scrolling gallery), `product-gallery` split desktop/mobile presentations, size-guide overlay, wishlist on PDP, sticky bar polish; sweep: dead code (hero-slider commented CTA variant), obsolete styles, redundant wrappers; final build + rendered checks.

## R5. Execution record & verification (all four phases shipped)

**Phase 1 — foundation.** `CONTAINER` widened to `max-w-[88rem] px-5 sm:px-8 lg:px-12`; display type scale (`text-display-2xl/xl/lg/display` with baked line-heights), section rhythm 7.5/4/10rem, `--ease-luxe`; `pl-container-bleed` recomputed (with in-utility `lg` media step); `ui/cta.tsx` unified to the square uppercase-tracked language (pills eliminated — remaining `rounded-full` in commerce UI is swatch dots only, verified by grep).

**Phase 2 — shell + home.** Announcement bar → micro tracking-label strip; nav → h-20 desktop, absolutely-centered uppercase micro links with underline reveal, `min-w-56` hairline dropdown with "View all", wishlist heart added, icons at `gap-6`; mobile menu → serif `text-2xl` entries with animated disclosure; footer → display-serif newsletter band + brand statement, `py-24` columns. Home blocks: shared `SectionHeaderBlock` → `text-display-lg` (upgrades every section), hero heading → `text-display-2xl`, value-props → 4-up micro-label strip at `py-section-sm`, testimonials → hairline pull-quotes (card boxes removed), brand-story → 12-col editorial split at `py-section-lg`, editorial banner heading → `text-display-xl`, all media hover zooms unified at `scale-[1.04] duration-700 ease-luxe`. Fixed: spotlight track bleed re-synced to the new gutters (leftmost card was clipping); hero Ken Burns wrapper missing `relative` (next/image fill warning).

**Phase 3 — PLP/cards/colorways.** `ProductCard` rebuilt: 3:4 imagery with crossfade + slow zoom, single quiet text badge, hover-only wishlist heart, slide-up Quick Add bar (`QuickAddButton` reworked; always visible on touch, hover/focus-gated ≥md), 4pt swatches with ring states, arrows removed, name/price hierarchy quieted. Grid → `gap-x-3 gap-y-12 lg:gap-y-16`. Toolbar → hairline-framed micro-label count + controls; sidebar → sticky (`top-28`) with "Filters" heading. Shop header → eyebrow + `text-display`; collection banner → campaign treatment with the title set into the image. **Colorway integration**: `getProductColorwaysBySlugs` (one `$in` request per listing, slim `productColorwaysSchema`) + `applyCmsColorways` merged in `products.ts` (`listProducts`, `listProductsByIds`, `listProductsByHandles`, `listCollectionProducts`) — PLP swatches now render CMS hexes and isolate CMS galleries. **Wishlist**: `lib/wishlist.ts` (localStorage + event sync), heart on cards/PDP, nav count badge, `/[channel]/wishlist` page resolving saved handles through `fetchWishlistCardsAction` (robots-disallowed).

**Phase 4 — PDP/motion/cleanup.** `ProductDetail` → editorial two-column (`1fr / 26.5rem`), purchase column `sticky top-28`; collection eyebrow + `text-display-lg` serif title; size row with **Size Guide** opening the CMS panel in a right sheet (`Overlay`); buy button + `pdp`-size wishlist heart side by side; shipping micro-note; details as accordion (`ProductDetailsTabs` reduced to the shared `Accordion` at all breakpoints — desktop tab strip deleted). `ProductGallery` → mobile always swipe-single with thumbs; desktop defaults to the editorial two-up grid (toggle back to single), all images open the lightbox. Cleanup: hero-slider dead commented CTA removed, `app/icon.svg` monogram added (was a 404 on every page), `/wishlist` in robots disallow.

**Verification evidence (rendered, not just compiled):**
- `tsc --noEmit` clean; `next build` ✓ (41 pages).
- Full-page Chrome screenshots (desktop 1440 + mobile 390, scroll-walked so lazy images load): home shows the new shell, display hero, varied section rhythm, editorial mosaic, split hero, pull-quotes; PLP shows the display header, sticky filter rail, hairline toolbar, 3:4 cards with CMS-hex swatches; PDP desktop shows the two-up gallery + pinned purchase column, mobile shows the swipe gallery + sticky buy bar.
- Browser console: **zero errors/warnings** on home, PLP, PDP after fixes (was: Zod validation noise from the bulk colorway query — fixed with the slim schema; next/image fill-position warning — fixed; favicon 404 — fixed).
- Not restyled this pass (already token-consistent, tracked as future polish): search overlay, cart drawer internals, checkout forms, account pages.

