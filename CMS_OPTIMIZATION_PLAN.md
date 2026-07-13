# Strapi CMS — Schema Audit, Optimization & Architectural Strategy

**Author:** Content Architecture review
**Scope:** `apps/strapi` (Strapi **5.50.1**) and the storefront's CMS integration layer (`apps/storefront/src/lib/strapi`, marketing components).
**Status:** 🔎 Analysis + blueprint only. **No schema or code has been modified.** Awaiting review/approval before any remediation.

---

## Executive Summary

The CMS is **clean but rigid**. The Strapi 5 integration is done correctly at the plumbing level — flat response format is consumed directly (no fragile `attributes`/`data` unwrapping), types are hand-written interfaces rather than `any`, and Vendure references already lean on human-readable slugs in several places. Credit where due.

The problem is **architectural, not cosmetic**: the storefront's page composition is **hardcoded in React**, not modeled in Strapi. Content types are a fixed set of repeatable components with a fixed render order. A marketing manager **cannot** reorder sections, add a new promo block, run a channel-specific layout, or stand up a second landing page without a developer. There are **no dynamic zones**, **no shared CTA/link primitive**, **duplicated "collection rail" types** (`spotlight` vs `new-arrival`), a **brittle DB-id reference** (`facetCategoryTile.vendureFacetValueId`), and a **hard-crash failure mode** when a single-type has no entry.

The five highest-impact fixes:

1. **Introduce a Dynamic Zone** (`Page.sections`) so layouts are composed in Strapi, not in `page.tsx`.
2. **Unify the duplicated rail types** (`spotlight`, `new-arrival`) into one reusable `section.product-rail` block.
3. **Standardize Vendure reference keys** on immutable **codes/slugs** — kill `vendureFacetValueId` (a raw DB id) and the redundant `collection-page.vendureId`+`slug` dual key.
4. **Add a safety net**: runtime payload validation (Zod) + a non-throwing fetch layer so missing/empty content degrades gracefully instead of 500-ing.
5. **Add a shared `shared.cta` / `shared.link` primitive** and collapse the redundant link-shaped components.

---

## Repository Map — Files Analyzed

```
apps/strapi/
├── config/plugins.ts ............... users-permissions + upload security. NO i18n plugin.
└── src/
    ├── api/
    │   ├── home-page/     (collectionType, per-channel)  ← fixed component set, no dynamic zone
    │   ├── site-nav/      (collectionType, per-channel)
    │   ├── site-setting/  (singleType, global)
    │   ├── spotlight/     (singleType, global)           ← rail #1
    │   ├── new-arrival/   (singleType, global)           ← rail #2 (near-identical to spotlight)
    │   └── collection-page/(collectionType, Vendure-synced) ← dual key vendureId + slug
    └── components/
        ├── layout/  announcement, hero-slide, collection-tile,
        │            facet-category-tile, nav-item, nav-link, value-item
        └── shared/  seo, link, social-link, paragraph

apps/storefront/src/
├── lib/strapi/
│   ├── client.ts ....... strapiFetch (REST), pickImageUrl, StrapiList/SingleResponse
│   ├── queries.ts ...... getHomePage / getSiteNav / getSiteSetting / getSpotlight /
│   │                     getNewArrivals / getCollectionPage
│   └── types.ts ........ hand-written interfaces (HomePage, HeroSlide, Spotlight, …)
├── components/marketing/
│   ├── hero-slider.tsx, announcement-bar.tsx, facet-category-grid.tsx,
│   ├── spotlight-block.tsx, new-arrivals-block.tsx, new-arrivals-banner.tsx
└── app/[channel]/
    ├── layout.tsx ...... renders HeaderChrome + NavBar + Footer
    └── page.tsx ........ ⚠️ HARDCODES section order (Hero→FacetGrid→Spotlight→Story→NewArrivals)
```

---

## Step 1 — Current-State Findings

