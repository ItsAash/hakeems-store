# Production Hardening Plan — Hakeems Storefront

> **Audit date:** 2026-07-18
> **Scope:** `apps/storefront/src` — Next.js App Router, Tailwind CSS v4, Medusa v2, Strapi 5
> **Status:** Living document — phases are isolated, testable, and ordered by dependency.

---

## Executive Summary

The storefront has strong architectural bones — URL-driven state, exhaustive TypeScript discriminated unions for Strapi sections, a lean CSS-only animation approach, robust optimistic cart updates, and a clean server-driven checkout flow. However, visual polish, token discipline, and high-conversion e-commerce features are incomplete.

### Key strengths
- **Design tokens:** Color system via CSS custom properties is excellent — 361+ references use `var(--color-*)` with zero raw hex codes outside the definition.
- **Container system:** Central `CONTAINER` constant (`mx-auto w-full max-w-6xl px-6 md:px-10`) used across 30+ files.
- **Focus accessibility:** Single global `:focus-visible` rule covers all interactive elements.
- **Z-index layering:** Documented scale (10/20/30/50/60), followed perfectly.
- **Optimistic cart:** `useOptimistic` + `useTransition` with automatic rollback on failure — production-grade.
- **Server-driven checkout steps:** Step derived from cart state; refreshing never loses progress.
- **Strapi page builder:** 9 composable section types, exhaustive switch, Suspense boundaries for data-fetching blocks.
- **Reduced motion:** Comprehensive `prefers-reduced-motion` handling.

### Critical gaps
1. **No shadow tokens** — Three different shadow approaches with no centralized scale.
2. **No transition tokens** — Durations (200/300/500/600ms) and easings vary ad-hoc across 15+ components.
3. **Tracking value proliferation** — Four different `tracking-[*]` values serve the same "uppercase label" purpose.
4. **Opacity proliferation** — 13 different opacity levels used with no documented scale.
5. **Half-step spacing not tokenized** — `py-2.5`, `py-3.5`, `px-3.5` appear in 10+ components as ad-hoc values.
6. **Missing PLP features** — Price range filter, stock indicators on cards, infinite scroll / load-more, grid/list toggle, "New" auto-badges.
7. **Missing PDP features** — Quantity selector (hardcoded to `1`), OOS option states not indicated visually, `LOW_STOCK` logic declared but never implemented, no zoom-on-hover, no video support, no wishlist.
8. **Bug:** `LOW_STOCK` stock level is declared in types and checked in UI but `buildVariantMatrix()` never emits it — low stock indicator will never appear.
9. **No page transitions** — Route changes are hard cuts.
10. **No free-shipping threshold UI** — Common conversion optimization entirely absent.

---

## Phase 1: Token Unification & Structural Shell

> **Goal:** Eliminate all ad-hoc styling values, establish a complete token scale, and make the layout system truly uniform.

### 1.1 Shadow tokens
Add to `globals.css` `@theme`:
- `--shadow-card` / `--shadow-raised` / `--shadow-sticky` / `--shadow-overlay`

Replace the three existing shadow approaches:
- `shadow-xl` → `--shadow-overlay` (cart drawer)
- `shadow-sm` → `--shadow-card` (product-card arrows)
- `shadow-[0_-4px_16px_rgba(20,18,15,0.08)]` → `--shadow-sticky` (PDP sticky bar)

### 1.2 Transition tokens
Add to `globals.css` `@theme`:
- `--transition-fast: 200ms ease-out`
- `--transition-base: 300ms ease-out`
- `--transition-slow: 500ms ease-out`

Create shared utility classes in `globals.css`:
- `.transition-fill` / `.transition-color` / `.transition-opacity`

Replace ad-hoc values across components:
- `duration-200` → `transition-fast`
- `duration-300` → `transition-base`
- `duration-500` → `transition-slow`
- `ease-out` / `ease-[cubic-bezier(…)]` → `ease-out` (consolidate to one default)

### 1.3 Tracking token scale
Add to `globals.css` `@theme`:
- `--tracking-label: 0.1em` (replaces 20+ `tracking-[0.1em]`)
- `--tracking-eyebrow: 0.14em` (already exists as `--tracking-eyebrow`)
- `--tracking-wide: 0.05em` (replaces `tracking-wide`)

