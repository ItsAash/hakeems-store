import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getVendureClient } from '@/lib/vendure/client';
import {
  groupFacetValuesByFacet,
  isPlpSortKey,
  mapSearchResultsToProducts,
  PLP_PAGE_SIZE,
  sortKeyToSearchSort,
  type PlpSortKey,
} from '@/lib/vendure/plp';
import { CONTAINER } from '@/lib/ui';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilterSidebar } from '@/components/commerce/facet-filter-sidebar';
import { SortSelect } from '@/components/commerce/sort-select';
import { Pagination } from '@/components/commerce/pagination';

type SearchParams = { q?: string; facets?: string; sort?: string; page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : 'Search' };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ channel: channelParam }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const term = (resolvedSearchParams.q ?? '').trim();
  const activeFacetValueIds = (resolvedSearchParams.facets ?? '').split(',').filter(Boolean);
  const sortKey: PlpSortKey = resolvedSearchParams.sort && isPlpSortKey(resolvedSearchParams.sort) ? resolvedSearchParams.sort : 'relevance';
  const page = Math.max(1, Number.parseInt(resolvedSearchParams.page ?? '1', 10) || 1);
  const basePath = routes.search(channel.code);

  const { search } = term
    ? await getVendureClient(channel.code).PlpSearch({
        input: {
          term,
          groupByProduct: true,
          take: PLP_PAGE_SIZE,
          skip: (page - 1) * PLP_PAGE_SIZE,
          sort: sortKeyToSearchSort(sortKey),
          facetValueFilters: activeFacetValueIds.map((id) => ({ and: id })),
        },
      })
    : { search: { totalItems: 0, items: [], facetValues: [] } };

  const products = mapSearchResultsToProducts(search.items);
  const facetGroups = groupFacetValuesByFacet(search.facetValues);
  const totalPages = Math.max(1, Math.ceil(search.totalItems / PLP_PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col">
      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">
          {term ? `Search results for “${term}”` : 'Search'}
        </h1>
      </div>

      {!term ? (
        <div className={`pb-section ${CONTAINER}`}>
          <p className="text-sm text-[var(--color-ink-muted)]">Enter a search term to find products.</p>
        </div>
      ) : (
        <div
          className={`grid gap-10 pb-section lg:gap-12 ${CONTAINER} ${
            facetGroups.length > 0 ? 'lg:grid-cols-[220px_1fr]' : ''
          }`}
        >
          {facetGroups.length > 0 && (
            <aside className="hidden lg:block">
              <FacetFilterSidebar
                groups={facetGroups}
                activeFacetValueIds={activeFacetValueIds}
                basePath={basePath}
                searchParams={resolvedSearchParams}
              />
            </aside>
          )}

          <div className={facetGroups.length > 0 ? 'lg:col-start-2' : undefined}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="text-sm text-[var(--color-ink-muted)]">
                {search.totalItems} {search.totalItems === 1 ? 'item' : 'items'}
              </p>
              <SortSelect currentSort={sortKey} />
            </div>

            <ProductGrid products={products} channelCode={channel.code} />

            <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} searchParams={resolvedSearchParams} />
          </div>
        </div>
      )}
    </main>
  );
}
