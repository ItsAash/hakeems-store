import type { ChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { mapSearchResultsToProducts } from '@/lib/vendure/plp';
import { buildProductCards, type ProductCardModel } from '@/lib/vendure/product-card';
import type { PlpSearchQuery } from '@/lib/vendure/generated';

/**
 * Turns a `search` result set into product cards: `search` gives the ordered, facet-filtered
 * products + live prices; a single `ProductCards` query (by id) enriches them with colours and
 * merchandising custom fields. One round-trip regardless of page size — no per-card fetches.
 * Enrichment failures degrade gracefully to price/name-only cards rather than dropping products.
 */
export async function loadProductCards(
  channelCode: ChannelCode,
  items: PlpSearchQuery['search']['items'],
): Promise<ProductCardModel[]> {
  const products = mapSearchResultsToProducts(items);
  if (products.length === 0) return [];

  const result = await getVendureClient(channelCode)
    .ProductCards({ ids: products.map((product) => product.productId) })
    .catch(() => null);

  return buildProductCards(products, result?.products.items ?? []);
}
