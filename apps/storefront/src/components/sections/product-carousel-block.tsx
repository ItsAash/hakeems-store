import { CONTAINER } from '@/lib/ui';
import type { ChannelCode } from '@/lib/channel';
import type { SectionOf } from '@/lib/strapi/types';
import { listCollectionProducts } from '@/lib/medusa/products';
import { SpotlightCarousel } from '@/components/commerce/spotlight-carousel';

/**
 * `section.product-carousel` — the marketing-configurable sibling of `section.product-rail`:
 * same live-from-Medusa card carousel (shared SpotlightCarousel renderer, so no duplicated
 * rail implementation), but with an editor-capped item count and optional autoplay.
 */
export async function ProductCarouselBlock({
  section,
  channelCode,
}: {
  section: SectionOf<'section.product-carousel'>;
  channelCode: ChannelCode;
}) {
  const cards = await listCollectionProducts(channelCode, section.collectionSlug, section.itemLimit).catch(
    () => [],
  );
  if (cards.length === 0) return null;

  return (
    <section className={`py-section ${CONTAINER}`}>
      <SpotlightCarousel
        cards={cards.slice(0, section.itemLimit)}
        channelCode={channelCode}
        eyebrow={section.header?.eyebrow ?? null}
        heading={section.header?.heading ?? ''}
        paragraph={section.header?.subheading ?? null}
        ctaLabel={section.cta?.label ?? null}
        ctaHref={section.cta?.href ?? null}
        autoplay={section.autoplay}
      />
    </section>
  );
}
