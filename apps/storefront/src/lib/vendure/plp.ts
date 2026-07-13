import { SortOrder, type PlpSearchQuery, type SearchResultSortParameter } from '@/lib/vendure/generated';

export type PlpProduct = {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceMin: number;
  priceMax: number;
  currencyCode: string;
};

export type FacetFilterOption = {
  facetId: string;
  facetName: string;
  valueId: string;
  valueName: string;
  count: number;
};

/** Groups the flat facetValues aggregation from `search` by parent facet, in the
 * order facets were first encountered — ready to render as filter sections. */
export type FacetFilterGroup = {
  facetId: string;
  facetName: string;
  options: FacetFilterOption[];
};

export function mapSearchResultsToProducts(items: PlpSearchQuery['search']['items']): PlpProduct[] {
  return items.map((item) => {
    const price = item.priceWithTax;
    const [priceMin, priceMax] = 'min' in price ? [price.min, price.max] : [price.value, price.value];
    return {
      productId: item.productId,
      name: item.productName,
      slug: item.slug,
      imageUrl: item.productAsset?.preview ?? null,
      priceMin,
      priceMax,
      currencyCode: item.currencyCode,
    };
  });
}

/** These facets drive top-level navigation (category tiles, collections, drop
 * badges) rather than in-page filtering — surfacing them again as PLP checkboxes
 * would just echo the collection the shopper is already in. */
const NON_FILTERABLE_FACET_CODES = new Set(['categories', 'product-type', 'drop']);

export function groupFacetValuesByFacet(
  facetValues: PlpSearchQuery['search']['facetValues'],
): FacetFilterGroup[] {
  const groups = new Map<string, FacetFilterGroup>();

  for (const { count, facetValue } of facetValues) {
    const { facet } = facetValue;
    if (NON_FILTERABLE_FACET_CODES.has(facet.code)) continue;

    let group = groups.get(facet.id);
    if (!group) {
      group = { facetId: facet.id, facetName: facet.name, options: [] };
      groups.set(facet.id, group);
    }
    group.options.push({
      facetId: facet.id,
      facetName: facet.name,
      valueId: facetValue.id,
      valueName: facetValue.name,
      count,
    });
  }

  return Array.from(groups.values());
}

export type PlpSortKey = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc';

export const PLP_SORT_OPTIONS: Array<{ value: PlpSortKey; label: string }> = [
  { value: 'relevance', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A–Z' },
];

/** Vendure's SearchInput.sort shape for a given sort key — undefined (omit sort
 * entirely) falls back to Vendure's default relevance ordering. */
export function sortKeyToSearchSort(sort: PlpSortKey): SearchResultSortParameter | undefined {
  switch (sort) {
    case 'price-asc':
      return { price: SortOrder.Asc };
    case 'price-desc':
      return { price: SortOrder.Desc };
    case 'name-asc':
      return { name: SortOrder.Asc };
    default:
      return undefined;
  }
}

export function isPlpSortKey(value: string): value is PlpSortKey {
  return PLP_SORT_OPTIONS.some((option) => option.value === value);
}

export const PLP_PAGE_SIZE = 24;
