# Hakeems Storefront

Next.js App Router storefront for the two Vendure channels:

- `/nepal`: NPR, Nepal stock location, Fonepay payment placeholder.
- `/hongkong`: HKD, Hong Kong stock location, Stripe checkout.

## Setup

```bash
cp .env.example .env.local
pnpm dev
```

## Pages

- `/:channel`: homepage
- `/:channel/products/:type`: product listing for `tops`, `bottoms`, `accessories`
- `/:channel/product/:slug`: product detail
- `/:channel/cart`: cart
- `/:channel/checkout`: checkout shell
- `/:channel/events/:slug`: Strapi Event page with live Vendure product data fetched by ID

## Notes

The cart and checkout API routes proxy Vendure Shop API cookies. Hong Kong checkout calls Vendure payment mutations and expects the Vendure Stripe plugin to be configured with `STRIPE_SECRET_KEY`. Nepal checkout intentionally shows a Fonepay placeholder until the payment plugin is implemented.
