import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getCollectionPage } from '@/lib/strapi/queries';
import { pickImageUrl } from '@/lib/strapi/client';
import { buildMetadata } from '@/lib/seo/metadata';
import { absoluteUrl } from '@/lib/seo/site';
import { JsonLd, breadcrumbSchema } from '@/lib/seo/structured-data';
import { getCollectionByHandle, isPlpSortKey } from '@/lib/medusa/products';
import { getCollectionPageData } from '@/lib/medusa/page-data';
import { parseActiveFacetValueIds } from '@/lib/medusa/facets';
import { CONTAINER } from '@/lib/ui';
import { Breadcrumbs } from '@/components/commerce/breadcrumbs';
import { PlpResults } from '@/components/commerce/plp-results';

type PlpParams = { channel: string; slug: string };
type PlpSearchParams = { facets?: string; sort?: string; page?: string; priceMin?: string; priceMax?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PlpParams>;
}): Promise<Metadata> {
  const { channel: channelParam, slug } = await params;
  if (!isChannelCode(channelParam)) return {};

  const channel = getChannel(channelParam);
  const [collectionPage, collection] = await Promise.all([
    getCollectionPage(slug).catch(() => null),
    getCollectionByHandle(channel.code, slug).catch(() => null),
  ]);

  const title = collectionPage?.seo?.metaTitle || collection?.title || 'Collection';
  const description = collectionPage?.seo?.metaDescription || undefined;
  const ogImage = collectionPage?.heroImage ? pickImageUrl(collectionPage.heroImage, ['large', 'medium']) : undefined;

  return buildMetadata({
    title,
    description,
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

  const [collectionPage, pageData] = await Promise.all([
    getCollectionPage(slug).catch(() => null),
    getCollectionPageData({
      channelCode: channel.code,
      collectionHandle: slug,
      sort: resolvedSearchParams.sort,
      page: resolvedSearchParams.page,
      facets: resolvedSearchParams.facets,
      priceMin: resolvedSearchParams.priceMin,
      priceMax: resolvedSearchParams.priceMax,
    }),
  ]);

  if (!pageData) notFound();

  const activeFacetValueIds = parseActiveFacetValueIds(resolvedSearchParams.facets);
  const basePath = routes.collection(channel.code, slug);
  const bannerImage = collectionPage?.heroImage ? pickImageUrl(collectionPage.heroImage, ['large', 'medium']) : null;
  const title = collectionPage?.title || pageData.collection.title;
  const tagline = collectionPage?.tagline;

  const crumbLd = breadcrumbSchema([
    { name: 'Home', url: absoluteUrl(routes.home(channel.code)) },
    { name: title, url: absoluteUrl(routes.collection(channel.code, slug)) },
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={crumbLd} />
      {bannerImage && (
        /* Campaign banner with the collection name set INTO the image — an editorial
           opening statement rather than a strip of image above a plain heading. */
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-[var(--color-hairline)] md:aspect-[3/1]">
          <Image src={bannerImage} alt={`${title} collection`} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <div className={`absolute inset-x-0 bottom-0 pb-10 md:pb-14 ${CONTAINER}`}>
            <h1 className="font-serif text-display-xl text-[var(--color-paper)]">{title}</h1>
            {tagline && <p className="mt-3 max-w-xl text-sm text-[var(--color-paper)]/85 md:text-base">{tagline}</p>}
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <Breadcrumbs items={[{ name: title, slug }]} channelCode={channel.code} />
        {!bannerImage && (
          <>
            <h1 className="font-serif text-display text-[var(--color-ink)]">{title}</h1>
            {tagline && <p className="max-w-xl text-[var(--color-ink-muted)]">{tagline}</p>}
          </>
        )}
      </div>

      <div className={`pb-section ${CONTAINER}`}>
        <PlpResults
          cards={pageData.cards}
          channelCode={channel.code}
          facetGroups={pageData.facetGroups}
          activeFacetValueIds={activeFacetValueIds}
          basePath={basePath}
          searchParams={resolvedSearchParams}
          sortKey={resolvedSearchParams.sort && isPlpSortKey(resolvedSearchParams.sort) ? resolvedSearchParams.sort : 'relevance'}
          totalItems={pageData.totalItems}
          currentPage={pageData.currentPage}
          totalPages={pageData.totalPages}
        />
      </div>
    </main>
  );
}
