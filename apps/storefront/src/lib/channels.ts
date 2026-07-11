export type ChannelCode = 'nepal' | 'hongkong';

export const CHANNELS: Record<ChannelCode, { name: string; currency: 'NPR' | 'HKD'; token: string; country: string }> = {
  nepal: {
    name: 'Nepal',
    currency: 'NPR',
    token: 'nepal',
    country: 'NP',
  },
  hongkong: {
    name: 'Hong Kong',
    currency: 'HKD',
    token: 'hongkong',
    country: 'HK',
  },
};

export const PRODUCT_TYPES = ['tops', 'bottoms', 'accessories'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export function assertChannel(channel: string): ChannelCode {
  if (channel === 'nepal' || channel === 'hongkong') return channel;
  throw new Error(`Unknown channel: ${channel}`);
}

export function titleCase(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
