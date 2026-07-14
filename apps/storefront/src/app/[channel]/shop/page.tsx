import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
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

type ShopSearchParams = { facetValueId?: string; facets?: string; sort?: string; page?: string };

export const metadata: Metadata = { title: 'Shop' };

/**
 * The channel-wide catalog browse, filtered by facet (not scoped to a single Vendure
 * collection like /collections/[slug]). `facetValueId` is the single-value entry point the
 * home page's category tiles link with (see FacetCategoryGrid); it's merged into the same
 * `facets` (comma list) the sidebar/pagination read and write, so toggling further filters
 * here behaves identically to /search and /collections/[slug].
 */
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<ShopSearchParams>;
}) {
  const [{ channel: channelParam }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  // Normalize the single-value `facetValueId` entry point (used by the home page's category
  // tiles) into the canonical `facets` list the sidebar/pagination read and write — so a
  // later filter toggle here isn't fighting a stale `facetValueId` still sitting in the URL.
  if (resolvedSearchParams.facetValueId) {
    const merged = Array.from(
      new Set([...(resolvedSearchParams.facets ?? '').split(',').filter(Boolean), resolvedSearchParams.facetValueId]),
    );
    const params = new URLSearchParams();
    params.set('facets', merged.join(','));
    if (resolvedSearchParams.sort) params.set('sort', resolvedSearchParams.sort);
    if (resolvedSearchParams.page) params.set('page', resolvedSearchParams.page);
    redirect(`/${channel.code}/shop?${params.toString()}`);
  }

  const activeFacetValueIds = (resolvedSearchParams.facets ?? '').split(',').filter(Boolean);
  const sortKey: PlpSortKey = resolvedSearchParams.sort && isPlpSortKey(resolvedSearchParams.sort) ? resolvedSearchParams.sort : 'relevance';
  const page = Math.max(1, Number.parseInt(resolvedSearchParams.page ?? '1', 10) || 1);
  const basePath = `/${channel.code}/shop`;

  const { search } = await getVendureClient(channel.code).PlpSearch({
    input: {
      groupByProduct: true,
      take: PLP_PAGE_SIZE,
      skip: (page - 1) * PLP_PAGE_SIZE,
      sort: sortKeyToSearchSort(sortKey),
      facetValueFilters: activeFacetValueIds.map((id) => ({ and: id })),
    },
  });

  const products = mapSearchResultsToProducts(search.items);
  const facetGroups = groupFacetValuesByFacet(search.facetValues);
  const totalPages = Math.max(1, Math.ceil(search.totalItems / PLP_PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col">
      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Shop</h1>
      </div>

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
    </main>
  );
}
