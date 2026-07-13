# Hakeems Storefront — Architecture & Phase Plan

Status: **DRAFT — awaiting approval. No application code has been written.**

This document is the output of a full read of the current repository state (not
assumptions from the README, which is partially stale — see callouts below). It
covers the data mesh between Strapi and Vendure, a phase-by-phase build plan, state
management, and the proposed file structure for the as-yet-unbuilt `apps/storefront`.

---

## 0. Discovery Findings (ground truth as of this audit)

### 0.1 `apps/storefront` does not exist yet
`pnpm-workspace.yaml` only resolves `apps/*`, and only `apps/strapi` and `apps/vendure`
exist on disk. `package.json` at the root already references a `@hakeems/storefront`
workspace in its `dev`/`build` scripts, and `README.md` describes it prospectively
("Next.js App Router storefront with `/nepal` and `/hongkong` channel routing"), but
**none of it has been scaffolded**. Everything in this plan for the storefront app is
new work, starting from an empty directory — I've added a **Phase 0** below for this
that wasn't in the original brief but is a hard prerequisite.

### 0.2 Monorepo conventions to inherit
- pnpm workspace + Turborepo (`turbo.json`), package naming `@hakeems/<app>`.
- Node engine constraint: `>=20.11 <23` (root `package.json`) — the storefront's
  `package.json` should repeat this; avoid Node 24-only APIs.
- TypeScript, 2-space indent, single quotes, no semicolons-optional style — matches
  the style already used in `apps/vendure/src/plugins/*`.

### 0.3 Vendure (v3.7.0) — confirmed configuration
- **Channels**: `nepal` (token `nepal`, currency `NPR`) and `hongkong` (token
  `hongkong`, currency `HKD`) — created in `apps/vendure/scripts/seed.ts`. The channel
  token *is* the string used in the URL segments, which is a clean 1:1 mapping for
  routing.
- **Payments**: `dummyPaymentHandler` + a Fonepay placeholder handler (Nepal), Stripe
  via `@vendure/payments-plugin` (Hong Kong).
- **Shipping**: a custom `ShippingZonesPlugin` (zone tree + rate calculator), exposed
  only via `adminApiExtensions` — the storefront will **not** call any custom shipping
  query; it uses the standard Shop API `eligibleShippingMethods` at checkout.
- **Search**: `DefaultSearchPlugin` (Postgres-backed, in-core). No Meilisearch/Algolia
  in the stack — PLP search/filtering must use Vendure's native `search` query and
  facet aggregations, not an external search service.
- **Admin UI**: the new React **Dashboard** (`@vendure/dashboard`), not the legacy
  Angular Admin UI — irrelevant to the storefront itself, but confirms the team is on
  the current Vendure generation throughout.
- **Custom fields already public on the Shop API**:
  - `Product.enrichedDescription` / `seoTitle` / `seoDescription` (string/text, public)
  - `ProductOption.swatch` (hex string, pattern-validated, public, dashboard color
    picker) — **built in the previous session**. This is directly reusable for PDP/PLP
    color swatches (Phase 6) without any new backend work.
- `authOptions.tokenMethod: ['bearer', 'cookie']` — native Vendure session cookies are
  already enabled. This matters a lot for Phase 7 (see §3).

### 0.4 Strapi (v5.50) — confirmed schema, REST only
**No `@strapi/plugin-graphql` is installed.** Content is fetched over the REST Content
API only. Any "GraphQL for Strapi" assumption should be discarded — the data mesh
below is written for REST.

Existing content types:

| Content type | Kind | Purpose | Key fields |
|---|---|---|---|
| `site-setting` | single type | Global, channel-agnostic config | `siteName`, `tagline`, `defaultSeo`, `socialLinks[]`, `supportEmail/Phone`, `footerNote`, `legalLinks[]` |
| `home-page` | collection type, **one entry per channel** (`channel` enum: `nepal` \| `hongkong`) | Per-channel homepage content | `announcements[]`, `heroSlides[]`, `collectionTiles[]`, `storyEyebrow/Heading/Paragraphs/Image`, `values[]`, `seo` |
| `collection-page` | collection type, **auto-created/synced from Vendure** | Editorial layer over a Vendure Collection | `vendureId` (unique), `vendureCollectionSlug`, `title`, `tagline`, `description` (richtext), `heroImage`, `featured`, `sortOrder`, `seo` |

