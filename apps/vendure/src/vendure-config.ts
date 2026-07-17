import {
  DefaultJobQueuePlugin,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
  dummyPaymentHandler,
  LanguageCode,
  VendureConfig,
} from '@vendure/core';
import {
  emailAddressChangeHandler,
  emailVerificationHandler,
  EmailPlugin,
  FileBasedTemplateLoader,
  orderConfirmationHandler,
  passwordResetHandler,
} from '@vendure/email-plugin';
import { AssetServerPlugin, configureS3AssetStorage } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';
import 'dotenv/config';
import path from 'path';
import { fonepayPlaceholderHandler } from './plugins/fonepay-placeholder/fonepay-placeholder.handler';
import { zoneShippingCalculator, zoneShippingEligibilityChecker } from './plugins/shipping-zones/zone-shipping.calculator';
import { ShippingZonesPlugin } from './plugins/shipping-zones/shipping-zones.plugin';
import { StockManagementPlugin } from './plugins/stock-management/stock-management.plugin';
import { CollectionSyncPlugin } from './plugins/collection-sync/collection-sync.plugin';
import { ProductOptionSwatchPlugin } from './plugins/product-option-swatch/product-option-swatch.plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +(process.env.PORT || 3000);
const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:3001';

// The storefront routes every page under /{channel}/..., so account-flow emails (which
// fire from a channel-scoped request) must carry the channel in the link — otherwise the
// storefront has no way to know which Shop API channel to verify/reset the token against.
const channelAwareEmailVerificationHandler = emailVerificationHandler.setTemplateVars(event => ({
  verifyUrl: `${STOREFRONT_URL}/${event.ctx.channel.code}/verify?token=${event.user.getNativeAuthenticationMethod().verificationToken}`,
}));
const channelAwarePasswordResetHandler = passwordResetHandler.setTemplateVars(event => ({
  resetUrl: `${STOREFRONT_URL}/${event.ctx.channel.code}/password-reset?token=${event.user.getNativeAuthenticationMethod().passwordResetToken}`,
}));
const channelAwareEmailAddressChangeHandler = emailAddressChangeHandler.setTemplateVars(event => ({
  changeUrl: `${STOREFRONT_URL}/${event.ctx.channel.code}/verify-email-address-change?token=${event.user.getNativeAuthenticationMethod().identifierChangeToken}`,
}));

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    trustProxy: IS_DEV ? false : 1,
    ...(IS_DEV
      ? {
          adminApiDebug: true,
          shopApiDebug: true,
        }
      : {}),
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
    },
  },
  dbConnectionOptions: {
    type: 'postgres',
    synchronize: true,
    migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
    logging: false,
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'hakeems_vendure',
    username: process.env.DB_USERNAME || 'hakeems',
    password: process.env.DB_PASSWORD || 'hakeems',
    schema: process.env.DB_SCHEMA || 'public',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler, fonepayPlaceholderHandler],
  },
  shippingOptions: {
    shippingEligibilityCheckers: [zoneShippingEligibilityChecker],
    shippingCalculators: [zoneShippingCalculator],
  },
  customFields: {
    Product: [
      { name: 'enrichedDescription', type: 'text', public: true, nullable: true },
      { name: 'seoTitle', type: 'string', public: true, nullable: true },
      { name: 'seoDescription', type: 'text', public: true, nullable: true },
      { name: 'fitAndFabric', type: 'text', public: true, nullable: true },
      { name: 'shippingReturns', type: 'text', public: true, nullable: true },
      // Merchandising: sale + badge for product cards. `discountPercent` is the source of
      // truth (0–100); the "was" price is derived per-channel from the live priceWithTax, so
      // the current price stays the amount actually charged and the strikethrough is always in
      // the right currency. `promoLabel` is the small caption ("Price as Marked"), `badge` the
      // corner tag ("Best Seller" / "Just Reduced").
      { name: 'discountPercent', type: 'int', public: true, nullable: true, min: 0, max: 100 },
      { name: 'promoLabel', type: 'string', public: true, nullable: true },
      { name: 'badge', type: 'string', public: true, nullable: true },
    ],
  },
  plugins: [
    GraphiqlPlugin.init(),
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      assetUrlPrefix: IS_DEV ? undefined : 'https://www.hakeems.local/assets/',
      // Falls back to local disk storage when S3_BUCKET isn't set.
      storageStrategyFactory: process.env.S3_BUCKET
        ? configureS3AssetStorage({
            bucket: process.env.S3_BUCKET,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID!,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
            nativeS3Configuration: {
              endpoint: process.env.S3_ENDPOINT,
              region: process.env.S3_REGION,
              forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
              signatureVersion: 'v4',
            },
          })
        : undefined,
    }),
    DefaultSchedulerPlugin.init(),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      devMode: true,
      outputPath: path.join(__dirname, '../static/email/test-emails'),
      route: 'mailbox',
      handlers: [
        orderConfirmationHandler,
        channelAwareEmailVerificationHandler,
        channelAwarePasswordResetHandler,
        channelAwareEmailAddressChangeHandler,
      ],
      templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
      globalTemplateVars: {
        fromAddress: '"Hakeems" <noreply@hakeems.local>',
      },
    }),
    StripePlugin.init({
      storeCustomersInStripe: true,
      metadata: async (_injector, ctx, order) => ({
        vendureOrderCode: order.code,
        channel: ctx.channel.code,
      }),
    }),
    CollectionSyncPlugin.init({
      url: process.env.STRAPI_SYNC_URL || '',
      secret: process.env.HAKEEMS_SYNC_SECRET || '',
    }),
    StockManagementPlugin,
    ShippingZonesPlugin,
    ProductOptionSwatchPlugin,
    DashboardPlugin.init({
      route: 'dashboard',
      appDir: IS_DEV ? path.join(__dirname, '../dist/dashboard') : path.join(__dirname, 'dashboard'),
    }),
  ],
};
