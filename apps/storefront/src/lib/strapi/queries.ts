import { strapiFetch } from '@/lib/strapi/client';
import type { StrapiListResponse, StrapiSingleResponse } from '@/lib/strapi/client';
import {
  brandStorySchema,
  collectionPageSchema,
  footerSchema,
  legalPageSchema,
  listResponse,
  pageSchema,
  singleResponse,
  siteNavSchema,
  siteSettingSchema,
} from '@/lib/strapi/schemas';
import type { BrandStory, CollectionPage, FooterContent, LegalPage, Page, SiteNav, SiteSetting } from '@/lib/strapi/types';
import type { ChannelCode } from '@/lib/channel';

/**
 * Populate presets — one source of truth per content type. Keeping the nested-path lists
 * here (instead of inline per call) means a component/media relation is never silently
 * dropped because one query forgot a `populate` path.
 */
const POPULATE: Record<string, string[]> = {
  siteNav: ['items.children'],
  siteSetting: ['socialLinks', 'legalLinks', 'defaultSeo', 'defaultSeo.ogImage'],
  footer: ['columns.links', 'contact', 'socialLinks', 'newsletter', 'legalLinks'],
  brandStory: ['paragraphs', 'image'],
  collectionPage: ['heroImage', 'seo.ogImage'],
  legalPage: ['seo.ogImage'],
};

/**
 * Deep populate for a Page's dynamic zone — Strapi 5 requires the per-component `on` form
 * for dynamic zones, and one extra level for media/nested components inside each block.
 */
const PAGE_POPULATE = {
  seo: { populate: '*' },
  announcements: true,
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
 * A composable page. One entry per (slug, channel) — e.g. slug 'home' also carries the
 * site-wide announcement-bar config the root layout reads regardless of route (the retired
 * home-page content type used to own that). Returns null if none exists.
 */
export async function getPage(slug: string, channel: ChannelCode): Promise<Page | null> {
  const response = await strapiFetch<StrapiListResponse<Page>>('pages', {
    filters: { slug, channel },
    populate: PAGE_POPULATE,
    schema: listResponse(pageSchema),
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

/** Global, editor-managed site footer (single type). Everything the footer renders —
 * brand blurb, link columns, contact, socials, newsletter copy, legal links, copyright —
 * comes from here. Returns null when no entry exists yet, so the footer can fall back. */
export async function getFooter(): Promise<FooterContent | null> {
  const response = await strapiFetch<StrapiSingleResponse<FooterContent>>('footer', {
    populate: POPULATE.footer,
    schema: singleResponse(footerSchema),
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
/** A standalone Markdown policy page by slug (privacy, terms, shipping-returns, …). Returns
 * null when no published entry exists, so the route can 404 cleanly. Channel-agnostic —
 * legal copy is shared across channels. */
export async function getLegalPage(slug: string): Promise<LegalPage | null> {
  const response = await strapiFetch<StrapiListResponse<LegalPage>>('legal-pages', {
    filters: { slug },
    populate: POPULATE.legalPage,
    schema: listResponse(legalPageSchema),
  });
  return response.data[0] ?? null;
}

/** Slugs + last-modified of all published legal pages — for the sitemap. */
export async function getLegalPageSlugs(): Promise<Array<{ slug: string; updatedAt: string | null }>> {
  const response = await strapiFetch<StrapiListResponse<{ slug: string; updatedAt: string | null }>>('legal-pages', {
    revalidate: 3600,
  });
  return response.data.map((entry) => ({ slug: entry.slug, updatedAt: entry.updatedAt }));
}

export async function getCollectionPage(vendureCollectionSlug: string): Promise<CollectionPage | null> {
  const response = await strapiFetch<StrapiListResponse<CollectionPage>>('collection-pages', {
    filters: { vendureCollectionSlug },
    populate: POPULATE.collectionPage,
    schema: listResponse(collectionPageSchema),
  });
  return response.data[0] ?? null;
}
