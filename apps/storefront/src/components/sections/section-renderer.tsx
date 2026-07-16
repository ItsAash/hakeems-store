import type { ChannelCode } from '@/lib/channel';
import type { PageSection } from '@/lib/strapi/types';
import { HeroSlider } from '@/components/marketing/hero-slider';
import { FacetCategoryGrid } from '@/components/marketing/facet-category-grid';
import { ProductRailBlock } from '@/components/sections/product-rail-block';
import { EditorialBannerBlock } from '@/components/sections/editorial-banner-block';
import { BrandStoryBlock } from '@/components/sections/brand-story-block';
import { ValuePropsBlock } from '@/components/sections/value-props-block';
import { TestimonialsBlock } from '@/components/sections/testimonials-block';
import { FaqBlock } from '@/components/sections/faq-block';
import { ProseBlock } from '@/components/sections/prose-block';

/**
 * Renders a page's dynamic zone by mapping each block's Strapi `__component` to its React
 * renderer. The switch is exhaustive over the PageSection discriminated union, so adding a
 * block type is a compile error until it's handled here; an unknown block (e.g. added in
 * Strapi ahead of code) is skipped rather than crashing the page.
 *
 * Order is whatever the editor arranged in Strapi — reordering there reorders the page with
 * no code change.
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
          case 'section.category-grid':
            return (
              <FacetCategoryGrid key={key} tiles={section.tiles} header={section.header} channelCode={channelCode} />
            );
          case 'section.product-rail':
            return <ProductRailBlock key={key} section={section} channelCode={channelCode} />;
          case 'section.editorial-banner':
            return <EditorialBannerBlock key={key} section={section} channelCode={channelCode} />;
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
