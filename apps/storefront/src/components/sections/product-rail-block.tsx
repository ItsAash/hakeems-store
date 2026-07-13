import { CONTAINER } from '@/lib/ui';
import type { ChannelCode } from '@/lib/channel';
import type { SectionOf } from '@/lib/strapi/types';
import { getVendureClient } from '@/lib/vendure/client';
import { groupVariantsIntoProducts } from '@/lib/vendure/spotlight';
import { SpotlightCarousel } from '@/components/commerce/spotlight-carousel';

const VARIANT_FETCH_LIMIT = 100;

/**
 * `section.product-rail` — a horizontal product carousel for a Vendure collection (by slug),
 * with a Strapi-authored header + CTA. Products come live from Vendure; renders nothing if
 * the collection is empty.
 */
export async function ProductRailBlock({
  section,
  channelCode,
}: {
  section: SectionOf<'section.product-rail'>;
  channelCode: ChannelCode;
}) {
  const client = getVendureClient(channelCode);
  const result = await client
    .SpotlightCollection({ slug: section.vendureCollectionSlug, take: VARIANT_FETCH_LIMIT })
    .catch(() => null);

  const products = groupVariantsIntoProducts(result?.collection?.productVariants.items ?? []);
  if (products.length === 0) return null;

  return (
    <section className={`py-section ${CONTAINER}`}>
      <SpotlightCarousel
        products={products}
        channelCode={channelCode}
        eyebrow={section.header?.eyebrow ?? null}
        heading={section.header?.heading ?? ''}
        paragraph={section.header?.subheading ?? null}
        ctaLabel={section.cta?.label ?? null}
        ctaHref={section.cta?.href ?? null}
      />
    </section>
  );
}
