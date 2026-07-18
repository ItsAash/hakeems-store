import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo/metadata';
import { isPlpSortKey } from '@/lib/medusa/products';
import { getShopPageData } from '@/lib/medusa/page-data';
import { parseActiveFacetValueIds } from '@/lib/medusa/facets';
import { CONTAINER } from '@/lib/ui';
import { PlpResults } from '@/components/commerce/plp-results';

type ShopSearchParams = { category?: string; facets?: string; sort?: string; page?: string };

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) return {};
  return buildMetadata({
    title: 'Shop All',
    description: 'Browse the full Hakeems catalogue — tops, bottoms, accessories and sets.',
    path: routes.shop(channelParam),
    channel: channelParam,
  });
}

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

  const basePath = routes.shop(channel.code);

  const { cards, facetGroups, totalItems, currentPage, totalPages } = await getShopPageData({
    channelCode: channel.code,
    sort: resolvedSearchParams.sort,
    page: resolvedSearchParams.page,
    categoryHandle: resolvedSearchParams.category,
    facets: resolvedSearchParams.facets,
  });
  const activeFacetValueIds = parseActiveFacetValueIds(resolvedSearchParams.facets);

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
          sortKey={resolvedSearchParams.sort && isPlpSortKey(resolvedSearchParams.sort) ? resolvedSearchParams.sort : 'relevance'}
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