Create utility classes:
- `.tracking-label` / `.tracking-eyebrow` / `.tracking-wide`

Replace across all components (22+ instances).

### 1.4 Opacity token scale
Define 5-7 named opacity levels (reduce from 13):
- `90` / `75` / `60` / `40` / `25` / `15` / `10`

Audit all `/opacity` color suffix usages and consolidate to this scale.

### 1.5 Font-size tokens
Add to `globals.css` `@theme`:
- `--text-2xs: 0.6875rem` (11px) — replaces `text-[11px]` (6 instances)
- `--text-3xs: 0.625rem` (10px) — replaces `text-[10px]` (3 instances)
- `--text-sm-base: 0.9375rem` (15px) — replaces `text-[15px]` (legal-page body)

### 1.6 Half-step spacing tokens
Add to `globals.css` `@theme`:
- `--spacing-1\.5`, `--spacing-2\.5`, `--spacing-3\.5`

Replace across all components (10+ usages).

### 1.7 Refactor new-arrivals-banner container
Replace `md:pl-[calc(max((100vw-72rem)/2,0px)+2.5rem)]` with a shared utility that derives from the `CONTAINER` constant.

### 1.8 Refactor PDP sticky bar
Replace hardcoded `max-w-6xl` with the `CONTAINER` pattern.

### 1.9 Footer spacing audit
Replace ad-hoc `py-12` / `py-14` / `py-16` / `py-6` with `py-section-sm` or a new `py-section-lg` token.

### 1.10 CTA component unification
Audit all call-to-action buttons and consolidate into the `cta.tsx` component variants. Replace the hero-slider's standalone CTA styling with the shared component.

---

## Phase 2: The Advanced Shoppable PLP & Facet Filters Layer

> **Goal:** Transform the PLP into a premium shopping experience with complete filter UX, stock awareness, and engagement features.

### 2.1 Price range filter
Re-activate the dormant `priceMin` / `priceMax` in `PlpSearchParams`:
- Add UI: two number inputs or a dual-range slider in the facet filter sidebar and mobile drawer
- Wire URL state: `?priceMin=1000&priceMax=5000`
- Implement client-side filtering in `facets.ts` or pass through to Medusa API
- Add active filter pills for price range

### 2.2 Stock indicators on product cards
Add to `ProductCardModel` in `product-card.ts`:
- `stockLevel: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'`
- Render a dot + label on the card image overlay:
  - Green dot + "In Stock"
  - Amber dot + "Low Stock — only a few left"
  - Grey dot + "Out of Stock"

### 2.3 `LOW_STOCK` bug fix (PDP + card)
In `buildVariantMatrix()` (`pdp.ts:88`), add the low-stock threshold logic:
```ts
stockLevel:
  inventoryQty > 0 && inventoryQty <= LOW_STOCK_THRESHOLD
    ? 'LOW_STOCK'
    : inventoryQty > 0
      ? 'IN_STOCK'
      : 'OUT_OF_STOCK'
```
Define `LOW_STOCK_THRESHOLD = 5` as a configurable constant.

### 2.4 Infinite scroll / Load More
Replace prev/next pagination with:
- **Desktop:** "Load More" button at the bottom of the grid (appends results, maintains scroll position)
- **Mobile:** Infinite scroll with IntersectionObserver (auto-loads next page when user scrolls to bottom)
- Keep URL page param for shareable state and SEO
- Fall back to standard pagination when JS is disabled (progressive enhancement)

### 2.5 Product card hover auto-cycle
When a product has multiple color swatches, auto-cycle through their images on card hover (3s interval, pause on hover-in). Use the existing per-color image data. Ensure this respects `prefers-reduced-motion`.

### 2.6 "New" arrival auto-badge
Add time-based "New" badge logic:
- Set a threshold (e.g., 30 days since `created_at`)
- Auto-apply the badge on the product card
- Works alongside the existing metadata-driven badge system

### 2.7 Grid / List view toggle
Add a view toggle (grid/list icons) to the PLP toolbar:
- Grid: existing 2/3/4 column layout (default)
- List: single-column with horizontal cards (image left, details right)
- Store preference in `?view=` query param or localStorage

