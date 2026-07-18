import { Suspense } from 'react';
import type { ChannelCode } from '@/lib/channel';
import type { PageSection } from '@/lib/strapi/types';
import { CONTAINER } from '@/lib/ui';
import { HeroSlider } from '@/components/marketing/hero-slider';
import { FacetCategoryGrid } from '@/components/marketing/facet-category-grid';
import { HeroSplitBlock } from '@/components/sections/hero-split-block';
import { EditorialGridBlock } from '@/components/sections/editorial-grid-block';
import { ProductCarouselBlock } from '@/components/sections/product-carousel-block';
import { ProductRailBlock } from '@/components/sections/product-rail-block';
import { EditorialBannerBlock } from '@/components/sections/editorial-banner-block';
import { BrandStoryBlock } from '@/components/sections/brand-story-block';
import { ValuePropsBlock } from '@/components/sections/value-props-block';
import { TestimonialsBlock } from '@/components/sections/testimonials-block';
import { FaqBlock } from '@/components/sections/faq-block';
import { ProseBlock } from '@/components/sections/prose-block';

/** Generic placeholder for a section still fetching its own data (category tile counts,
 * product-rail/editorial-banner product lists) — sized to roughly match a real section so
 * the page doesn't jump much once it resolves. */
function SectionSkeleton() {
  return (
    <div className={`py-section ${CONTAINER}`} aria-hidden="true">
      <div className="h-64 w-full animate-pulse bg-[var(--color-hairline)]" />
    </div>
  );
}

/**
 * Renders a page's dynamic zone by mapping each block's Strapi `__component` to its React
 * renderer. The switch is exhaustive over the PageSection discriminated union, so adding a
 * block type is a compile error until it's handled here; an unknown block (e.g. added in
 * Strapi ahead of code) is skipped rather than crashing the page.
 *
 * Order is whatever the editor arranged in Strapi — reordering there reorders the page with
 * no code change. The three block types that fetch their own product data from Medusa
 * (category-grid's tile counts, product-rail, editorial-banner) are each wrapped in their
 * own Suspense boundary so a slow one streams in independently instead of blocking every
 * section below it — the hero and pure-Strapi blocks need no such wrapping since they have
 * no further data fetching of their own.
 */
export function SectionRenderer({ sections, channelCode }: { sections: PageSection[]; channelCode: ChannelCode }) {
  return (
    <>
      {sections.map((section) => {
        // Dynamic-zone component ids are only unique *within* a component type, so two
        // different blocks can share `id: 1`. Compose the type in for a stable unique key.
        const key = `${section.__component}-${section.id}`;
        switch (section.__component) {
          case 'section.hero-slider':
            return <HeroSlider key={key} slides={section.slides} channelCode={channelCode} />;
          case 'section.hero-split':
            return <HeroSplitBlock key={key} section={section} channelCode={channelCode} />;
          case 'section.editorial-grid':
            return <EditorialGridBlock key={key} section={section} channelCode={channelCode} />;
          case 'section.product-carousel':
            return (
              <Suspense key={key} fallback={<SectionSkeleton />}>
                <ProductCarouselBlock section={section} channelCode={channelCode} />
              </Suspense>
            );
          case 'section.category-grid':
            return (
              <Suspense key={key} fallback={<SectionSkeleton />}>
                <FacetCategoryGrid tiles={section.tiles} header={section.header} channelCode={channelCode} />
              </Suspense>
            );
          case 'section.product-rail':
            return (
              <Suspense key={key} fallback={<SectionSkeleton />}>
                <ProductRailBlock section={section} channelCode={channelCode} />
              </Suspense>
            );
          case 'section.editorial-banner':
            return (
              <Suspense key={key} fallback={<SectionSkeleton />}>
                <EditorialBannerBlock section={section} channelCode={channelCode} />
              </Suspense>
            );
          case 'section.brand-story':
            return <BrandStoryBlock key={key} section={section} />;
          case 'section.value-props':
            return <ValuePropsBlock key={key} section={section} />;
          case 'section.testimonials':
            return <TestimonialsBlock key={key} section={section} />;
          case 'section.faq':
            return <FaqBlock key={key} section={section} />;
          case 'section.prose':
            return <ProseBlock key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
