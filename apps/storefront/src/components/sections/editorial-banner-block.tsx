import type { ChannelCode } from '@/lib/channel';
import type { SectionOf } from '@/lib/strapi/types';
import { getVendureClient } from '@/lib/vendure/client';
import { groupVariantsIntoNewArrivals } from '@/lib/vendure/new-arrivals';
import { NewArrivalsBanner } from '@/components/marketing/new-arrivals-banner';

const VARIANT_FETCH_LIMIT = 100;
const MONTAGE_IMAGE_COUNT = 6;

/**
 * `section.editorial-banner` — full-bleed split banner (text panel + product-image montage)
 * for a Vendure collection (by slug). Text/CTA/background come from Strapi; montage images
 * come live from Vendure.
 */
export async function EditorialBannerBlock({
  section,
  channelCode,
}: {
  section: SectionOf<'section.editorial-banner'>;
  channelCode: ChannelCode;
}) {
  const client = getVendureClient(channelCode);
  const result = await client
    .NewArrivalsCollection({ slug: section.vendureCollectionSlug, take: VARIANT_FETCH_LIMIT })
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
      eyebrow={section.header?.eyebrow ?? null}
      heading={section.header?.heading ?? ''}
      paragraph={section.header?.subheading ?? null}
      ctaLabel={section.cta?.label ?? null}
      ctaHref={section.cta?.href ?? null}
      backgroundColor={null}
      backgroundToken={section.backgroundToken ?? null}
      images={images}
    />
  );
}
