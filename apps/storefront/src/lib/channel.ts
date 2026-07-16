export type ChannelCode = 'nepal' | 'hongkong';

export type ChannelDefinition = {
  code: ChannelCode;
  /** Matches Vendure's channel `token` exactly — sent as the `vendure-token` header. */
  vendureToken: string;
  currencyCode: 'NPR' | 'HKD';
  locale: string;
  countryName: string;
  /** Default country for the checkout address form's country select. */
  countryCode: 'NP' | 'HK';
  /** Free-shipping threshold in minor units (paisa/cents) for the cart drawer's progress
   * bar. `null` disables the bar. Marketing copy only — actual shipping pricing stays in
   * Vendure's shipping calculators, so keep the two aligned when either changes. */
  freeShippingThresholdMinor: number | null;
};

export const CHANNELS: Record<ChannelCode, ChannelDefinition> = {
  nepal: {
    code: 'nepal',
    vendureToken: 'nepal',
    currencyCode: 'NPR',
    locale: 'en-NP',
    countryName: 'Nepal',
    countryCode: 'NP',
    freeShippingThresholdMinor: 500_000, // NPR 5,000
  },
  hongkong: {
    code: 'hongkong',
    vendureToken: 'hongkong',
    currencyCode: 'HKD',
    locale: 'en-HK',
    countryName: 'Hong Kong',
    countryCode: 'HK',
    freeShippingThresholdMinor: 60_000, // HKD 600
  },
};

export const DEFAULT_CHANNEL: ChannelCode = 'nepal';

export const CHANNEL_CODES = Object.keys(CHANNELS) as ChannelCode[];

export function isChannelCode(value: string): value is ChannelCode {
  return value in CHANNELS;
}

export function getChannel(code: string): ChannelDefinition {
  if (!isChannelCode(code)) {
    throw new Error(`Unknown channel code: ${code}`);
  }
  return CHANNELS[code];
}

/** Strapi-authored hrefs (nav links, CTAs) are channel-relative, e.g. "/collections/x" —
 * editors shouldn't have to know about channel prefixing. External/absolute URLs pass
 * through untouched. */
export function withChannel(channelCode: ChannelCode, href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  return `/${channelCode}${href.startsWith('/') ? href : `/${href}`}`;
}
