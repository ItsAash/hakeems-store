# Vendure → Medusa Migration Plan

## Overview

Migrate from Vendure v3.7.0 to Medusa for the Hakeems clothing brand commerce backend. The migration preserves all custom business logic (shipping zones, stock management, collection sync, etc.) using Medusa-native patterns: **Modules → Workflows → API Routes**.

## Architecture Mapping

| Vendure Concept | Medusa Equivalent |
|---|---|
| Channel (nepal/hongkong) | Sales Channel |
| Collection | Product Collection |
| Product Option (Color, Size) | Product Option |
| ProductOption.customFields.swatch | ProductOptionValue.metadata or custom module |
| StockLocation (warehouse) | Stock Location (built-in) |
| PaymentMethod (Stripe, Fonepay) | Payment Provider |
| ShippingMethod + Calculator | Fulfillment Provider + Shipping Option |
| EventBus (CollectionEvent) | Subscriber (product/collection events) |
| customFields.Address.shippingZoneId | Address.metadata |
| Dashboard UI extensions | Admin Widgets |
| Admin/Shop API resolvers | Admin/Store API Routes |
| Custom entities (ShippingZoneNode) | Custom Module + Data Model |
| NestJS @Resolver/@Mutation | API Route (route.ts) + Workflow |
| NestJS @Injectable service | Module Service |
| TransactionalConnection | Medusa's query + module services |
| DefaultSearchPlugin | Search Module (built-in) |

## Migration Phases

---

## Phase 0: Scaffold Medusa App

Create a new Medusa app alongside the existing Vendure app (keep both running during migration).

```
apps/medusa/
├── src/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── shipping-zones/
│   │   │   └── stock/
│   │   ├── store/
│   │   │   └── shipping-zones/
│   │   └── middlewares.ts
│   ├── modules/
│   │   ├── shipping-zone/
│   │   ├── fonepay/
│   │   └── collection-sync/
│   ├── subscribers/
│   │   └── collection-sync.ts
│   ├── workflows/
│   │   ├── shipping-zones/
│   │   └── stock/
│   ├── admin/
│   │   ├── widgets/
│   │   └── routes/
│   └── links/
│       ├── shipping-zone-stock-location.ts
│       └── shipping-zone-address.ts
├── medusa-config.ts
└── package.json
```

**Setup commands:**
```bash
# Create medusa app
npx create-medusa-app@latest apps/medusa --template minimal
# Or manually set up with:
# medusa new apps/medusa
```

---

## Phase 1: Shipping Zones Plugin (CUSTOM MODULE)

**Vendure source:** `src/plugins/shipping-zones/`

**Why a custom module:** The hierarchical zone tree with self-referential parent/children, per-warehouse rate resolution, and address matching is entirely custom — no Medusa built-in covers this.

### 1.1 Data Model: `ShippingZoneNode`

```typescript
// src/modules/shipping-zone/models/shipping-zone-node.ts
import { model } from "@medusajs/framework/utils"

const ShippingZoneNode = model.define("shipping_zone_node", {
  id: model.id().primaryKey(),
  name: model.text(),
  code: model.text(),
  enabled: model.boolean().default(true),
  rate: model.number().nullable(),
  parent_id: model.text().nullable(),
  stock_location_id: model.text(),
  // rank for ordering siblings
  rank: model.number().default(0),
})
```

### 1.2 Links

```typescript
// src/links/shipping-zone-stock-location.ts
import { defineLink } from "@medusajs/framework/utils"
import ShippingZoneModule from "../modules/shipping-zone"

export default defineLink(
  ShippingZoneModule.linkable.shippingZoneNode,
  { linkable: "stock_location", isList: true }
)
```

### 1.3 Module Service

```typescript
// src/modules/shipping-zone/service.ts
class ShippingZoneModuleService extends MedusaService({
  ShippingZoneNode,
}) {
  // Custom methods: buildTree(), resolveRate(), getTreeForActiveChannel()
}
```

### 1.4 Workflows

| Workflow | Purpose |
|---|---|
| `createShippingZoneNodeWorkflow` | Create node with sibling code-uniqueness validation |
| `updateShippingZoneNodeWorkflow` | Update node, re-validate leaf-only rate constraint |
| `deleteShippingZoneNodeWorkflow` | Cascade delete (self-referential FK with CASCADE) |
| `resolveShippingRateWorkflow` | Rate resolution for a given order address |

### 1.5 API Routes