Existing components (reusable across content types):

| Component | Fields | Notes |
|---|---|---|
| `layout.announcement` | `text`, `href`, `startsAt`, `endsAt` | Already schedulable. **No `enabled` boolean yet** — see Phase 1 gap. |
| `layout.hero-slide` | `image`, `alt`, `eyebrow`, `heading`, `subheading`, `ctaLabel`, `ctaHref`, `align` | **Single `image` field only** — no distinct mobile crop. See Phase 3 gap. |
| `layout.collection-tile` | `vendureCollectionSlug`, `label`, `tagline`, `image` | Collection-based, not facet-based. See Phase 4 gap. |
| `layout.value-item` | `heading`, `body` | Brand values strip. |
| `shared.seo` | `metaTitle`, `metaDescription`, `ogImage` | |
| `shared.social-link` | `platform` (enum), `url` | |
| `shared.link` | `label`, `href` | |
| `shared.paragraph` | `text` | |

**Public read permissions** (`apps/strapi/src/utils/set-public-permissions.ts`, run on
every boot) currently grant the Public role `find`/`findOne` on exactly `home-page`,
`collection-page`, and `site-setting`. Any new content type the plan below introduces
must be added to this allow-list.

### 0.5 The sync mechanism already built (the working example of the "Data Mesh")
This is the pattern every future integration point should copy:

- **Direction**: one-way, Vendure → Strapi, **never reversed**. Vendure is the source
  of truth for *which collections/products/facets exist and which channel(s) they
  sell in*. Strapi only owns *presentation*.
- **Mechanism**: `apps/vendure/src/plugins/collection-sync/collection-sync.plugin.ts`
  subscribes to Vendure's internal `EventBus` for `CollectionEvent` (create/update/
  delete) and `POST`s `{ vendureId, name, slug }` to Strapi's
  `POST /api/collection-pages/sync`.
- **Auth**: a shared secret header (`X-Hakeems-Sync-Secret`, env `HAKEEMS_SYNC_SECRET`
  in both apps), checked in `collection-page.sync` controller action — not the
  users-permissions Public role.
- **Idempotency / ownership split**: on update, only `vendureCollectionSlug` is kept in
  sync automatically; `title` is left alone once an editor has customized it, so
  Vendure renaming a collection's internal code never clobbers marketing copy.
- **Note (superseded)**: the README still describes an older `product-reference` /
  Strapi-webhook-back-to-Vendure design (`POST /webhooks/strapi`, `Vendure sync
  plugin` writing editorial fields into Vendure custom fields). That code has been
  **deleted** from the working tree in favor of the simpler one-way collection-sync
  above. The README is stale on this point; this plan reflects the code, not the doc.

---

## 1. Data Mesh Strategy: Strapi (presentational) vs. Vendure (transactional)

**Rule**: Vendure never depends on Strapi to function (checkout, pricing, inventory,
tax all resolve with zero Strapi calls). Strapi never stores a price, stock level, or
anything that would go stale relative to Vendure. The two are joined at render time in
the storefront using plain string/id reference fields — never a database-level foreign
key, since they're different systems.

