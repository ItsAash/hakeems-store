import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode, type ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getCollectionPage } from '@/lib/strapi/queries';
import { pickImageUrl } from '@/lib/strapi/client';
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
import { Breadcrumbs } from '@/components/commerce/breadcrumbs';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilterSidebar } from '@/components/commerce/facet-filter-sidebar';
import { SortSelect } from '@/components/commerce/sort-select';
import { Pagination } from '@/components/commerce/pagination';

type PlpParams = { channel: string; slug: string };
type PlpSearchParams = { facets?: string; sort?: string; page?: string };

async function loadPlpData(channelCode: ChannelCode, slug: string, searchParams: PlpSearchParams) {
  const activeFacetValueIds = (searchParams.facets ?? '').split(',').filter(Boolean);
  const sortKey: PlpSortKey = searchParams.sort && isPlpSortKey(searchParams.sort) ? searchParams.sort : 'relevance';
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);

  const client = getVendureClient(channelCode);
  const [collectionResult, searchResult] = await Promise.all([
    client.PlpCollection({ slug }),
    client.PlpSearch({
      input: {
        collectionSlug: slug,
        groupByProduct: true,
        take: PLP_PAGE_SIZE,
        skip: (page - 1) * PLP_PAGE_SIZE,
        sort: sortKeyToSearchSort(sortKey),
        facetValueFilters: activeFacetValueIds.map((id) => ({ and: id })),
      },
    }),
  ]);

  return { collectionResult, searchResult, activeFacetValueIds, sortKey, page };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PlpParams>;
}): Promise<Metadata> {
  const { channel: channelParam, slug } = await params;
  if (!isChannelCode(channelParam)) return {};

  const [collectionPage, vendureCollection] = await Promise.all([
    getCollectionPage(slug),
    getVendureClient(getChannel(channelParam).code)
      .PlpCollection({ slug })
      .then((result) => result.collection)
      .catch(() => null),
  ]);

  const title = collectionPage?.seo?.metaTitle || vendureCollection?.name || 'Collection';
  const description = collectionPage?.seo?.metaDescription || vendureCollection?.description || undefined;

  return { title, description };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<PlpParams>;
  searchParams: Promise<PlpSearchParams>;
}) {
  const [{ channel: channelParam, slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const [{ collectionResult, searchResult, activeFacetValueIds, sortKey, page }, collectionPage] = await Promise.all([
    loadPlpData(channel.code, slug, resolvedSearchParams),
    getCollectionPage(slug),
  ]);

  const vendureCollection = collectionResult.collection;
  if (!vendureCollection) notFound();

  const products = mapSearchResultsToProducts(searchResult.search.items);
  const facetGroups = groupFacetValuesByFacet(searchResult.search.facetValues);
  const totalPages = Math.max(1, Math.ceil(searchResult.search.totalItems / PLP_PAGE_SIZE));
  const basePath = routes.collection(channel.code, slug);

  const bannerImage = collectionPage?.heroImage ? pickImageUrl(collectionPage.heroImage, ['large', 'medium']) : null;
  const title = collectionPage?.title || vendureCollection.name;
  const tagline = collectionPage?.tagline;

  return (
    <main className="flex flex-1 flex-col">
      {bannerImage && (
        <div className="relative aspect-[3/1] w-full overflow-hidden bg-[var(--color-hairline)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerImage} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <Breadcrumbs items={vendureCollection.breadcrumbs} channelCode={channel.code} />
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">{title}</h1>
        {tagline && <p className="max-w-xl text-[var(--color-ink-muted)]">{tagline}</p>}
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
              {searchResult.search.totalItems} {searchResult.search.totalItems === 1 ? 'item' : 'items'}
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