| Route | Method | Purpose |
|---|---|---|
| **Admin** | | |
| `/admin/shipping-zones/:stock_location_id` | GET | Get zone tree for a warehouse |
| `/admin/shipping-zones` | POST | Create zone node |
| `/admin/shipping-zones/:id` | POST | Update zone node |
| `/admin/shipping-zones/:id` | DELETE | Delete zone node |
| **Store** | | |
| `/store/shipping-zones` | GET | Get enabled zones for active channel |

### 1.6 Fulfillment Provider

Register a custom fulfillment provider that uses `resolveShippingRateWorkflow`:
- `isEligible`: Check if address has province
- `calculateRate`: Call the resolve workflow → return rate

### 1.7 Data Migration

```sql
-- Map ShippingZoneNode from Vendure to Medusa
INSERT INTO shipping_zone_node (id, name, code, enabled, rate, parent_id, stock_location_id)
SELECT id, name, code, enabled, rate, parent_id, stock_location_id
FROM vendure_shipping_zone_node;
```

---

## Phase 2: Stock Management (ADMIN API + WORKFLOW)

**Vendure source:** `src/plugins/stock-management/`

Medusa has built-in inventory management + stock locations. We only need:
1. A custom **transfer stock** workflow (moves stock between locations)
2. The admin dashboard page

### 2.1 Workflow

```typescript
// src/workflows/stock/transfer-stock.ts
// Steps:
// 1. Validate source !== destination
// 2. Check available stock (stock_on_hand - allocated)
// 3. Decrement source, increment destination
// Uses: built-in InventoryModule service
```

### 2.2 API Route

| Route | Method | Purpose |
|---|---|---|
| `/admin/stock/transfer` | POST | Transfer stock between warehouses |

### 2.3 Dashboard

The existing stock overview page maps naturally to Medusa's admin widgets:
- Use `sdk.admin.productVariant.list()` for variants with inventory
- Use `sdk.admin.stockLocation.list()` for warehouses
- Custom widget on product variant detail or standalone admin route

---

## Phase 3: Collection Sync (SUBSCRIBER)

**Vendure source:** `src/plugins/collection-sync/`

### 3.1 Subscriber

```typescript
// src/subscribers/collection-sync.ts
export default async function collectionSyncHandler({
  event: { eventName, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  // Listen to: product_collection.created, .updated, .deleted
  // Fetch collection data via query.graph
  // POST to Strapi endpoint with shared-secret header
}
```

**Events to subscribe to:**
- `product_collection.created`
- `product_collection.updated`
- `product_collection.deleted`

**Note:** Medusa uses `product_collection` not `collection`. The subscriber receives the collection ID; use `query.graph` to retrieve name and handle.

---

## Phase 4: Product Option Swatch (CUSTOM FIELD / MODULE)

**Vendure source:** `src/plugins/product-option-swatch/`

### Option A: Use Medusa Metadata (Simpler)

Add a metadata convention on `ProductOptionValue`:
```
metadata: { swatch: "#1A365D" }
```

The storefront reads `option_value.metadata.swatch`.

### Option B: Custom Module (Stronger Typing)

Create a `productOptionSwatch` module with:
```typescript
const ProductOptionSwatch = model.define("product_option_swatch", {
  id: model.id().primaryKey(),
  option_value_id: model.text(),
  hex: model.text(),  // ^#[0-9A-Fa-f]{6}$
})
```

Link it to `ProductOptionValue` via module link.

**Recommendation:** Use Option A (metadata) for speed. The swatch field is purely presentational — the storefront reads it at render time. No validation logic needs to run server-side.

---

## Phase 5: Product Asset Manager (ADMIN WIDGET)

**Vendure source:** `src/plugins/product-asset-manager/`

Pure UI plugin — maps to a Medusa admin widget on the product detail page.

**Widget location:** `src/admin/widgets/product-media.tsx`

**Features to replicate:**
- Bulk image upload using `sdk.admin.upload.create()`
- Reorder images using `sdk.admin.product.update()` with reordered `images`
- Color-based image assignment: custom UI that calls `sdk.admin.productVariant.batch()` to set `images` per variant

**Medusa admin widget placement:** Product detail `main` section.

---

## Phase 6: Product Variant Editor (ADMIN WIDGET)

**Vendure source:** `src/plugins/product-variant-editor/`

Pure UI plugin — maps to a Medusa admin widget on the product variants page.

**Widget location:** `src/admin/widgets/product-variant-grid.tsx`