### 1.1 TypeScript definitions — *Good, with one hole*
- `apps/storefront/src/lib/strapi/types.ts` uses explicit interfaces (`HomePage`, `HeroSlide`, `Spotlight`, `CollectionPage`, `SiteSetting`, …). **No loose `any`** in the consumer types. ✅
- **Hole:** `strapiFetch<T>()` ends in `return response.json() as Promise<T>` — an **unchecked cast**. The types are a *promise*, not a *guarantee*. Any drift between the Strapi schema and the TS interface fails silently at runtime, not at the boundary. There is **no runtime validation** anywhere.
- Seed scripts lean on `data: any` (acceptable for seeds, but it means the seed can write shapes the schema/consumer never validates).

### 1.2 Data fetching & parsing — *Correct for Strapi 5*
- Strapi **5** returns flattened entities (no `data.attributes` wrapper). The client consumes `response.data` / `response.data[0]` **directly** — so the frontend is **not** burdened with the classic Strapi-4 `attributes`/`data` unwrapping gymnastics. ✅
- `pickImageUrl()` / `resolveMediaUrl()` are sensible media helpers (rendition fallback + absolute-URL passthrough). ✅
- **Populate is manual and stringly-typed**: every query passes literal paths (`['heroSlides.image', 'seo.ogImage']`). Easy to forget a nested populate → silently missing data. No shared populate presets per content type.
- **Inconsistent failure semantics** (see 2.2).

### 1.3 Component modeling — *Rigid: the core problem*
- Pages are built from **repeatable components** (`heroSlides`, `collectionTiles`, `facetCategoryTiles`, `storyParagraphs`, `values`, `announcements`) — good granularity **within** a section.
- But **there are zero dynamic zones**. The *set* of sections and their *order* live in `apps/storefront/src/app/[channel]/page.tsx` as JSX. Strapi cannot add, remove, reorder, or duplicate sections. The CMS models *content inside boxes it doesn't control the arrangement of.*
- `spotlight` and `new-arrival` are **separate single-types** with essentially the same shape (`vendureCollectionSlug`, `eyebrow`, `heading`, `paragraphs[]`, `ctaLabel`, `ctaHref`). Adding a third rail means a third content type + a third React block + a third `page.tsx` edit.

### 1.4 Localization & multi-channel — *Enum-based, not true i18n*
- **No `@strapi/plugin-i18n`.** Channels are modeled as an **`enumeration` field** (`channel: 'nepal' | 'hongkong'`) on `home-page` and `site-nav`, filtered per request (`filters: { channel }`).
- Global content (`site-setting`, `spotlight`, `new-arrival`) is **single-type, shared across channels** — it *cannot* vary per market even when it should (e.g., a Hong Kong–only promo).
- Per-channel content types are **fully duplicated rows** — the Nepal and Hong Kong home pages repeat the entire brand story, values, SEO, etc. Editing shared copy means editing it **twice**, with drift risk.
- No language/locale dimension at all (Nepal + HK are both English today), so adding Nepali/Traditional Chinese later has **no home** in the current model.

---

## Step 2 — Schematic Weaknesses & Bad Practices (candid)

### 2.1 Rigid content types (marketing is locked out)
- **Section order is developer-owned.** Reordering "Spotlight" above "Category Grid," or dropping the brand-story block for a seasonal campaign, is a **code change + deploy** — not a CMS edit. This is the single biggest failure of a "headless CMS for a high-end storefront."
- **Global single-types can't flex per channel.** `spotlight` / `new-arrival` are one-size-fits-all-markets by construction.
- **One home page per channel = full duplication**, no shared/base layer.

### 2.2 Missing safety nets
- **Single-type 404 = 500.** `strapiFetch` throws on any non-2xx. `getSpotlight` / `getNewArrivals` hit `/api/<single-type>`, which **404s when no entry exists**, throwing and taking the whole page down. (This exact failure was observed during development: `Strapi request failed: 404 new-arrival` → page 500 until content was seeded.) List queries degrade to `null` gracefully; single-types do **not**. Inconsistent and fragile.
- **No runtime validation** of payloads (the unchecked cast in 1.1). A renamed/removed field surfaces as `undefined` deep in a component, not as a clear boundary error.
- **No media fallbacks.** Components guard with `image && (...)`, so a missing hero/tile image silently renders nothing rather than a branded placeholder. No default `alt` strategy.
- **`backgroundColor` is a free string** (`"#f7e8e6"`) — no validation, no palette constraint; a bad value paints an arbitrary color into the live banner.

