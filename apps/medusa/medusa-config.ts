import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Isolates Medusa's tables from Strapi's ("strapi" schema) in the same shared
    // Railway Postgres database/instance.
    databaseSchema: process.env.DATABASE_SCHEMA,
    // Railway's Postgres proxy requires TLS but presents a cert that isn't in the
    // default trust chain — same rejectUnauthorized:false relaxation Strapi's
    // DATABASE_SSL_REJECT_UNAUTHORIZED already uses for this same instance. Skipped
    // entirely for a bare local DATABASE_URL so local dev needs no SSL setup.
    databaseDriverOptions:
      process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
        ? { connection: { ssl: { rejectUnauthorized: false } } }
        : {},
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "./src/modules/shipping-zone",
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      dependencies: ["shippingZone"],
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/shipping-zone-fulfillment",
            id: "shipping-zone-fulfillment",
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/fonepay-placeholder",
            id: "fonepay-placeholder",
          },
          // Nepal always gets the Fonepay placeholder; Hong Kong only gets Stripe
          // registered when a key is actually configured (matches src/seed.ts, which
          // falls back to pp_system_default for the region when this isn't set).
          ...(process.env.STRIPE_SECRET_KEY
            ? [
                {
                  resolve: "@medusajs/medusa/payment-stripe",
                  id: "stripe",
                  options: {
                    apiKey: process.env.STRIPE_SECRET_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                  },
                },
              ]
            : []),
        ],
      },
    },
    // Falls back to local disk storage (Medusa's default) when S3_BUCKET isn't set —
    // matches the same pattern apps/strapi/config/plugins.ts uses for its own uploads.
    ...(process.env.S3_BUCKET
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: process.env.S3_CDN_BASE_URL,
                    access_key_id: process.env.S3_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                    region: process.env.S3_REGION,
                    bucket: process.env.S3_BUCKET,
                    endpoint: process.env.S3_ENDPOINT,
                    // Namespaced so Medusa's uploads don't collide with Strapi's in the
                    // same physical bucket.
                    prefix: "medusa/",
                    // Railway/Tigris (like Cloudflare R2) doesn't support ACLs — omit the
                    // header entirely rather than sending "public-read"/"private".
                    acl: false,
                    additional_client_config: {
                      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
                    },
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