**Features to replicate:**
- Spreadsheet-style grid using `sdk.admin.product.retrieve()` with variants/options
- Inline editing + fill-down
- Paste from spreadsheet
- Bulk create/update using `sdk.admin.productVariant.batch()`

**Medusa note:** Medusa's admin dashboard already has a product variants editor. This widget **replaces or augments** it with the spreadsheet/Excel-like experience.

---

## Phase 7: Fonepay Payment Provider (CUSTOM MODULE)

**Vendure source:** `src/plugins/fonepay-placeholder/`

### 7.1 Payment Provider Module

```typescript
// src/modules/fonepay/index.ts
// Register as a payment provider
// For now: placeholder that always settles (same as Vendure)
// Later: real Fonepay API integration with HMAC signing + redirect flow
```

Medusa's payment provider pattern:
```typescript
class FonepayProviderService extends AbstractPaymentProvider {
  static identifier = "fonepay"

  async capture payment() { /* ... */ }
  async initiatePayment() { /* ... */ }
  // etc.
}
```

---

## Phase 8: Custom Product Fields

**Vendure custom fields to migrate:**

| Vendure Field | Medusa Strategy |
|---|---|
| `enrichedDescription` | `Product.metadata.enriched_description` |
| `seoTitle` | Product SEO module or metadata |
| `seoDescription` | Product SEO module or metadata |
| `fitAndFabric` | `Product.metadata.fit_and_fabric` |
| `shippingReturns` | `Product.metadata.shipping_returns` |
| `discountPercent` | Medusa has built-in sales/ch promotions — use Sale module |
| `promoLabel` | `Product.metadata.promo_label` |
| `badge` | `Product.metadata.badge` |

---

## Phase 9: Channels & Seed Data

### Sales Channels
```typescript
// Seed script creates:
// - "nepal" channel (NPR currency)
// - "hongkong" channel (HKD currency)
```

### Payment Providers
- Hong Kong → Stripe (Medusa has `@medusajs/medusa/payment/stripe`)
- Nepal → Fonepay (custom provider from Phase 7)

### Fulfillment
- Per-channel fulfillment sets using shipping zone tree

### Stock Locations
- Nepal warehouse
- Hong Kong warehouse

---

## Data Migration Strategy

### Export from Vendure (PostgreSQL)
```bash
# Dump relevant tables
pg_dump -t shipping_zone_node -t product -t product_variant -t product_option -t product_option_group -t collection -t stock_location hakeems_vendure > vendure-data.sql
```

### Transform
- Map IDs (Vendure auto-increment → Medusa ULID)
- Map channels → sales channels
- Map custom fields → metadata
- Map products/collections → Medusa format (collections, products, variants, options, values)

### Import to Medusa
Use the Medusa Admin/Store API or write an import workflow that calls module services.

---

## Migration Order (Recommended Build Sequence)

```
Phase 0: Scaffold Medusa app
    ↓
Phase 1: Shipping Zones module (most complex, requires custom module)
    ↓
Phase 3: Collection Sync subscriber (simple, quick win)
    ↓
Phase 7: Fonepay placeholder payment provider (blocker for Nepal checkout)
    ↓
Phase 8: Custom product fields (metadata conventions)
    ↓
Phase 9: Channels + seed script + data migration
    ↓
Phase 2: Stock management (uses built-in inventory)
    ↓
Phase 4: Product option swatch (trivial — metadata)
    ↓
Phase 5: Product asset manager widget (UI-only)
    ↓
Phase 6: Product variant editor widget (UI-only)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Shipping zone tree has complex rate resolution | High | Migrate first, test thoroughly with edge cases |
| Data migration ID mapping errors | High | Dry-run export → transform → validate → import |
| Fonepay real integration needed | Medium | Start with placeholder (same as current), integrate later |
| Admin dashboard widgets need Medusa widget API | Low | Well-documented widget API, phased approach |
| Storefront needs to be updated | Medium | Storefront not yet built (per STOREFRONT_PLAN.md) — build against Medusa from start |

## Testing Strategy

1. Each module: unit tests for service methods
2. Each workflow: integration test with rollback validation
3. API routes: cURL/Postman against local Medusa instance
4. End-to-end: run seed script → verify all API responses match current Vendure behavior
5. Admin UI: visual verification of each widget

## Rollback Plan

Keep the Vendure app running in parallel. Both databases can coexist. The storefront reads from one backend at a time via env config. Switch happens only after:
- All phases complete and tested
- All data migrated and verified
- Admin team trained on new dashboard
