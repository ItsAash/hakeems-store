import type { ChannelCode } from '@/lib/channel';
import { createMedusaClient } from '@/lib/medusa/client';
import { getMedusaConfig } from '@/lib/medusa/config';
import { applyCmsColorways, buildProductCards, type ProductCardModel } from '@/lib/medusa/product-card';
import type { MedusaProduct, MedusaProductListResponse } from '@/lib/medusa/types';
import { buildFacetGroupsFromProducts, productMatchesActiveFacets, type FacetFilterGroup } from '@/lib/medusa/facets';
import { getProductColorwaysBySlugs } from '@/lib/strapi/queries';
import { pickImageUrl } from '@/lib/strapi/client';
import type { StrapiMedia } from '@/lib/strapi/types';

/**
 * Layers CMS colorway galleries over freshly built cards — one bulk Strapi request per
 * listing (never per card). Fail-soft: any CMS hiccup returns the Medusa-only cards.
 */
async function withCmsColorways(cards: ProductCardModel[]): Promise<ProductCardModel[]> {
  if (cards.length === 0) return cards;
  const colorways = await getProductColorwaysBySlugs(cards.map((c) => c.slug)).catch(() => ({}));
  return applyCmsColorways(cards, colorways, (media) => pickImageUrl(media as StrapiMedia, ['large', 'medium']));
}

export type PlpSortKey = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc' | 'newest' | 'best-selling';

export const PLP_SORT_OPTIONS: Array<{ value: PlpSortKey; label: string }> = [
  { value: 'relevance', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'best-selling', label: 'Best Selling' },
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
    case 'newest':
      return '-created_at';
    case 'best-selling':
      return '--order_count';
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
    // Product membership is category-driven (many-to-many — a product can live in
    // `tops` AND `spotlight`), so a collection slug resolves against categories first;
    // the Medusa collection of the same handle exists as the Strapi editorial anchor.
    const categoryId = await resolveCategoryId(client, params.collectionSlug);
    if (categoryId) {
      query.category_id = [categoryId];
    } else {
      const collection = await getCollectionByHandle(params.channelCode, params.collectionSlug);
      // An unknown slug must never fall through to an unfiltered catalog query —
      // that would silently show every product instead of "not found".
      if (!collection) return EMPTY_RESULT;
      query.collection_id = [collection.id];
    }
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

  // Price range filtering: priceMin/priceMax are in major units (e.g. 1000 for NPR 1,000).
  // Medusa's calculated_amount is also in major units, so we compare directly.
  let filtered = [...data.products];
  if (params.priceMin != null) {
    filtered = filtered.filter((product) => {
      for (const v of product.variants ?? []) {
        const amt = v.calculated_price?.calculated_amount;
        if (amt != null && amt >= params.priceMin!) return true;
      }
      return false;
    });
  }
  if (params.priceMax != null) {
    filtered = filtered.filter((product) => {
      for (const v of product.variants ?? []) {
        const amt = v.calculated_price?.calculated_amount;
        if (amt != null && amt <= params.priceMax!) return true;
      }
      return false;
    });
  }

  const activeFacetValueIds = params.activeFacetValueIds ?? [];
  if (activeFacetValueIds.length > 0) {
    filtered = filtered.filter((product) => productMatchesActiveFacets(product, activeFacetValueIds));
  }

  const pageProducts = filtered.slice(skip, skip + take);
  const cards = await withCmsColorways(buildProductCards(pageProducts));

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

  return withCmsColorways(buildProductCards(data.products));
}

/** Cards for an explicit set of product handles (e.g. the client-side wishlist), in the
 * caller's order. Unknown handles are silently absent from the result. */
export async function listProductsByHandles(
  channelCode: ChannelCode,
  handles: string[],
): Promise<ProductCardModel[]> {
  if (!handles.length) return [];
  const client = createMedusaClient(channelCode);
  const config = getMedusaConfig(channelCode);

  const data = await client.store.product.list({
    handle: handles,
    sales_channel_id: config.salesChannelId,
    region_id: config.regionId,
    limit: handles.length,
    fields: '*variants.calculated_price,*variants.images,*variants.options,*variants.inventory_quantity,*variants.manage_inventory,*variants.allow_backorder,*images',
  } as any) as unknown as MedusaProductListResponse;

  const cards = await withCmsColorways(buildProductCards(data.products));
  const order = new Map(handles.map((h, i) => [h, i]));
  return cards.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export async function listCollectionProducts(
  channelCode: ChannelCode,
  collectionHandle: string,
  limit: number = 100,
): Promise<ProductCardModel[]> {
  const client = createMedusaClient(channelCode);
  const config = getMedusaConfig(channelCode);

  // Same category-first membership resolution as listProducts (see comment there).
  const categoryId = await resolveCategoryId(client, collectionHandle);
  let scope: Record<string, unknown>;
  if (categoryId) {
    scope = { category_id: [categoryId] };
  } else {
    const collection = await getCollectionByHandle(channelCode, collectionHandle);
    if (!collection) return [];
    scope = { collection_id: [collection.id] };
  }

  const data = await client.store.product.list({
    ...scope,
    sales_channel_id: config.salesChannelId,
    region_id: config.regionId,
    limit,
    fields: '*variants.calculated_price,*variants.images,*variants.options,*variants.inventory_quantity,*variants.manage_inventory,*variants.allow_backorder,*images',
  } as any) as unknown as MedusaProductListResponse;

  return withCmsColorways(buildProductCards(data.products));
}