### 2.8 Quick View modal
Add a "Quick View" button/overlay on product cards:
- Opens a modal with product name, price, image gallery, variant selection, and "Add to Cart"
- Avoids full PDP navigation
- Reuses existing `product-gallery.tsx` and `addItemToCartAction`

### 2.9 Sort options expansion
Add to `sort-select.tsx`:
- "Newest Arrivals" (by `created_at`)
- "Best Selling" (would require `sales` data from Medusa)
- Keep at least 6 sort options total

### 2.10 Collapsible filter groups + "Show more"
- Add collapsible headers to facet filter groups (expand/collapse with chevron)
- Add "Show more" / "Show less" toggle for groups with >5 options

---

## Phase 3: The Immersive Editorial PDP Layer

> **Goal:** Build a premium PDP experience with rich media, complete variant UX, and deep CMS integration.

### 3.1 Quantity selector
Replace the hardcoded `quantity: 1` in `product-detail.tsx`:
- Add `+` / `-` button pair or a numeric input with min=1, max=stock
- Wire to `addItemToCartAction(channelCode, variantId, quantity)`
- Show max quantity hint ("Only N available")

### 3.2 OOS option states
Update size and color option buttons in `product-detail.tsx`:
- Visually grey-out / strikethrough options whose specific combination is OOS
- Show a tooltip or badge on hover: "Sold out"
- Maintain the ARIA `disabled` state

### 3.3 Zoom-on-hover (magnifier)
Add desktop magnifier to `product-gallery.tsx`:
- On hover over the main image, show a magnified lens that follows the cursor
- Use CSS `background-image` with `background-size: 200%` for the zoom effect
- Graceful fallback when image is too small

### 3.4 Video support in gallery
Allow gallery items to be videos (MP4, YouTube embed):
- Detect video from a `mediaType` field in the Medusa product images or Strapi CMS
- Render inline video player with play/pause, native controls
- Autoplay muted on hover (opt-in)

### 3.5 Wishlist / Save button
Add a heart/save icon to product cards and PDP:
- Local state (can be upgraded to customer account storage later)
- Fill animation on toggle
- Show saved items count in nav

### 3.6 Social share buttons
Add to PDP below the buy box:
- Pinterest (pin image), Facebook (share URL), copy link
- Use static share URLs (no SDK dependencies)
- Track with analytics

### 3.7 Express checkout buttons
Add below the primary "Add to Cart":
- Apple Pay / Google Pay / Shop Pay quick-buy buttons
- Reuse the existing `completeCartAction` for order completion
- Show/hide based on channel (Stripe only for HK)

### 3.8 Size guide integration
Add a "Size Guide" link next to the size option group:
- Opens a modal/overlay with sizing content from a Strapi CMS panel or hardcoded table
- Model as a new Strapi section type or reuse the existing product-page Markdown panels

### 3.9 Back-in-stock notification
Add a "Notify me when back in stock" form for OOS variants:
- Email input field + submit button
- Store subscription in a simple DB table or third-party service
- Show confirmation message on submit

### 3.10 `aria-live` for dynamic price
Wrap the price display in `product-detail.tsx` with `aria-live="polite"` so screen readers announce price changes on variant selection.

---

## Phase 4: Seamless Cart Mechanics & Global Edge Performance

> **Goal:** Eliminate layout shift, add conversion-driving cart UX, and polish checkout transitions.

### 4.1 Free-shipping threshold bar
Add to cart drawer and cart page:
- Define free-shipping threshold per channel (e.g., NPR 5000, HKD 800)
- Show a progress bar with "Add $X more for free shipping" messaging
- Animate the progress ring/bar as items are added
- Show "You've unlocked free shipping!" when threshold is met

### 4.2 Cart page loading skeleton
Add a `loading.tsx` to `src/app/[channel]/cart/` with an `animate-pulse` skeleton matching the cart layout.

### 4.3 Cart quantity badge animation
Add a CSS scale-bounce animation on the nav cart icon badge when the item count changes (using `useEffect` + a brief CSS class toggle).

### 4.4 Checkout step transitions
Animate between checkout steps:
- Fade in / slide up for the form content on step change
- Stagger the step indicator line fill animation
- Keep existing server-driven step derivation (no client state)

