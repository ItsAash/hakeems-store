import type { Metadata } from 'next';
import { CHANNEL_CODES, type ChannelCode } from '@/lib/channel';
import { CHANNEL_OG_LOCALE, SITE_NAME, absoluteUrl } from '@/lib/seo/site';

type BuildMetadataInput = {
  /** Page title, without the brand suffix — the layout title template appends "· {siteName}". */
  title?: string;
  description?: string;
  /** The channel-scoped path for this page (e.g. "/nepal/shop"). Used for canonical + hreflang. */
  path: string;
  channel?: ChannelCode;
  /** Absolute (already-resolved) image URLs for Open Graph / Twitter cards. */
  images?: string[];
  type?: 'website' | 'article';
  /** Transactional / private / query-driven pages that must not be indexed. */
  noIndex?: boolean;
  keywords?: string[];
  /** OG site name (from Strapi site-setting). */
  siteName?: string;
  /** Canonical path override — e.g. strip facet/query params so filtered views point home. */
  canonicalPath?: string;
};

/** Metadata for private/transactional pages (cart, checkout, account, auth) — kept out of the
 * index while still crawlable for link discovery. Spread it and add a `title` per page. */
export const NOINDEX_METADATA: Metadata = { robots: { index: false, follow: false } };

/** hreflang map: the same page in every channel, plus x-default to the first channel. */
function channelAlternates(path: string): Record<string, string> {
  const segments = path.split('/').filter(Boolean); // ["nepal", "shop", …]
  const [, ...rest] = segments;
  const languages: Record<string, string> = {};
  for (const code of CHANNEL_CODES) {
    const locale = CHANNEL_OG_LOCALE[code].replace('_', '-'); // en-NP / en-HK
    languages[locale] = absoluteUrl(`/${[code, ...rest].join('/')}`);
  }
  languages['x-default'] = absoluteUrl(`/${[CHANNEL_CODES[0], ...rest].join('/')}`);
  return languages;
}

/**
 * Single source of truth for a page's SEO metadata. Every route builds its metadata here so
 * canonical URLs, Open Graph, Twitter cards, hreflang and robots are always consistent and
 * complete — no page hand-rolls a partial `<head>`. All content is passed in (from Strapi or
 * Vendure); nothing is hardcoded.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { title, description, path, images = [], type = 'website', noIndex, keywords } = input;
  const siteName = input.siteName || SITE_NAME;
  const canonical = absoluteUrl(input.canonicalPath ?? path);
  const url = absoluteUrl(path);
  const ogLocale = input.channel ? CHANNEL_OG_LOCALE[input.channel] : undefined;
  const ogImages = images.map((image) => ({ url: image }));

  return {
    title,
    description,
    keywords: keywords && keywords.length > 0 ? keywords : undefined,
    alternates: {
      canonical,
      languages: channelAlternates(path),
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      type,
      locale: ogLocale,
      images: ogImages.length > 0 ? ogImages : undefined,
    },
    twitter: {
      card: ogImages.length > 0 ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images.length > 0 ? images : undefined,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
        },
  };
}
