'use server';

import type { ChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { mapSearchResultsToProducts, type PlpProduct } from '@/lib/vendure/plp';

const SUGGESTION_LIMIT = 6;

/** Powers the header search overlay's live-as-you-type results. Read-only, no session
 * cookies needed — a plain product-name/price/image lookup via Vendure's search index. */
export async function searchSuggestionsAction(channelCode: ChannelCode, term: string): Promise<PlpProduct[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const { search } = await getVendureClient(channelCode).PlpSearch({
    input: { term: trimmed, groupByProduct: true, take: SUGGESTION_LIMIT },
  });
  return mapSearchResultsToProducts(search.items);
}
