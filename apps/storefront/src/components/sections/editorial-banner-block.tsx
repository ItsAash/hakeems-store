import type { ChannelCode } from '@/lib/channel';
import type { SectionOf } from '@/lib/strapi/types';
import { listCollectionProducts } from '@/lib/medusa/products';
import { NewArrivalsBanner } from '@/components/marketing/new-arrivals-banner';

const PRODUCT_FETCH_LIMIT = 100;
const MONTAGE_IMAGE_COUNT = 6;

/**
 * `section.editorial-banner` — full-bleed split banner (text panel + product-image montage)
 * for a Medusa collection (by slug). Text/CTA/background come from Strapi; montage images
 * come live from Medusa.
 */
export async function EditorialBannerBlock({
  section,
  channelCode,
}: {
  section: SectionOf<'section.editorial-banner'>;
  channelCode: ChannelCode;
}) {
  const cards = await listCollectionProducts(channelCode, section.collectionSlug, PRODUCT_FETCH_LIMIT).catch(
    () => [],
  );
  const images = cards
    .flatMap((card) => {
      const imgs: string[] = [];
      if (card.defaultImageUrl) imgs.push(card.defaultImageUrl);
      for (const color of card.colors) {
        for (const img of color.images) {
          if (!imgs.includes(img)) imgs.push(img);
        }
      }
      return imgs;
    })
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
