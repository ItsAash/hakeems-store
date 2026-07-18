import type { ChannelCode } from '@/lib/channel';

/**
 * Single source of truth for every internal URL the app links to.
 *
 * Rules encoded here (so no component has to remember them):
 *  - A collection is ALWAYS `/{channel}/collections/{slug}` — never `/shop?facet=…`.
 *  - `/shop` is the standalone shop page; facets/filters live in its query string and are
 *    only applied from inside `/shop`, never used as a collection entry point.
 *  - Every path is channel-prefixed.
 *
 * Code-authored links use these helpers. Strapi-authored relative hrefs (nav items, CTAs)
 * are resolved with `withChannel` in `@/lib/channel` instead — the two never overlap.
 */

type QueryValue = string | number | boolean | null | undefined;

/** Build a `?a=1&b=2` suffix, dropping empty/nullish values. Returns '' when nothing is set. */
function query(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}

export const routes = {
  home: (channel: ChannelCode) => `/${channel}`,

  /** The standalone shop page. Filters/facets live in `params` and are applied from within /shop. */
  shop: (channel: ChannelCode, params?: Record<string, QueryValue>) => `/${channel}/shop${query(params)}`,

  /** A collection landing page — the canonical entry point for any category (Tops, Bottoms, …). */
  collection: (channel: ChannelCode, slug: string) => `/${channel}/collections/${slug}`,

  product: (channel: ChannelCode, slug: string) => `/${channel}/products/${slug}`,

  search: (channel: ChannelCode, q?: string) => `/${channel}/search${query({ q })}`,

  cart: (channel: ChannelCode) => `/${channel}/cart`,

  checkout: (channel: ChannelCode) => `/${channel}/checkout`,
  /** `orderId` is the Medusa order's id (e.g. "order_01…"), not its display_id. */
  checkoutConfirmation: (channel: ChannelCode, orderId: string) =>
    `/${channel}/checkout/confirmation${query({ order_id: orderId })}`,

  /** Account root, or a sub-page when `sub` is a leading-slash path like `/orders`. */
  account: (channel: ChannelCode, sub = '') => `/${channel}/account${sub}`,

  /** Sign-in page. `next` is the post-login return path (already channel-prefixed). */
  login: (channel: ChannelCode, next?: string) => `/${channel}/login${query({ next })}`,
  register: (channel: ChannelCode) => `/${channel}/register`,
  forgotPassword: (channel: ChannelCode) => `/${channel}/forgot-password`,
} as const;