### 2.3 Redundant / brittle relationships to Vendure
- **`facetCategoryTile.vendureFacetValueId` stores a raw DB id** (seeded as `"1"`, `"2"`, `"24"`). Facet value database ids are **not stable** across environments/re-seeds — this is the most brittle link in the system. Should reference a **facet value code** (e.g. `category:tops`).
- **`collection-page` carries a dual key**: `vendureId` (DB id, the sync key, `unique`) **and** `vendureCollectionSlug`. Two identifiers for one relationship invites drift (rename a collection → slug changes, id doesn't → which wins?).
- **`spotlight` and `new-arrival` duplicate the same Vendure-collection-by-slug relationship** in two types.

### 2.4 Naming & structural inconsistencies
- **Reference-key style is mixed**: slug-based (`vendureCollectionSlug`) vs id-based (`vendureId`, `vendureFacetValueId`). No single documented convention.
- **Redundant link-shaped components**: `shared.link` (label+href), `layout.nav-link` (label+href), and inline `ctaLabel`+`ctaHref` on `hero-slide`, `spotlight`, `new-arrival`. Three ways to express "a link/CTA," none shared. **No `shared.cta`.**
- **Component group placement is arbitrary**: `hero-slide`, `collection-tile`, `facet-category-tile` live under `layout.*` (they're really *content blocks*), while genuinely shared primitives (`link`, `seo`) are under `shared.*`. The `layout` vs `shared` boundary isn't principled.
- **CTA fields are flat pairs** (`ctaLabel` / `ctaHref`) instead of an object — can't add `variant`, `openInNewTab`, or analytics id later without touching every type.

---

## Step 3 — The Professional Blueprint

### Pillar 1 — Modular Architecture Strategy

**Goal:** move page *composition* out of React and into Strapi via a Dynamic Zone of reusable blocks, backed by shared global components.

#### 1a. Global (shared) components — standard UI tokens
Introduce a principled `shared.*` primitive layer that every block reuses:

| Component | Purpose | Replaces |
|---|---|---|
| `shared.cta` | `{ label, href, variant: primary / secondary / link, openInNewTab }` | inline `ctaLabel`/`ctaHref`, ad-hoc buttons |
| `shared.link` | `{ label, href }` (already exists — make it the *only* link shape) | `layout.nav-link` |
| `shared.media` | `{ image, imageMobile, alt, focalPoint }` with fallback rules | ad-hoc `image` + `imageMobile` + `alt` triples |
| `shared.section-header` | `{ eyebrow, heading, subheading, align }` | repeated eyebrow/heading/paragraph triples in spotlight/new-arrival/story |
| `shared.seo` | keep | — |
| `shared.color-token` | enum of brand palette keys (not free hex) | free-string `backgroundColor` |

#### 1b. Dynamic Zone — composable page sections
Create a **`section.*` block family** and a **`Page` content type** whose body is a Dynamic Zone. Each existing hardcoded section becomes a block:

| Block | Built from | Notes |
|---|---|---|
| `section.hero-slider` | `heroSlides[]` (existing `layout.hero-slide`) | |
| `section.announcement-bar` | `announcements[]` | can move per page |
| `section.category-grid` | `facetCategoryTiles[]` / `collectionTiles[]` | |
| `section.product-rail` | `shared.section-header` + collection ref + `shared.cta` | **unifies `spotlight` + `new-arrival`** |
| `section.editorial-banner` | `shared.section-header` + `shared.media` + `shared.cta` + `shared.color-token` | the New Arrivals split banner |
| `section.brand-story` | `shared.section-header` + `storyParagraphs[]` + `shared.media` | |
| `section.values-strip` | `values[]` | |

**Proposed `Page` shape (illustrative — not applied):**
```jsonc
// api/page/content-types/page/schema.json  (PROPOSED)
{
  "kind": "collectionType",
  "options": { "draftAndPublish": true },
  "pluginOptions": { "i18n": { "localized": true } },
  "attributes": {
    "slug":    { "type": "uid", "required": true },      // "home", "lookbook-ss26"
    "channel": { "type": "enumeration", "enum": ["nepal", "hongkong"] },
    "sections": {
      "type": "dynamiczone",
      "components": [
        "section.hero-slider", "section.category-grid", "section.product-rail",
        "section.editorial-banner", "section.brand-story", "section.values-strip"
      ]
    },
    "seo": { "type": "component", "component": "shared.seo" }
  }
}
```

**Storefront consumption (illustrative):** replace the hardcoded JSX in `page.tsx` with a **block renderer** that maps `__component` → React component:
```tsx
// PROPOSED: a discriminated-union switch, exhaustive at compile time
const REGISTRY = {
  'section.hero-slider': HeroSlider,
  'section.product-rail': ProductRail,
  'section.editorial-banner': EditorialBanner,
  // …
} as const;
export function SectionRenderer({ sections }: { sections: PageSection[] }) {
  return sections.map((s) => {
    const Cmp = REGISTRY[s.__component];
    return Cmp ? <Cmp key={s.id} {...s} /> : null; // unknown block → skip, never crash
  });
}
```

### Pillar 2 — Standardizing Reference Keys

**Protocol:** Strapi **never** stores a Vendure database id. It stores an **immutable, human-readable, environment-stable key**, and the storefront resolves it against the Shop API at render time.

| Relationship | ❌ Today | ✅ Standard | Rationale |
|---|---|---|---|
| Collection | `vendureCollectionSlug` (+ redundant `vendureId`) | `vendure_collection_slug` **only** | Slug is stable, readable, and the Shop API's `collection(slug:)` selector. Drop the DB id. |
| Facet value | `vendureFacetValueId` = `"1"`,`"24"` | `vendure_facet_value_code` = `"category:tops"` | DB ids differ per env/re-seed; codes are stable. |
| Product | (n/a yet) | `vendure_product_slug` | Same principle for any future product reference. |

**Rules of the protocol:**
1. **One key per relationship** — no dual id+slug.
2. **Codes/slugs, never numeric ids.** If Vendure exposes only an id, add/lookup a code.
3. **Naming convention: `vendure_<entity>_<key-type>`**, documented once, applied everywhere (e.g. `vendure_collection_slug`, `vendure_facet_value_code`). *(Field casing — snake_case vs the current camelCase — to be ratified in Phase 0; the important part is one convention, consistently.)*
4. **Sync-created content (`collection-page`)** keeps a single stable key as its upsert identity (prefer slug; if renames must survive, keep the id *internal to the sync plugin only*, not as a second public reference).

### Pillar 3 — Concrete Execution Phases

Each phase is **isolated, independently shippable, and testable**. No phase requires a "big bang" migration.

#### Phase 0 — Conventions & Safety Net *(no schema changes; pure hardening)*
- **Goal:** stop the bleeding before restructuring.
- Add a **non-throwing fetch layer**: `strapiFetchSafe()` returns `{ data: null }` on 404 for single-types instead of throwing; callers already handle `null`.
- Add **Zod schemas** mirroring `types.ts`; validate at the `strapiFetch` boundary and log-and-fallback on mismatch (kills the unchecked cast).
- Add **shared populate presets** per content type (one source of truth for nested populate).
- **Ratify the reference-key & field-naming convention** in this doc's Pillar 2.
- **TS upgrade:** derive types from Zod (`z.infer`) so runtime and compile-time agree.
- **Test:** delete a single-type entry → page renders with the section omitted, no 500.

#### Phase 1 — Shared primitive layer *(additive, backward-compatible)*
- **Goal:** introduce `shared.cta`, `shared.media`, `shared.section-header`, `shared.color-token`.
- Keep existing fields; new blocks (Phase 3) consume the primitives.
- **TS:** add `Cta`, `Media`, `SectionHeader` interfaces (Zod-backed).
- **Safety:** `shared.color-token` is an **enum of palette keys**, resolved to CSS variables in code — removes the free-hex risk.
- **Test:** render a component fed by the new primitives against seed data.

#### Phase 2 — Reference-key remediation *(data + sync migration)*
- **Goal:** eliminate brittle keys.
- Replace `facetCategoryTile.vendureFacetValueId` (DB id) with `vendure_facet_value_code`; update the seed + the storefront resolver (`facet-category-grid`).
- Collapse `collection-page`'s dual key to a single stable identity; adjust the Vendure→Strapi collection-sync plugin accordingly.
- **Test:** re-seed from scratch in a clean DB → all category/collection links resolve (this is exactly what breaks today when DB ids shift).

#### Phase 3 — Dynamic Zone + block family *(the headline change)*
- **Goal:** introduce `section.*` blocks and the `Page` content type with a `sections` dynamic zone.
- **Unify `spotlight` + `new-arrival`** into `section.product-rail` (+ a `layout` discriminator or a `variant` field for "rail" vs "editorial banner").
- Build the **`SectionRenderer`** (discriminated union, exhaustive) and migrate `app/[channel]/page.tsx` to render `page.sections` instead of hardcoded JSX.
- Migrate existing home-page content into `Page` entries (script).
- **TS:** discriminated union `type PageSection = HeroSliderSection | ProductRailSection | …` keyed on `__component`.
- **Test:** in Strapi admin, **reorder two sections and add a third** → the storefront reflects it with **no deploy**. (Acceptance criterion for the whole project.)

#### Phase 4 — Localization & multi-channel consolidation *(structural)*
- **Goal:** replace enum-duplication with a real model.
- Enable **`@strapi/plugin-i18n`** if/when a second *language* is needed; keep **channel** as a market dimension (they are orthogonal: locale = language, channel = market/currency).
- Introduce a **base + override** pattern (or channel-scoped `Page` entries with shared referenced blocks) so brand story/values aren't duplicated per channel.
- **Test:** change shared brand copy once → both channels update; set one channel-specific hero → only that channel changes.

#### Phase 5 — Decommission & docs
- Remove the retired `spotlight` / `new-arrival` single-types once `Page` is live.
- Delete redundant `layout.nav-link` in favor of `shared.link`.
- Document the block catalog + reference-key protocol in the repo (`apps/strapi/README.md`).

---

## Risk & Sequencing Notes
- Phases 0–2 are **low-risk and independently valuable** (hardening + key fixes) and can ship before the larger Phase 3 restructure.
- Phase 3 is the behavior-visible change; do it behind the existing per-channel routes and migrate one page (`home`) first.
- Every phase has a concrete acceptance test above; nothing is "refactor and pray."
- **Vendure remains the source of truth** for products/collections/facets throughout — this plan only changes *how Strapi references and composes around* Vendure, never who owns commerce data.

---

## Appendix — Illustrative Type Upgrade (not applied)
```ts
// PROPOSED: runtime-validated, discriminated-union page model
const Cta = z.object({ label: z.string(), href: z.string(), variant: z.enum(['primary','secondary','link']).default('primary') });
const ProductRail = z.object({
  __component: z.literal('section.product-rail'),
  header: SectionHeader,
  vendure_collection_slug: z.string(),
  cta: Cta.nullable(),
});
const PageSection = z.discriminatedUnion('__component', [HeroSlider, ProductRail, EditorialBanner, BrandStory, ValuesStrip]);
export type PageSection = z.infer<typeof PageSection>;
```

---

*End of plan. No files other than this document have been created or modified. Awaiting explicit approval before implementing any phase.*
