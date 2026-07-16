import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo/metadata';
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

type ShopSearchParams = { facetValueId?: string; facets?: string; sort?: string; page?: string };

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) return {};
  return buildMetadata({
    title: 'Shop All',
    description: 'Browse the full Hakeems catalogue — tops, bottoms, accessories and sets.',
    // Facet/sort/page variants all canonicalize to the clean /shop URL.
    path: routes.shop(channelParam),
    channel: channelParam,
  });
}

/**
 * The channel-wide catalog browse, filtered by facet (not scoped to a single Vendure
 * collection like /collections/[slug]). This page is only reached by an explicit "Shop"
 * click — category entry points route to /collections/[slug] instead. Facets live entirely
 * in the query string and are applied from within the page: `facetValueId` is a single-value
 * deep-link that's normalized into the same `facets` (comma list) the sidebar/pagination read
 * and write, so toggling further filters here behaves identically to /search and /collections.
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
    redirect(
      routes.shop(channel.code, {
        facets: merged.join(','),
        sort: resolvedSearchParams.sort,
        page: resolvedSearchParams.page,
      }),
    );
  }

  const activeFacetValueIds = (resolvedSearchParams.facets ?? '').split(',').filter(Boolean);
  const sortKey: PlpSortKey = resolvedSearchParams.sort && isPlpSortKey(resolvedSearchParams.sort) ? resolvedSearchParams.sort : 'relevance';
  const page = Math.max(1, Number.parseInt(resolvedSearchParams.page ?? '1', 10) || 1);
  const basePath = routes.shop(channel.code);

  const { search } = await getVendureClient(channel.code).PlpSearch({
    input: {
      groupByProduct: true,
      take: PLP_PAGE_SIZE,
      skip: (page - 1) * PLP_PAGE_SIZE,
      sort: sortKeyToSearchSort(sortKey),
      facetValueFilters: activeFacetValueIds.map((id) => ({ and: id })),
    },
  });

  const cards = await loadProductCards(channel.code, search.items);
  const facetGroups = groupFacetValuesByFacet(search.facetValues);
  const totalPages = Math.max(1, Math.ceil(search.totalItems / PLP_PAGE_SIZE));

  return (
    <main className="flex flex-1 flex-col">
      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Shop</h1>
      </div>

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
    </main>
  );
}
