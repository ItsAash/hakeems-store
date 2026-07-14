import { strapiFetch } from '@/lib/strapi/client';
import type { StrapiListResponse, StrapiSingleResponse } from '@/lib/strapi/client';
import {
  brandStorySchema,
  collectionPageSchema,
  homePageSchema,
  listResponse,
  pageSchema,
  singleResponse,
  siteNavSchema,
  siteSettingSchema,
} from '@/lib/strapi/schemas';
import type { BrandStory, CollectionPage, HomePage, Page, SiteNav, SiteSetting } from '@/lib/strapi/types';
import type { ChannelCode } from '@/lib/channel';

/**
 * Populate presets — one source of truth per content type. Keeping the nested-path lists
 * here (instead of inline per call) means a component/media relation is never silently
 * dropped because one query forgot a `populate` path.
 */
const POPULATE: Record<string, string[]> = {
  homePage: [
    'announcements',
    'heroSlides.image',
    'heroSlides.imageMobile',
    'collectionTiles.image',
    'facetCategoryTiles.image',
    'storyParagraphs',
    'storyImage',
    'values',
  ],
  siteNav: ['items.children'],
  siteSetting: ['socialLinks', 'legalLinks'],
  brandStory: ['paragraphs', 'image'],
  collectionPage: ['heroImage', 'seo.ogImage'],
};

/**
 * Deep populate for a Page's dynamic zone — Strapi 5 requires the per-component `on` form
 * for dynamic zones, and one extra level for media/nested components inside each block.
 */
const PAGE_POPULATE = {
  seo: { populate: '*' },
  sections: {
    on: {
      'section.hero-slider': { populate: { slides: { populate: '*' } } },
      'section.category-grid': { populate: { header: true, tiles: { populate: '*' } } },
      'section.product-rail': { populate: { header: true, cta: true } },
      'section.editorial-banner': { populate: { header: true, cta: true } },
      'section.brand-story': { populate: { header: true, paragraphs: true, image: true } },
    },
  },
};

/**
 * A composable page (Phase 3). One entry per (slug, channel). Returns null if none exists,
 * so callers can fall back to a legacy layout during migration.
 */
export async function getPage(slug: string, channel: ChannelCode): Promise<Page | null> {
  const response = await strapiFetch<StrapiListResponse<Page>>('pages', {
    filters: { slug, channel },
    populate: PAGE_POPULATE,
    schema: listResponse(pageSchema),
  });
  return response.data[0] ?? null;
}

export async function getHomePage(channel: ChannelCode): Promise<HomePage | null> {
  const response = await strapiFetch<StrapiListResponse<HomePage>>('home-pages', {
    filters: { channel },
    populate: POPULATE.homePage,
    schema: listResponse(homePageSchema),
  });
  return response.data[0] ?? null;
}

export async function getSiteNav(channel: ChannelCode): Promise<SiteNav | null> {
  const response = await strapiFetch<StrapiListResponse<SiteNav>>('site-navs', {
    filters: { channel },
    populate: POPULATE.siteNav,
    schema: listResponse(siteNavSchema),
  });
  return response.data[0] ?? null;
}

export async function getSiteSetting(): Promise<SiteSetting | null> {
  const response = await strapiFetch<StrapiSingleResponse<SiteSetting>>('site-setting', {
    populate: POPULATE.siteSetting,
    schema: singleResponse(siteSettingSchema),
    notFoundAsNull: true,
  });
  return response.data;
}

/** Global singleton — the shared brand story, authored once, rendered on every channel
 * (a section.brand-story block may override it per page). */
export async function getBrandStory(): Promise<BrandStory | null> {
  const response = await strapiFetch<StrapiSingleResponse<BrandStory>>('brand-story', {
    populate: POPULATE.brandStory,
    schema: singleResponse(brandStorySchema),
    notFoundAsNull: true,
  });
  return response.data;
}

/** Editorial layer over a Vendure collection (banner, tagline, SEO) — Vendure remains
 * the source of truth for the collection's existence, name, and products. */
export async function getCollectionPage(vendureCollectionSlug: string): Promise<CollectionPage | null> {
  const response = await strapiFetch<StrapiListResponse<CollectionPage>>('collection-pages', {
    filters: { vendureCollectionSlug },
    populate: POPULATE.collectionPage,
    schema: listResponse(collectionPageSchema),
  });
  return response.data[0] ?? null;
}
