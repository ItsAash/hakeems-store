export type ChannelCode = 'nepal' | 'hongkong';

export type ChannelDefinition = {
  code: ChannelCode;
  currencyCode: 'NPR' | 'HKD';
  locale: string;
  countryName: string;
  /** The channel's single supported shipping/billing country (each Medusa region is
   * single-country) — checkout applies this directly, no country selector needed. */
  countryCode: 'NP' | 'HK';
};

export const CHANNELS: Record<ChannelCode, ChannelDefinition> = {
  nepal: {
    code: 'nepal',
    currencyCode: 'NPR',
    locale: 'en-NP',
    countryName: 'Nepal',
    countryCode: 'NP',
  },
  hongkong: {
    code: 'hongkong',
    currencyCode: 'HKD',
    locale: 'en-HK',
    countryName: 'Hong Kong',
    countryCode: 'HK',
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
