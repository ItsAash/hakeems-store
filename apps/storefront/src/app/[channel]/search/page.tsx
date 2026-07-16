import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getVendureClient } from '@/lib/vendure/client';
import {
  groupFacetValuesByFacet,
  isPlpSortKey,
  PLP_PAGE_SIZE,
  sortKeyToSearchSort,
  type PlpSortKey,
} from '@/lib/vendure/plp';
import { loadProductCards } from '@/lib/vendure/product-cards-loader';
import { CONTAINER } from '@/lib/ui';
import { PlpResults } from '@/components/commerce/plp-results';

type SearchParams = { q?: string; facets?: string; sort?: string; page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  // Search results are query-driven and infinite — index the concept, not the result pages.
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false, follow: true } };
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

  const cards = await loadProductCards(channel.code, search.items);
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
        <div className={`pb-section ${CONTAINER}`}>
          <PlpResults
            cards={cards}
            channelCode={channel.code}
            facetGroups={facetGroups}
            activeFacetValueIds={activeFacetValueIds}
            basePath={basePath}
            searchParams={resolvedSearchParams}
            sortKey={sortKey}
            totalItems={search.totalItems}
            currentPage={page}
            totalPages={totalPages}
          />
        </div>
      )}
    </main>
  );
}
