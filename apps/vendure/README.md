# Hakeems Vendure Backend

Vendure commerce backend for Nepal and Hong Kong.

## Setup

```bash
cp .env.example .env
pnpm dev
pnpm worker
pnpm seed
```

## Admin

- Dashboard: `http://localhost:3000/dashboard`
- Username: `superadmin`
- Password: `superadmin`

## Channels

The seeder creates:

- `nepal`: NPR, Nepal tax/shipping zone, Nepal stock location, Fonepay placeholder payment method.
- `hongkong`: HKD, Hong Kong tax/shipping zone, Hong Kong stock location, Stripe payment method.

Both channels use `pricesIncludeTax: true`. Tax rates are seeded as Vendure `TaxRate` records so they are editable in Dashboard rather than hardcoded.

## District Shipping

`src/plugins/channel-shipping/district-shipping.ts` defines:

- `hakeems-district-eligibility-checker`
- `hakeems-district-shipping-calculator`

Each shipping method stores a JSON rates map in calculator args. Adding a district/city is a data/config change:

```json
{"kathmandu":25000,"lalitpur":28000,"pokhara":32000}
```

The calculator uses `order.shippingAddress.province` and falls back to the configured fallback rate.

## Strapi Sync

Vendure to Strapi:

- `StrapiSyncPlugin` listens to `ProductEvent`.
- Sends only identity fields: `vendureId`, title, handle, thumbnail URL, channel.
- Logs sync failures without blocking product creation or editing.

Strapi to Vendure:

- `POST /webhooks/strapi`
- Header: `X-Hakeems-Sync-Secret: $HAKEEMS_SYNC_SECRET`
- Stores `enrichedDescription`, `seoTitle`, `seoDescription` in product custom fields.
- Skips no-op writes to avoid unnecessary ProductEvents.

## Payment

Stripe is configured through the official Vendure Stripe plugin package and should be assigned only to the Hong Kong channel by the seed script. Nepal has a clearly marked `fonepay-placeholder` handler that settles test orders only and must be replaced before production.
