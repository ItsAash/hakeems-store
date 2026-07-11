# Hakeems Commerce Monorepo

Vendure + Strapi + Next.js stack for Hakeems, a clothing brand operating in Nepal and Hong Kong.

## Apps

- `apps/vendure`: Vendure commerce backend, Admin UI, custom shipping, Stripe for Hong Kong, Fonepay placeholder for Nepal, Strapi sync plugin.
- `apps/strapi`: Strapi CMS with Product Reference and Event content types plus a shared-secret sync endpoint.
- `apps/storefront`: Next.js App Router storefront with `/nepal` and `/hongkong` channel routing.

## Local Setup

Use Node 20 or 22. The current stack dependencies do not officially target Node 24.

```bash
pnpm install
pnpm db:up
cp apps/vendure/.env.example apps/vendure/.env
cp apps/strapi/.env.example apps/strapi/.env
cp apps/storefront/.env.example apps/storefront/.env.local
pnpm dev:vendure
pnpm dev:worker
pnpm dev:strapi
pnpm dev:storefront
```

After Vendure and Strapi are running:

```bash
pnpm seed
```

## Local URLs

- Vendure Dashboard: `http://localhost:3000/dashboard`
- Vendure Shop API: `http://localhost:3000/shop-api`
- Vendure Admin API: `http://localhost:3000/admin-api`
- Strapi Admin: `http://localhost:1337/admin`
- Storefront: `http://localhost:3001/nepal` and `http://localhost:3001/hongkong`

## Sync Verification

1. Create or edit a product in Vendure Admin.
2. The Vendure Strapi sync plugin sends only identity fields to `POST /api/product-references/sync`.
3. Open Strapi Product References and confirm the entry appears or updates.
4. Edit `enrichedDescription`, `seoTitle`, or `seoDescription` in Strapi.
5. Configure Strapi's native webhook to call Vendure `POST /webhooks/strapi`; Vendure stores the editorial fields in product custom fields and skips no-op writes.

See each app README for app-specific commands and env vars.
