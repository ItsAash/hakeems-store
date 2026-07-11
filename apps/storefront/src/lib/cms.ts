import type { ChannelCode } from './channels';

/**
 * Hardcoded stand-ins for editorial content. Shaped the way the eventual Strapi
 * response will look (single "home page" entry, per-channel copy) so swapping
 * `getHomeContent`'s body for a `fetch` against Strapi later is a drop-in change.
 */

export type HomeContent = {
  announcements: string[];
  hero: {
    eyebrow: string;
    heading: string;
    subheading: string;
    ctaLabel: string;
    ctaHref: string;
  };
  categoryTiles: Array<{
    type: 'tops' | 'bottoms' | 'accessories';
    label: string;
    tagline: string;
  }>;
  story: {
    eyebrow: string;
    heading: string;
    paragraphs: string[];
  };
};

const COPY: Record<ChannelCode, HomeContent> = {
  nepal: {
    announcements: [
      'FREE SHIPPING WITHIN KATHMANDU VALLEY ON ORDERS OVER NPR 5,000',
      'NEW DROP — HARBOUR OVERSHIRT NOW AVAILABLE',
      'POP-UP AT JAWALAKHEL — EVERY LAST SATURDAY',
    ],
    hero: {
      eyebrow: 'Nepal · SS26',
      heading: 'Built From The Block Up',
      subheading:
        'Hakeems is streetwear made with the community, for the community — designed in Kathmandu, worn from Jhamsikhel to Jomsom.',
      ctaLabel: 'Shop New Arrivals',
      ctaHref: '/nepal/products/tops',
    },
    categoryTiles: [
      { type: 'tops', label: 'Tops', tagline: 'Tees, hoodies & overshirts' },
      { type: 'bottoms', label: 'Bottoms', tagline: 'Utility pants & shorts' },
      { type: 'accessories', label: 'Accessories', tagline: 'Bags, caps & extras' },
    ],
    story: {
      eyebrow: 'The Brand',
      heading: 'Not made in a boardroom.',
      paragraphs: [
        'Hakeems started as a pop-up table at a Kathmandu street event and grew into a full collection without losing that instinct — small batches, real fabric, and pieces built to survive an actual event, not just a lookbook.',
        'Every drop is unisex by design. Fit and gender are personal choices, not aisles you have to pick a side of.',
      ],
    },
  },
  hongkong: {
    announcements: [
      'FREE HK ISLAND DELIVERY ON ORDERS OVER HKD 800',
      'NEW DROP — HARBOUR OVERSHIRT NOW AVAILABLE',
      'POP-UP AT PMQ — FIRST WEEKEND OF EVERY MONTH',
    ],
    hero: {
      eyebrow: 'Hong Kong · SS26',
      heading: 'Built From The Block Up',
      subheading:
        'Hakeems is streetwear made with the community, for the community — designed in Kathmandu, cut for Hong Kong humidity and harbour nights.',
      ctaLabel: 'Shop New Arrivals',
      ctaHref: '/hongkong/products/tops',
    },
    categoryTiles: [
      { type: 'tops', label: 'Tops', tagline: 'Tees, hoodies & overshirts' },
      { type: 'bottoms', label: 'Bottoms', tagline: 'Utility pants & shorts' },
      { type: 'accessories', label: 'Accessories', tagline: 'Bags, caps & extras' },
    ],
    story: {
      eyebrow: 'The Brand',
      heading: 'Not made in a boardroom.',
      paragraphs: [
        'Hakeems started as a pop-up table at a Kathmandu street event and grew into a full collection without losing that instinct — small batches, real fabric, and pieces built to survive an actual event, not just a lookbook.',
        'Every drop is unisex by design. Fit and gender are personal choices, not aisles you have to pick a side of.',
      ],
    },
  },
};

export async function getHomeContent(channel: ChannelCode): Promise<HomeContent> {
  return COPY[channel];
}
