'use server';

import { isChannelCode } from '@/lib/channel';
import { listProductsByHandles } from '@/lib/medusa/products';
import type { ProductCardModel } from '@/lib/medusa/product-card';

const MAX_WISHLIST_FETCH = 60;

/**
 * Resolves the client-side wishlist (product handles from localStorage) into full product
 * cards — one Medusa list call, CMS colorways included via the shared card pipeline.
 */
export async function fetchWishlistCardsAction(
  channelCode: string,
  slugs: string[],
): Promise<ProductCardModel[]> {
  if (!isChannelCode(channelCode) || !Array.isArray(slugs) || slugs.length === 0) return [];
  const safeSlugs = slugs.filter((s) => typeof s === 'string' && /^[a-z0-9-]+$/.test(s)).slice(0, MAX_WISHLIST_FETCH);
  if (safeSlugs.length === 0) return [];
  return listProductsByHandles(channelCode, safeSlugs).catch(() => []);
}
