# Hakeems Strapi CMS

Strapi owns editorial product content and events. It does not own commerce truth such as prices or stock.

## Content Model

- Product Reference: `vendureId`, title, handle, thumbnail URL, channel, syncedAt, plus editorial `enrichedDescription`, `seoTitle`, `seoDescription`.
- Event: title, slug, description, bannerImage, eventDate, location, channel, status, featured Product References.

## Setup

```bash
cp .env.example .env
pnpm dev
```

The database is `hakeems_strapi`, separate from Vendure's database.

## Vendure -> Strapi Sync

Vendure calls:

```http
POST /api/product-references/sync
X-Hakeems-Sync-Secret: $HAKEEMS_SYNC_SECRET
```

Payload:

```json
{
  "action": "upsert",
  "products": [
    {
      "vendureId": "1",
      "title": "Hakeems Box Tee",
      "handle": "hakeems-box-tee",
      "thumbnailUrl": "https://...",
      "channel": "both"
    }
  ]
}
```

For deletes, send `{"action":"delete","products":[{"vendureId":"1"}]}`.

## Strapi -> Vendure Webhook

Configure a native Strapi webhook in Admin:

- URL: `http://localhost:3000/webhooks/strapi`
- Events: Product Reference `entry.update`
- Header: `X-Hakeems-Sync-Secret: $HAKEEMS_SYNC_SECRET`

Vendure compares editorial fields before writing, so no-op updates are skipped.
