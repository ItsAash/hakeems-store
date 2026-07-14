# Hakeems CMS (Strapi 5)

Strapi is the **content/presentation** layer for the Hakeems storefront. **Vendure owns all
commerce** (products, collections, facets, prices, stock); Strapi owns editorial content and
page composition, and references Vendure by **stable string keys** (never database ids).

Responses use Strapi 5's **flattened** format (no `data.attributes` nesting). The storefront
consumes them through a typed, runtime-validated layer — see
`apps/storefront/src/lib/strapi/{schemas,types,queries,client}.ts`.

---

## Content types

| Type | Kind | Purpose |
|------|------|---------|
| **page** | collection (per `slug` + `channel`) | Composable page — a **dynamic zone** of section blocks. Primary home-page composition. |
| **brand-story** | single (global) | Shared, channel-agnostic brand story (base for `section.brand-story`). |
| **site-setting** | single (global) | Site name, tagline, default SEO, socials, support contacts, footer/legal links. |
| **site-nav** | collection (per channel) | Primary nav items (+ one level of flyout children). |
| **collection-page** | collection (Vendure-synced) | Editorial layer (banner/tagline/copy/featured) over a Vendure collection. |
| **home-page** | collection (per channel) | Announcement marquee + hero/facet-tile content. *(See "Legacy fields" below.)* |

> **Legacy fields (follow-up cleanup):** `home-page.{storyEyebrow,storyHeading,storyParagraphs,storyImage}`
> are **superseded by the global `brand-story`** and are currently only read as the seed source;
> `collectionTiles` and `values` are unused. They're safe to remove once the seed hardcodes the
> brand story. `home-page` is otherwise retained for **announcements** (read by the channel layout)
> and as the **seed source** for the Page's hero slides + facet tiles.

---

## Section block catalog (`page.sections` dynamic zone)

Each block maps to a React renderer via `SectionRenderer`
(`apps/storefront/src/components/sections/section-renderer.tsx`), keyed on `__component`.

| Block | Fields | Renders |
|-------|--------|---------|
| `section.hero-slider` | `slides[]` (`layout.hero-slide`) | Full-bleed hero image slider |
| `section.category-grid` | `header` (`shared.section-header`), `tiles[]` (`layout.facet-category-tile`) | "Shop by category" facet-tile grid |
| `section.product-rail` | `header`, `vendureCollectionSlug`, `cta` (`shared.cta`) | Horizontal product carousel for a Vendure collection |
| `section.editorial-banner` | `header`, `vendureCollectionSlug`, `cta`, `backgroundToken` | Full-bleed split banner (text + product-image montage) |
| `section.brand-story` | `header?`, `paragraphs?`, `image?` (all optional overrides) | The shared global brand story (see base+override) |

## Shared primitive components (`shared.*`)

Reusable building blocks — use these instead of ad-hoc fields:

- `shared.cta` — `{ label, href, variant: primary|secondary|link, openInNewTab }`
- `shared.section-header` — `{ eyebrow?, heading, subheading?, align: left|center }`
- `shared.media` — `{ image, imageMobile?, alt? }`
- `shared.link` — `{ label, href }` (the single link shape; `layout.nav-link` was removed)
- `shared.paragraph` — `{ text }`
- `shared.seo` — `{ metaTitle?, metaDescription?, ogImage? }`
- `shared.social-link` — `{ platform (enum), url }`

---

## Reference-key protocol (Strapi → Vendure)

**Strapi never stores a Vendure database id.** It stores an immutable, environment-stable
key, and the storefront resolves it against the Vendure Shop API at render time.

| Relationship | Key | Example |
|--------------|-----|---------|
| Collection | `vendureCollectionSlug` | `"spotlight"`, `"new-arrivals"` |
| Facet value | `vendureFacetValueCode` = `"<facetCode>:<valueCode>"` | `"categories:tops"` |

- One key per relationship (no dual id+slug — `collection-page.vendureId` is now a **private**,
  sync-only internal key, not a public reference).
- Codes/slugs only, never numeric ids (ids drift across environments/re-seeds).
- The category grid resolves `categories:tops` → the live facet-value id via a `FacetValues`
  query at render time (`FacetCategoryGrid`).

---

## Base + override (shared content)

Content shared across channels lives in a **global single-type**; a per-page block may
**override** it. Example — `brand-story`:

- The global `brand-story` single-type holds the shared copy (authored once).
- `section.brand-story` renders it by default; set the block's `header`/`paragraphs` to
  override for one page/channel (`override ?? shared`, field-level).

Edit the global story once → every channel updates. This is the template for any future
shared section.

---

## Vendure → Strapi sync

One-way. Vendure's `CollectionSyncPlugin` pushes `{vendureId, name, slug}` to
`POST /api/collection-pages/sync` (shared-secret header) whenever a collection is created,
renamed, or deleted. Vendure owns which collections exist; Strapi owns their presentation.

---

## Localization & channels

`channel` (`nepal` | `hongkong`) is a **market** dimension (currency/region), modelled as an
enum field + filter. It is **orthogonal to language**. Both markets are currently English, so
`@strapi/plugin-i18n` is **not enabled** — it's the future path for adding a *language*
(e.g. Nepali, Traditional Chinese) and can be turned on without disturbing the channel model.

---

## Adding a new section block

1. Create `src/components/section/<name>.json` (reuse `shared.*` primitives).
2. Add `section.<name>` to `page.sections.components` in `api/page/content-types/page/schema.json`.
3. Storefront: add a Zod member to `pageSectionSchema` (with a `__component` literal) in
   `lib/strapi/schemas.ts`, add its deep-populate entry to `PAGE_POPULATE` in `lib/strapi/queries.ts`,
   and add a `case` + renderer in `SectionRenderer`. The switch is exhaustive — TypeScript will
   flag the missing case until you handle it.
4. Restart Strapi (registers the component), then author it in the admin.

---

## Seeding

`pnpm --filter @hakeems/strapi seed` (or root `pnpm seed`, which runs Vendure first). Seeders
are idempotent. `seedPages` composes each channel's Page from seeded content; run **after**
Vendure's seed so collections exist for the sync.

---

## Strapi CLI

`pnpm dev` (alias for `strapi develop`, autoReload) · `pnpm build` · `pnpm start`.
Admin at `http://localhost:1337/admin`. See the [Strapi docs](https://docs.strapi.io).
