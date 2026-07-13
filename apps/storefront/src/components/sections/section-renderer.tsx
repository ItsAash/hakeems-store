import type { ChannelCode } from '@/lib/channel';
import type { PageSection } from '@/lib/strapi/types';
import { HeroSlider } from '@/components/marketing/hero-slider';
import { FacetCategoryGrid } from '@/components/marketing/facet-category-grid';
import { ProductRailBlock } from '@/components/sections/product-rail-block';
import { EditorialBannerBlock } from '@/components/sections/editorial-banner-block';
import { BrandStoryBlock } from '@/components/sections/brand-story-block';

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
        switch (section.__component) {
          case 'section.hero-slider':
            return <HeroSlider key={section.id} slides={section.slides} channelCode={channelCode} />;
          case 'section.category-grid':
            return (
              <FacetCategoryGrid key={section.id} tiles={section.tiles} header={section.header} channelCode={channelCode} />
            );
          case 'section.product-rail':
            return <ProductRailBlock key={section.id} section={section} channelCode={channelCode} />;
          case 'section.editorial-banner':
            return <EditorialBannerBlock key={section.id} section={section} channelCode={channelCode} />;
          case 'section.brand-story':
            return <BrandStoryBlock key={section.id} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
