import type { ChannelCode } from '@/lib/channel';
import type { FacetFilterGroup } from '@/lib/medusa/facets';
import { parseActiveFacetValueIds } from '@/lib/medusa/facets';
import type { ProductCardModel } from '@/lib/medusa/product-card';
import {
  listProducts,
  getCollectionByHandle,
  type PlpSortKey,
  type MedusaCollectionRef,
  PLP_PAGE_SIZE,
} from '@/lib/medusa/products';

export type { FacetFilterGroup };

export interface PlpPageData {
  cards: ProductCardModel[];
  facetGroups: FacetFilterGroup[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface ShopPageParams {
  channelCode: ChannelCode;
  sort?: string;
  page?: string;
  categoryHandle?: string;
  facets?: string;
}

export async function getShopPageData(params: ShopPageParams): Promise<PlpPageData> {
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const sortKey = validateSortKey(params.sort);

  const result = await listProducts({
    channelCode: params.channelCode,
    sort: sortKey,
    page,
    categorySlug: params.categoryHandle,
    activeFacetValueIds: parseActiveFacetValueIds(params.facets),
  });

  return {
    cards: result.cards,
    facetGroups: result.facetGroups,
    totalItems: result.count,
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(result.count / PLP_PAGE_SIZE)),
  };
}

export interface CollectionPageParams {
  channelCode: ChannelCode;
  collectionHandle: string;
  sort?: string;
  page?: string;
  facets?: string;
}

export type CollectionPageData = PlpPageData & { collection: MedusaCollectionRef };

/** Returns `null` when no collection matches the handle, so the caller can 404 instead
 * of silently rendering an empty (or, before this fix, unfiltered) product grid. */
export async function getCollectionPageData(params: CollectionPageParams): Promise<CollectionPageData | null> {
  const collection = await getCollectionByHandle(params.channelCode, params.collectionHandle);
  if (!collection) return null;

  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const sortKey = validateSortKey(params.sort);

  const result = await listProducts({
    channelCode: params.channelCode,
    sort: sortKey,
    page,
    collectionSlug: params.collectionHandle,
    activeFacetValueIds: parseActiveFacetValueIds(params.facets),
  });

  return {
    collection,
    cards: result.cards,
    facetGroups: result.facetGroups,
    totalItems: result.count,
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(result.count / PLP_PAGE_SIZE)),
  };
}

export interface SearchPageParams {
  channelCode: ChannelCode;
  term: string;
  sort?: string;
  page?: string;
  facets?: string;
}

export async function getSearchPageData(params: SearchPageParams): Promise<PlpPageData> {
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const sortKey = validateSortKey(params.sort);

  const result = await listProducts({
    channelCode: params.channelCode,
    term: params.term,
    sort: sortKey,
    page,
    activeFacetValueIds: parseActiveFacetValueIds(params.facets),
  });

  return {
    cards: result.cards,
    facetGroups: result.facetGroups,
    totalItems: result.count,
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(result.count / PLP_PAGE_SIZE)),
  };
}

function validateSortKey(sort: string | undefined): PlpSortKey {
  if (sort === 'price-asc' || sort === 'price-desc' || sort === 'name-asc') return sort;
  return 'relevance';
}
