import { DEFAULT_CHANNEL, type ChannelCode } from '@/lib/channel';

/**
 * The canonical public origin of the storefront, used for absolute URLs in metadata,
 * Open Graph, canonicals, structured data, robots.txt and the sitemap. Driven by env so
 * nothing is hardcoded — set `NEXT_PUBLIC_SITE_URL` per environment (falls back to local dev).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');

/** Brand name fallback used only until Strapi's site-setting `siteName` loads. */
export const SITE_NAME = 'Hakeems';

/** Absolute URL for an app-relative path (e.g. "/nepal/shop" -> "https://…/nepal/shop"). */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Per-channel `<html lang>` / OG locale (BCP-47), derived from the channel definition. */
export const CHANNEL_OG_LOCALE: Record<ChannelCode, string> = {
  nepal: 'en_NP',
  hongkong: 'en_HK',
};

/** The channel used for site-level (channel-agnostic) URLs such as the WebSite search action. */
export const PRIMARY_CHANNEL: ChannelCode = DEFAULT_CHANNEL;

/** Normalize CMS/Vendure rich text into a clean meta-description: strip HTML, collapse
 * whitespace, truncate on a word boundary to `max` chars. Returns undefined when empty. */
export function toMetaDescription(input: string | null | undefined, max = 160): string | undefined {
  if (!input) return undefined;
  const text = input
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  if (text.length <= max) return text;
  const clipped = text.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}
