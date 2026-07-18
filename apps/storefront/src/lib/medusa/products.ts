import type { ChannelCode } from '@/lib/channel';
import { createMedusaClient } from '@/lib/medusa/client';
import { getMedusaConfig } from '@/lib/medusa/config';
import { buildProductCards, type ProductCardModel } from '@/lib/medusa/product-card';
import type { MedusaProduct, MedusaProductListResponse } from '@/lib/medusa/types';
import { buildFacetGroupsFromProducts, productMatchesActiveFacets, type FacetFilterGroup } from '@/lib/medusa/facets';

export type PlpSortKey = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc';

export const PLP_SORT_OPTIONS: Array<{ value: PlpSortKey; label: string }> = [
  { value: 'relevance', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A–Z' },
];

export const PLP_PAGE_SIZE = 24;

export function isPlpSortKey(value: string): value is PlpSortKey {
  return PLP_SORT_OPTIONS.some((option) => option.value === value);
}

function mapSortKey(sort: PlpSortKey): string | undefined {
  switch (sort) {
    case 'price-asc':
      return 'price:asc';
    case 'price-desc':
      return 'price:desc';
    case 'name-asc':
      return 'title:asc';
    default:
      return undefined;
  }
}

export interface PlpSearchParams {
  channelCode: ChannelCode;
  categorySlug?: string;
  collectionSlug?: string;
  term?: string;
  sort?: PlpSortKey;
  page?: number;
  priceMin?: number;
  priceMax?: number;
  /** Option-value facet ids from facets.ts (e.g. "color:onyx"), AND'd across groups. */
  activeFacetValueIds?: string[];
}

export interface PlpSearchResult {
  cards: ProductCardModel[];
  count: number;
  offset: number;
  limit: number;
  facetGroups: FacetFilterGroup[];
}

// Facet aggregation and value-filtering happen in-app rather than via a Medusa query
// param (there isn't one for "products with variant option value X"), so the full
// candidate set for the current category/collection/term scope has to be fetched
// unpaginated first. Fine for a catalog this size; would need a real search/facet
// service (or server-side aggregation) well before this cap becomes limiting.
const MAX_FACET_CANDIDATES = 500;

export type MedusaCollectionRef = { id: string; title: string; handle: string };

export async function getCollectionByHandle(
  channelCode: ChannelCode,
  handle: string,
): Promise<MedusaCollectionRef | null> {
  const client = createMedusaClient(channelCode);
  const cols = await client.store.collection.list({ handle, limit: 1 });
  const collection = cols.collections?.[0];
  return collection ? { id: collection.id, title: collection.title, handle: collection.handle } : null;
}

async function resolveCategoryId(client: any, handle: string): Promise<string | null> {
  const cats = await client.store.category.list({ handle, limit: 1 });
  return cats.product_categories?.[0]?.id ?? null;
}

const EMPTY_RESULT: PlpSearchResult = { cards: [], count: 0, offset: 0, limit: PLP_PAGE_SIZE, facetGroups: [] };

export async function listProducts(params: PlpSearchParams): Promise<PlpSearchResult> {
  const client = createMedusaClient(params.channelCode);
  const config = getMedusaConfig(params.channelCode);
  const page = params.page ?? 1;
  const take = PLP_PAGE_SIZE;
  const skip = (page - 1) * take;

  const query: Record<string, unknown> = {
    sales_channel_id: config.salesChannelId,
    region_id: config.regionId,
    limit: MAX_FACET_CANDIDATES,
    offset: 0,
    fields: '*variants.calculated_price,*variants.images,*variants.options,*variants.inventory_quantity,*variants.manage_inventory,*variants.allow_backorder,*images',
  };

  if (params.term) {
    query.q = params.term;
  }

  if (params.collectionSlug) {
    const collection = await getCollectionByHandle(params.channelCode, params.collectionSlug);
    // An unknown collection slug must never fall through to an unfiltered catalog query
    // — that would silently show every product instead of "not found".
    if (!collection) return EMPTY_RESULT;
    query.collection_id = [collection.id];
  }

  if (params.categorySlug) {
    const id = await resolveCategoryId(client, params.categorySlug);
    if (!id) return EMPTY_RESULT;
    query.category_id = [id];
  }

  const order = mapSortKey(params.sort ?? 'relevance');
  if (order) {
    query.order = order;
  }

  const data = (await client.store.product.list(query)) as unknown as MedusaProductListResponse;

  // Facet counts always reflect the full category/collection/term scope, computed
  // before value-filtering is applied.
  const facetGroups = buildFacetGroupsFromProducts(data.products);

  const activeFacetValueIds = params.activeFacetValueIds ?? [];
  const filtered =
    activeFacetValueIds.length > 0
      ? data.products.filter((product) => productMatchesActiveFacets(product, activeFacetValueIds))
      : data.products;

  const pageProducts = filtered.slice(skip, skip + take);
  const cards = buildProductCards(pageProducts);

  return {
    cards,
    count: filtered.length,
    offset: skip,
    limit: take,
    facetGroups,
  };
}

export async function retrieveProduct(
  channelCode: ChannelCode,
  handle: string,
): Promise<MedusaProduct> {
  const client = createMedusaClient(channelCode);
  const config = getMedusaConfig(channelCode);

  const listResult = await client.store.product.list({
    handle: [handle],
    sales_channel_id: config.salesChannelId,
    region_id: config.regionId,
    limit: 1,
    fields: '*variants.calculated_price,*variants.images,*variants.options,*variants.inventory_quantity,*variants.manage_inventory,*variants.allow_backorder,*images,*categories,*collection',
  } as any) as unknown as MedusaProductListResponse;

  const product = listResult.products[0];
  if (!product) throw new Error(`Product not found: ${handle}`);

  return product;
}

export async function listProductsByIds(
  channelCode: ChannelCode,
  ids: string[],
): Promise<ProductCardModel[]> {
  if (!ids.length) return [];
  const client = createMedusaClient(channelCode);
  const config = getMedusaConfig(channelCode);

  const data = await client.store.product.list({
    id: ids,
    sales_channel_id: config.salesChannelId,
    region_id: config.regionId,
    fields: '*variants.calculated_price,*variants.images,*variants.options,*variants.inventory_quantity,*variants.manage_inventory,*variants.allow_backorder,*images',
  } as any) as unknown as MedusaProductListResponse;

  return buildProductCards(data.products);
}

export async function listCollectionProducts(
  channelCode: ChannelCode,
  collectionHandle: string,
  limit: number = 100,
): Promise<ProductCardModel[]> {
  const client = createMedusaClient(channelCode);
  const config = getMedusaConfig(channelCode);

  const collection = await getCollectionByHandle(channelCode, collectionHandle);
  if (!collection) return [];

  const data = await client.store.product.list({
    collection_id: [collection.id],
    sales_channel_id: config.salesChannelId,
    region_id: config.regionId,
    limit,
    fields: '*variants.calculated_price,*variants.images,*variants.options,*variants.inventory_quantity,*variants.manage_inventory,*variants.allow_backorder,*images',
  } as any) as unknown as MedusaProductListResponse;

  return buildProductCards(data.products);
}
