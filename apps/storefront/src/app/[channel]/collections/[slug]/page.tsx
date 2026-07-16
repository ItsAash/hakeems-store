import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode, type ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getCollectionPage } from '@/lib/strapi/queries';
import { pickImageUrl } from '@/lib/strapi/client';
import { buildMetadata } from '@/lib/seo/metadata';
import { absoluteUrl, toMetaDescription } from '@/lib/seo/site';
import { JsonLd, breadcrumbSchema } from '@/lib/seo/structured-data';
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
import { Breadcrumbs } from '@/components/commerce/breadcrumbs';
import { PlpResults } from '@/components/commerce/plp-results';

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

  const channel = getChannel(channelParam);
  const title = collectionPage?.seo?.metaTitle || vendureCollection?.name || 'Collection';
  const description =
    collectionPage?.seo?.metaDescription || toMetaDescription(vendureCollection?.description) || undefined;
  const ogImage = collectionPage?.heroImage ? pickImageUrl(collectionPage.heroImage, ['large', 'medium']) : undefined;

  return buildMetadata({
    title,
    description,
    // Canonical points to the clean collection URL so facet/sort/page variants don't fork it.
    path: routes.collection(channel.code, slug),
    channel: channel.code,
    images: ogImage ? [ogImage] : [],
  });
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

  const cards = await loadProductCards(channel.code, searchResult.search.items);
  const facetGroups = groupFacetValuesByFacet(searchResult.search.facetValues);
  const totalPages = Math.max(1, Math.ceil(searchResult.search.totalItems / PLP_PAGE_SIZE));
  const basePath = routes.collection(channel.code, slug);

  const bannerImage = collectionPage?.heroImage ? pickImageUrl(collectionPage.heroImage, ['large', 'medium']) : null;
  const title = collectionPage?.title || vendureCollection.name;
  const tagline = collectionPage?.tagline;

  const crumbLd = breadcrumbSchema([
    { name: 'Home', url: absoluteUrl(routes.home(channel.code)) },
    ...vendureCollection.breadcrumbs
      .filter((crumb) => crumb.slug !== '__root_collection__')
      .map((crumb) => ({ name: crumb.name, url: absoluteUrl(routes.collection(channel.code, crumb.slug)) })),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={crumbLd} />
      {bannerImage && (
        <div className="relative aspect-[3/1] w-full overflow-hidden bg-[var(--color-hairline)]">
          <Image src={bannerImage} alt={`${title} collection`} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}

      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <Breadcrumbs items={vendureCollection.breadcrumbs} channelCode={channel.code} />
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">{title}</h1>
        {tagline && <p className="max-w-xl text-[var(--color-ink-muted)]">{tagline}</p>}
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
          totalItems={searchResult.search.totalItems}
          currentPage={page}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
