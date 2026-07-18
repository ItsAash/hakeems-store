import type { ChannelCode } from '@/lib/channel';

export type MedusaChannelConfig = {
  salesChannelId: string;
  regionId: string;
  publishableApiKey: string;
  /** The warehouse backing this channel — needed to fetch its shipping-zone tree
   * (GET /store/shipping-zones?stock_location_id=...) for the checkout address step. */
  stockLocationId: string;
  /** Payment provider id used for this channel's single supported payment method
   * (see apps/medusa/src/seed.ts region.payment_providers). */
  paymentProviderId: string;
};

export const MEDUSA_CHANNELS: Record<ChannelCode, MedusaChannelConfig> = {
  nepal: {
    salesChannelId: 'sc_01KXS5E3SDDT1PGVDNCJ07B9TE',
    regionId: 'reg_01KXS5E3SQ1BFRKTQ02Z62N76A',
    publishableApiKey: process.env.MEDUSA_PUBLISHABLE_KEY ?? '',
    stockLocationId: 'sloc_01KXS5E3TPPY9JVSVB0RP5E3WF',
    paymentProviderId: 'pp_fonepay-placeholder_fonepay-placeholder',
  },
  hongkong: {
    salesChannelId: 'sc_01KXS5E3SF2CKQX1ATGX6SG4FR',
    regionId: 'reg_01KXS5E3T8QRSRCXGAAQVG47HS',
    publishableApiKey: process.env.MEDUSA_PUBLISHABLE_KEY ?? '',
    stockLocationId: 'sloc_01KXS5E3TX15JXTGT1SXSHAM5Z',
    paymentProviderId: 'pp_stripe_stripe',
  },
};

export function getMedusaConfig(channelCode: ChannelCode): MedusaChannelConfig {
  return MEDUSA_CHANNELS[channelCode];
}

export const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
