'use server';

import type { ChannelCode } from '@/lib/channel';
import { listProducts } from '@/lib/medusa/products';
import type { ProductCardModel } from '@/lib/medusa/product-card';

const SUGGESTION_LIMIT = 6;

export async function searchSuggestionsAction(channelCode: ChannelCode, term: string): Promise<ProductCardModel[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const result = await listProducts({
    channelCode,
    term: trimmed,
    page: 1,
  });

  return result.cards.slice(0, SUGGESTION_LIMIT);
}
