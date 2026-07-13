import type { ChannelCode } from '@/lib/channel';
import type { NewArrivals } from '@/lib/strapi/types';
import { getVendureClient } from '@/lib/vendure/client';
import { groupVariantsIntoNewArrivals } from '@/lib/vendure/new-arrivals';
import { NewArrivalsBanner } from '@/components/marketing/new-arrivals-banner';

/** Vendure returns one row per size/colour combination; a generous take keeps a
 * reasonably-sized collection from being truncated before grouping into products. */
const VARIANT_FETCH_LIMIT = 100;
/** How many product images fill the montage (3 columns × 2 rows on desktop). */
const MONTAGE_IMAGE_COUNT = 6;

/**
 * Home-page "New Arrivals" section — a full-bleed editorial banner (see NewArrivalsBanner).
 * The heading/eyebrow/copy/CTA/background come from Strapi's "new-arrival" singleton; the
 * montage images come live from the Vendure "new-arrivals" collection, so adding, removing
 * or reordering products there updates the montage with no code change. Renders nothing if
 * the collection has no imagery, so it degrades gracefully.
 */
export async function NewArrivalsBlock({
  newArrivals,
  channelCode,
}: {
  newArrivals: NewArrivals;
  channelCode: ChannelCode;
}) {
  const client = getVendureClient(channelCode);
  const result = await client
    .NewArrivalsCollection({ slug: newArrivals.vendureCollectionSlug, take: VARIANT_FETCH_LIMIT })
    .catch(() => null);

  const products = groupVariantsIntoNewArrivals(result?.collection?.productVariants.items ?? []);
  const images = products
    .map((product) => product.primaryImage)
    .filter((src): src is string => Boolean(src))
    .slice(0, MONTAGE_IMAGE_COUNT);

  if (images.length === 0) return null;

  return (
    <NewArrivalsBanner
      channelCode={channelCode}
      eyebrow={newArrivals.eyebrow}
      heading={newArrivals.heading}
      paragraph={newArrivals.paragraphs[0]?.text ?? null}
      ctaLabel={newArrivals.ctaLabel}
      ctaHref={newArrivals.ctaHref}
      backgroundColor={newArrivals.backgroundColor}
      images={images}
    />
  );
}
