import { strapiFetch } from '@/lib/strapi/client';
import type { StrapiListResponse, StrapiSingleResponse } from '@/lib/strapi/client';
import type { CollectionPage, HomePage, SiteNav, SiteSetting, Spotlight } from '@/lib/strapi/types';
import type { ChannelCode } from '@/lib/channel';

const HOME_PAGE_POPULATE = [
  'announcements',
  'heroSlides.image',
  'heroSlides.imageMobile',
  'collectionTiles.image',
  'facetCategoryTiles.image',
  'storyParagraphs',
  'storyImage',
  'values',
];

export async function getHomePage(channel: ChannelCode): Promise<HomePage | null> {
  const response = await strapiFetch<StrapiListResponse<HomePage>>('home-pages', {
    filters: { channel },
    populate: HOME_PAGE_POPULATE,
  });
  return response.data[0] ?? null;
}

export async function getSiteNav(channel: ChannelCode): Promise<SiteNav | null> {
  const response = await strapiFetch<StrapiListResponse<SiteNav>>('site-navs', {
    filters: { channel },
    populate: ['items.children'],
  });
  return response.data[0] ?? null;
}

export async function getSiteSetting(): Promise<SiteSetting | null> {
  const response = await strapiFetch<StrapiSingleResponse<SiteSetting>>('site-setting', {
    populate: ['socialLinks', 'legalLinks'],
  });
  return response.data;
}

/** Global singleton — the same spotlight collection is featured on every channel. */
export async function getSpotlight(): Promise<Spotlight | null> {
  const response = await strapiFetch<StrapiSingleResponse<Spotlight>>('spotlight', {
    populate: ['paragraphs'],
  });
  return response.data;
}

/** Editorial layer over a Vendure collection (banner, tagline, SEO) — Vendure remains
 * the source of truth for the collection's existence, name, and products. */
export async function getCollectionPage(vendureCollectionSlug: string): Promise<CollectionPage | null> {
  const response = await strapiFetch<StrapiListResponse<CollectionPage>>('collection-pages', {
    filters: { vendureCollectionSlug },
    populate: ['heroImage', 'seo.ogImage'],
  });
  return response.data[0] ?? null;
}