| Join key | Lives in | Points at | Used for |
|---|---|---|---|
| `vendureCollectionSlug` | Strapi `collection-page`, `layout.collection-tile` | Vendure `Collection.slug` | PLP editorial banner, homepage "shop by collection" tiles |
| `vendureId` | Strapi `collection-page` | Vendure `Collection.id` | Stable identity for the sync webhook (slugs can be renamed) |
| `vendureFacetValueId` *(new, Phase 4)* | Strapi `layout.facet-category-tile` | Vendure `FacetValue.id` | Visual category grid tiles that filter by facet rather than collection |
| `vendureSpotlightCollectionSlug` *(new, Phase 5)* | Strapi spotlight block | Vendure `Collection.slug` | Live product pull for the quick-add spotlight |
| (implicit) `channel` enum | Strapi `home-page.channel` | Vendure channel token (`nepal`/`hongkong`) | Per-channel homepage variants |

**Fetch orchestration per page** (all server-side, in React Server Components):

1. Resolve the active channel token from the URL (`/nepal` or `/hongkong`) in
   middleware, *before* any data fetching starts (see §3.1 — this is what prevents
   layout shift).
2. Fire the Strapi REST fetch (editorial: hero slides, tiles, copy) and the Vendure
   Shop API GraphQL fetch (transactional: prices, stock, facets) **in parallel** —
   there is no ordering dependency between them; they're joined client-side-of-render
   by matching slugs/ids, not chained sequentially.
3. Merge: for every Strapi tile/slide that carries a `vendureCollectionSlug` or
   `vendureFacetValueId`, resolve the corresponding live Vendure node from the
   parallel fetch's result set (by slug/id match in-memory) — never a second
   round-trip per tile.
4. If a Strapi reference points at a Vendure slug/id that no longer exists (deleted
   collection, facet value renamed), **fail soft**: drop that tile from the grid and
   log a warning server-side, never 500 the page.

---

## 2. Detailed Technical Phases

Each phase below states: what already exists (reuse), what's missing (build), the
exact Strapi schema change (if any), the Vendure GraphQL shape needed, and the
frontend behavior contract.

### Phase 0 — Storefront Scaffold *(prerequisite, not in original brief)*
- `apps/storefront`: Next.js 15 (App Router), TypeScript, Tailwind CSS v4.
- `middleware.ts`: parses the first path segment against a static `{nepal, hongkong}`
  map; 404s (or redirects to a channel picker) for anything else. Resolves the
  Vendure channel token and a locale/currency pair *before* rendering — stored in a
  cookie so client components never have to re-derive it.
- Vendure Shop API client: `graphql-request` + `@graphql-codegen` generating types
  from the live `shop-api` schema (mirrors the pattern already used for the Dashboard
  in `apps/vendure/vite.config.mts`'s `gqlOutputPath` — same tooling family, kept
  consistent across the monorepo).
- Strapi client: a small typed REST wrapper (`fetch` + `qs`-style `populate` builder),
  not a generated SDK — Strapi 5's REST shape doesn't warrant codegen at this scale.
- `.env.example`: `VENDURE_SHOP_API_URL`, `STRAPI_API_URL`, `STRAPI_API_TOKEN`
  (read-only API token, not the admin JWT), per-channel defaults.
- Base design tokens: type scale, spacing scale, color palette — establish the
  Skims/Athleta-grade minimalist system (generous whitespace, hairline borders,
  restrained motion) once, in Tailwind config, so every later phase inherits it
  instead of re-deciding it per component.

### Phase 1 — Channel-Aware Announcement Bar
- **Reuse**: `home-page.announcements[]` (`layout.announcement`) already exists and is
  already scoped per channel (one `home-page` entry per channel, each with its own
  announcement list) and already schedulable (`startsAt`/`endsAt`).
- **Schema change needed**: add `enabled: boolean` (default `true`) to
  `layout.announcement`. Without it, "turning it off" means deleting the entry, which
  loses the copy — a dedicated toggle is a one-field addition, not a new content type.
- **Vendure query**: none — this phase is Strapi-only.
- **Frontend behavior**: server-rendered marquee/bar, filters to
  `enabled && (no window set, or now is within startsAt/endsAt)`, multiple
  announcements auto-rotate or stack per design; zero client JS required for the
  initial render (hydrate only for rotation timer / dismiss-and-remember-in-cookie).

