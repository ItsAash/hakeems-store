import { CONTAINER } from '@/lib/ui';
import type { ChannelCode } from '@/lib/channel';
import type { Spotlight } from '@/lib/strapi/types';
import { getVendureClient } from '@/lib/vendure/client';
import { groupVariantsIntoProducts } from '@/lib/vendure/spotlight';
import { SpotlightCarousel } from '@/components/commerce/spotlight-carousel';

/** Vendure returns one row per size/color combination; a generous take keeps a
 * reasonably-sized collection from being truncated before grouping into products. */
const VARIANT_FETCH_LIMIT = 100;

export async function SpotlightBlock({ spotlight, channelCode }: { spotlight: Spotlight; channelCode: ChannelCode }) {
  const client = getVendureClient(channelCode);
  const result = await client
    .SpotlightCollection({ slug: spotlight.vendureCollectionSlug, take: VARIANT_FETCH_LIMIT })
    .catch(() => null);

  const variants = result?.collection?.productVariants.items ?? [];
  const products = groupVariantsIntoProducts(variants);

  if (products.length === 0) return null;

  return (
    <section className={`py-section ${CONTAINER}`}>
      <SpotlightCarousel
        products={products}
        channelCode={channelCode}
        eyebrow={spotlight.eyebrow}
        heading={spotlight.heading}
        paragraph={spotlight.paragraphs[0]?.text ?? null}
        ctaLabel={spotlight.ctaLabel}
        ctaHref={spotlight.ctaHref}
      />
    </section>
  );
}