### 4.5 Checkout loading micro-interactions
Enhance checkout submit buttons:
- Add a small spinner animation during "Saving…" / "Processing…" states
- Add a brief success checkmark before `router.refresh()`
- Add a subtle shake animation on error

### 4.6 Page transition wrapper
Add a CSS-only page fade-in transition:
- Wrap main content in a `animate-fade-in` keyframe on page load
- Use `@keyframes fade-in` already in `globals.css` (repurpose for route changes)
- Keep it simple: 200ms opacity transition, no layout animation
- Respect `prefers-reduced-motion`

### 4.7 Newsletter form backend
Wire the existing newsletter form to an email service provider (Mailchimp, Klaviyo, or a lightweight custom endpoint):
- Add a server action or API route
- Handle validation, duplicate detection, confirmation message

### 4.8 Per-color image `alt` text
Add `alt` text support to the product gallery:
- Accept per-image `alt` strings from Medusa product images
- Fall back to product name + "image [N]" when absent

### 4.9 Lazy loading for gallery thumbnails
Add `loading="lazy"` and explicit `width`/`height` to thumbnail images in `product-gallery.tsx`.

### 4.10 Analytics foundations
Add data attributes to key interaction points (future-proofing):
- `data-analytics="add-to-cart"` on the add-to-cart button
- `data-analytics="view-item"` on product cards
- `data-analytics="begin-checkout"` on checkout initiation
- `data-analytics="purchase"` on order confirmation

---

## Audit Appendix: Detailed Gap Inventory

### Design token gaps
| Area | Current state | Target |
|------|--------------|--------|
| Shadows | None defined | 4 shadow tokens |
| Transitions | ad-hoc values across 15+ components | 3 named duration tokens |
| Tracking | 4+ values for same purpose | 3 named tracking tokens |
| Opacity | 13 levels used | 7 named opacity levels |
| Spacing (half-step) | 4 ad-hoc values in 10+ components | 3 named spacing tokens |
| Font size (10px/11px) | 9 arbitrary instances | 2 named size tokens |

### Missing PLP features
| Feature | Impact | Priority |
|---------|--------|----------|
| Price range filter | Cannot filter by budget | High |
| Stock indicators on cards | Users see OOS only after clicking | High |
| Infinite scroll / Load More | Poor discovery on mobile | High |
| Hover auto-cycle variants | Less engaging cards | Medium |
| "New" arrival auto-badge | No time-based freshness signal | Medium |
| Grid / List view toggle | No list view for power shoppers | Medium |
| Quick View modal | Extra click to PDP for info | Medium |
| Collapsible filter groups | Long lists hard to scan | Low |
| Sort: Newest / Best Selling | Missing common options | Low |

### Missing PDP features
| Feature | Impact | Priority |
|---------|--------|----------|
| Quantity selector | Cannot buy >1 in one action | High |
| OOS option states | Users click sold-out sizes | High |
| LOW_STOCK not emitted | Low stock indicator never shown | High (bug) |
| Zoom-on-hover | No detail inspection on desktop | Medium |
| Wishlist / Save button | No save-for-later | Medium |
| Express checkout buttons | Missing Apple Pay / Shop Pay | Medium |
| Size guide integration | Users guess sizing | Medium |
| Back-in-stock notification | Lose OOS customers | Medium |
| Video in gallery | No video content support | Low |
| Social share buttons | No organic sharing | Low |

### Cart & checkout gaps
| Feature | Impact | Priority |
|---------|--------|----------|
| Free-shipping threshold | No gamified upsell | High |
| Cart page loading skeleton | Blank page during fetch | Medium |
| Checkout step animation | Abrupt step changes | Medium |
| Nav badge scale animation | No visual cart feedback | Low |
| Newsletter backend | Not wired to ESP | Low |

### Architecture observations
- **In-app facet filtering**: 500-product candidate fetch done client-side — acknowledged simplification, won't scale beyond small catalog.
- **`priceMin`/`priceMax` dormant**: Interface properties exist but are never populated from URL or wired to UI.
- **Strapi section builder**: 9 composable types with exhaustive TypeScript checking — strong architecture. No changes needed for flexibility.
- **Z-index layering**: Perfectly followed documented scale — rare in practice. Preserve in all future additions.
- **Focus accessibility**: Single global rule — excellent. Add `aria-live` regions for dynamic PDP content.