### Phase 2 — High-Aesthetic Responsive Nav Bar
- **Gap**: there is no existing Strapi content type for primary navigation. `Link`/
  `SEO` shared components exist but nothing models a nav tree.
- **Schema change needed**: new single type per channel or a `mainNav` component
  array on `home-page` (recommend a small new single type `site-nav` scoped by
  channel, since nav is reused across every route, not just the homepage) — a
  repeatable `nav-item` component (`label`, `href`, optional `children[]` for one
  level of flyout).
- **Vendure query**: `activeOrder { totalQuantity }` (for the cart badge count) —
  cheap, cached, revalidated on every cart mutation.
- **Frontend behavior**: sticky/hairline-bordered bar, logo, primary links from
  Strapi, search trigger (opens command-palette-style overlay, Phase 6 wires it to
  real search), cart icon with live count opening the slide-out (Phase 6 builds the
  drawer body), mobile: full-screen slide-in menu, no layout shift between
  server-rendered shell and client-hydrated interactive bits (render the static shell
  server-side; only the drawers are client components).

### Phase 3 — Editorial Hero Image Slider
- **Reuse**: `home-page.heroSlides[]` (`layout.hero-slide`) already has
  `image/alt/eyebrow/heading/subheading/ctaLabel/ctaHref/align`.
- **Schema change needed**: add an optional `imageMobile` media field to
  `layout.hero-slide`. Strapi's auto-generated `formats` (thumbnail/small/medium/
  large) are resized copies of the *same crop* — they don't give art direction for a
  portrait mobile viewport of a landscape desktop banner. A second, optional upload
  covers the case; fall back to `image` when `imageMobile` is empty.
- **Vendure query**: none — purely editorial.
- **Frontend behavior**: `next/image` with `sizes`, explicit `width`/`height` (or
  `fill` inside an aspect-ratio box) reserved from the first paint — this is the
  single highest-risk spot for CLS on the whole homepage, so it gets an explicit
  reserved-space contract, not "figure it out from the image."

