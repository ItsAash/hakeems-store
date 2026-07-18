import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getSearchPageData } from '@/lib/medusa/page-data';
import { isPlpSortKey, type PlpSortKey } from '@/lib/medusa/products';
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
  const page = resolvedSearchParams.page ?? '1';
  const basePath = routes.search(channel.code);

  const pageData = term
    ? await getSearchPageData({ channelCode: channel.code, term, sort: sortKey, page, facets: resolvedSearchParams.facets })
    : { cards: [], facetGroups: [], totalItems: 0, currentPage: 1, totalPages: 1 };

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
            cards={pageData.cards}
            channelCode={channel.code}
            facetGroups={pageData.facetGroups}
            activeFacetValueIds={activeFacetValueIds}
            basePath={basePath}
            searchParams={resolvedSearchParams}
            sortKey={sortKey}
            totalItems={pageData.totalItems}
            currentPage={pageData.currentPage}
            totalPages={pageData.totalPages}
          />
        </div>
      )}
    </main>
  );
}
