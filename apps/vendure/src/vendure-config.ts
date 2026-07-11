import {
  DefaultJobQueuePlugin,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
  dummyPaymentHandler,
  LanguageCode,
  VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';
import 'dotenv/config';
import path from 'path';
import { districtShippingCalculator, districtShippingEligibilityChecker } from './plugins/channel-shipping/district-shipping';
import { fonepayPlaceholderHandler } from './plugins/fonepay-placeholder/fonepay-placeholder.handler';
import { StrapiSyncPlugin } from './plugins/strapi-sync/strapi-sync.plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +(process.env.PORT || 3000);

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
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler, fonepayPlaceholderHandler],
  },
  shippingOptions: {
    shippingEligibilityCheckers: [districtShippingEligibilityChecker],
    shippingCalculators: [districtShippingCalculator],
  },
  customFields: {
    Product: [
      { name: 'enrichedDescription', type: 'text', public: true, nullable: true },
      { name: 'seoTitle', type: 'string', public: true, nullable: true },
      { name: 'seoDescription', type: 'text', public: true, nullable: true },
    ],
  },
  plugins: [
    GraphiqlPlugin.init(),
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      assetUrlPrefix: IS_DEV ? undefined : 'https://www.hakeems.local/assets/',
    }),
    DefaultSchedulerPlugin.init(),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      devMode: true,
      outputPath: path.join(__dirname, '../static/email/test-emails'),
      route: 'mailbox',
      handlers: defaultEmailHandlers,
      templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
      globalTemplateVars: {
        fromAddress: '"Hakeems" <noreply@hakeems.local>',
        verifyEmailAddressUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3001'}/verify`,
        passwordResetUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3001'}/password-reset`,
        changeEmailAddressUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3001'}/verify-email-address-change`,
      },
    }),
    StripePlugin.init({
      storeCustomersInStripe: true,
      metadata: async (_injector, ctx, order) => ({
        vendureOrderCode: order.code,
        channel: ctx.channel.code,
      }),
    }),
    StrapiSyncPlugin.init({
      url: process.env.STRAPI_SYNC_URL || '',
      secret: process.env.HAKEEMS_SYNC_SECRET || '',
    }),
    DashboardPlugin.init({
      route: 'dashboard',
      appDir: IS_DEV ? path.join(__dirname, '../dist/dashboard') : path.join(__dirname, 'dashboard'),
    }),
  ],
};