### Phase 4 — Facet-Based Visual Category Grids
- **Gap**: `layout.collection-tile` only models a Vendure *collection* slug, not a
  *facet value*. The brief explicitly asks for facet-tree-mapped tiles (e.g., a grid
  driven by a "Category" facet's values, independent of collection structure).
- **Schema change needed**: new component `layout.facet-category-tile`
  (`vendureFacetValueId`, `label`, `image`, optional `tagline`), added as a repeatable
  field on `home-page` (or its own small collection type if reused outside the
  homepage, e.g. on a future "Shop" landing page).
- **Vendure query**: `facetValues(options: { filter: { id: { in: [...] } } })` for
  labels/counts, or resolve products via
  `search(input: { facetValueFilters: [{ and: facetValueId }] })` for a live count
  badge per tile.
- **Frontend behavior**: grid of image tiles, each linking to a PLP route pre-filtered
  by that facet value (`?facet=<id>`); optional live "N items" count fetched
  server-side alongside the tile so it never pops in after the image.

### Phase 5 — Athleta-Inspired Spotlight & Brand Statement
- **Gap**: nothing existing models "one live collection, shown with quick-add,
  paired with editorial typography."
- **Schema change needed**: new component (or single type) `spotlight-block`:
  `vendureCollectionSlug`, `eyebrow`, `heading`, `body` (richtext or
  `shared.paragraph[]`), `ctaLabel/Href`, layout variant (`image-left`/`image-right`).
  Added to `home-page` as a repeatable zone, or its own reusable block if the design
  wants spotlights on category pages too.
- **Vendure query**: `collection(slug: $slug) { productVariants(options: { take: N })
  { ...variant fields, price, featuredAsset, product { optionGroups { options {
  customFields { swatch } } } } } }` — the `swatch` custom field from the
  ProductOption work directly powers the color-dot quick-add UI here.
- **Frontend behavior**: horizontally-scrollable or grid product rail, each card has
  an inline quick-add (size/color picker as a popover, not a full PDP navigation),
  `addItemToOrder` mutation fired optimistically with rollback on error, paired
  alongside a static typography block (no CLS risk — text has no async dependency).

### Phase 6 — Core E-Commerce Pages (PLP / PDP / Cart / Checkout)
All four are Vendure-first; Strapi contributes only the editorial banner + SEO
metadata layer on PLP via `collection-page`.

- **PLP** (`/[channel]/collections/[slug]`): `collection(slug) { name, description,
  breadcrumbs, productVariants(...) }` plus `search(input: { collectionSlug,
  groupByProduct: true, facetValueFilters })` for filtering/facet counts. Strapi
  `collection-page` (matched by `vendureCollectionSlug`) supplies `heroImage`,
  `tagline`, `seo`. Facet sidebar built from `search.facetValues`.
- **PDP** (`/[channel]/products/[slug]`): `product(slug) { name, description,
  customFields { enrichedDescription, seoTitle, seoDescription }, variants { price,
  stockLevel, options { name, customFields { swatch } } }, assets }`. Color options
  render as swatches directly from `ProductOption.customFields.swatch` (built
  previously) instead of plain text buttons — this is the direct payoff of that
  earlier backend work.
- **Cart** (`/[channel]/cart`, plus the nav slide-out from Phase 2):
  `activeOrder { lines { ... }, totalWithTax, shippingWithTax }`,
  `adjustOrderLine`, `removeOrderLine`.
- **Checkout**: multi-step (address → shipping → payment), backed by
  `eligibleShippingMethods`, `setOrderShippingMethod`, `eligiblePaymentMethods`,
  channel-aware payment step (Stripe Elements for `hongkong`, Fonepay redirect flow
  for `nepal` — this bifurcation is unavoidable given the seeded payment handlers and
  must be a first-class branch in the checkout step, not an afterthought).

### Phase 7 — Centralized Authentication
- **Recommendation: use Vendure's native customer-account session, not Auth.js.**
  `authOptions.tokenMethod` already includes `'cookie'`, and Vendure's Shop API
  already ships `login`, `logout`, `register`, `verifyCustomerAccount`,
  `requestPasswordReset`, `resetPassword`, and `currentUser` — plus automatic guest
  → customer order transfer on login. Layering Auth.js on top would mean
  reconciling two session stores for zero functional gain; it would only make sense
  if the storefront needed non-Vendure identity providers (social login) that
  Vendure doesn't natively broker, which is out of scope here.
- **Frontend behavior**: Server Actions / Route Handlers proxy the Shop API mutations
  and forward/set the Vendure session cookie (`httpOnly`, scoped appropriately); the
  same cookie already carries the guest cart, so login is a zero-migration event from
  the cart's point of view.

---

## 3. State Management & Core Utilities

### 3.1 Channel / country context — resolved once, server-side, before paint
The channel is derived from the URL in `middleware.ts`, not from a client-side
`useEffect` or a flash-of-default-channel render. It's written to a cookie
(`hakeems-channel`) so:
- Server Components read it directly from the request for their Vendure fetch
  (`vendure-token` header) and Strapi fetch (`channel` filter) — no round-trip needed
  to "find out" the channel after first paint.
- Client Components read the same value via a tiny server-provided context value
  embedded in the root layout (not re-fetched), so there's never a render where the
  UI shows one channel's currency/copy and then swaps to another's.

### 3.2 Cart state — Vendure-owned, optimistic UI on top
- Source of truth: Vendure `activeOrder`, tied to the session cookie from §0.3/§3.1.
  The frontend does not maintain a parallel source of truth for totals/tax/stock.
- A thin client store (React context or Zustand — small enough that either is fine;
  Zustand only if the team wants devtools/selectors) holds *only* transient UI state
  (is the drawer open, an optimistic item count bump before the mutation resolves)
  — never the authoritative cart contents.
- Nav badge count is rendered from the server on first load (no flash of "0"); client
  mutations (add/remove) update the count optimistically, then reconcile against the
  mutation's actual response.

### 3.3 Auth session
- Same Vendure session cookie as cart (§3.2) — logging in does not require
  re-fetching or migrating cart state, Vendure does this server-side automatically.
- `currentUser` is fetched once per request server-side and passed down; no client
  polling for auth state.

### 3.4 Avoiding layout shift, as a cross-cutting rule
Every phase above that renders an image (hero slides, tiles, spotlight, PDP gallery)
must reserve its box (explicit aspect-ratio container) before the asset resolves —
Strapi media objects already carry `width`/`height` in their response, so this is
available for free and should be threaded through every image-rendering component
rather than re-derived per page.

---

## 4. Proposed File Structure (`apps/storefront`)

```
apps/storefront/
  middleware.ts                     # channel/country resolution, before any render
  next.config.ts
  tailwind.config.ts
  .env.example
  src/
    app/
      [channel]/
        layout.tsx                  # channel context provider, nav + announcement bar shell
        page.tsx                    # homepage (Phases 1, 3, 4, 5)
        collections/[slug]/page.tsx # PLP (Phase 6)
        products/[slug]/page.tsx    # PDP (Phase 6)
        cart/page.tsx               # Phase 6
        checkout/page.tsx           # Phase 6
        account/
          login/page.tsx            # Phase 7
          register/page.tsx
          recover/page.tsx
          orders/page.tsx
    components/
      marketing/                    # announcement bar, hero slider, facet tiles, spotlight
      commerce/                     # product card, swatch picker, cart drawer, facet sidebar
      nav/                          # nav bar, mobile menu, search overlay
      ui/                           # design-system primitives (button, input, dialog)
    lib/
      vendure/
        client.ts                   # graphql-request instance, channel-token-aware
        codegen.ts / generated.ts   # graphql-codegen output against shop-api
        queries/                   # .graphql documents per phase
      strapi/
        client.ts                  # typed REST wrapper + populate helper
        types.ts                   # hand-written types mirroring the schemas in §0.4
      channel.ts                   # channel <-> token/currency/locale table (single source)
      session.ts                   # cookie helpers shared by cart + auth
    styles/
      globals.css                  # Tailwind entry, design tokens from Phase 0
```

---

## 5. Execution Guardrails (carried into every phase)

- Minimalist, high-contrast-on-restraint aesthetic: generous whitespace, hairline
  (1px, low-opacity) borders instead of shadows/cards where possible, understated
  hover states (opacity/underline shifts, not color-inverting buttons), no more than
  one accent color active per viewport.
- Mobile-first: every component built and reviewed at 375px width first, then scaled
  up — not the reverse.
- No phase ships an image-bearing component without an explicit reserved aspect
  ratio (§3.4).
- Every new Strapi content type/component change in this plan must be added to
  `PUBLIC_READ_ACTIONS` in `set-public-permissions.ts`, or the storefront will get
  403s in production despite working locally (local admin sessions mask this).

---

## Summary of New Backend Work This Plan Requires (for your approval)

| # | Change | App | Size |
|---|---|---|---|
| 1 | Add `enabled: boolean` to `layout.announcement` | Strapi | trivial |
| 2 | New `site-nav` single type + `nav-item` component | Strapi | small |
| 3 | Add `imageMobile` media field to `layout.hero-slide` | Strapi | trivial |
| 4 | New `layout.facet-category-tile` component + field on `home-page` | Strapi | small |
| 5 | New `spotlight-block` component + field on `home-page` | Strapi | small |
| 6 | Extend `set-public-permissions.ts` allow-list for any new content types above | Strapi | trivial |
| 7 | Scaffold `apps/storefront` from scratch (Phase 0) | Storefront | large |

Nothing above touches Vendure beyond what's already shipped (channels, payment
handlers, `ProductOption.swatch`, `DefaultSearchPlugin`) — the transactional side is
already ready for a storefront to be built against it.

**Awaiting your approval to begin Phase 0.**
