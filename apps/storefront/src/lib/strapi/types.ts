/**
 * Content types for Strapi payloads. These are now **derived** from the runtime Zod
 * schemas in `./schemas` (single source of truth) via `z.infer`, so the compile-time
 * types and the runtime validation can never drift apart. Import sites are unchanged.
 */
import type { z } from 'zod';
import type {
  announcementSchema,
  brandStorySchema,
  collectionPageSchema,
  ctaSchema,
  facetCategoryTileSchema,
  footerSchema,
  heroSlideSchema,
  legalPageSchema,
  mediaBlockSchema,
  mediaSchema,
  navItemSchema,
  navLinkSchema,
  pageSchema,
  pageSectionSchema,
  productPageSchema,
  sectionHeaderSchema,
  seoSchema,
  siteNavSchema,
  siteSettingSchema,
  socialPlatformSchema,
} from '@/lib/strapi/schemas';

export type StrapiMedia = z.infer<typeof mediaSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type HeroSlide = z.infer<typeof heroSlideSchema>;
export type FacetCategoryTile = z.infer<typeof facetCategoryTileSchema>;

export type SocialPlatform = z.infer<typeof socialPlatformSchema>;
export type SiteSetting = z.infer<typeof siteSettingSchema>;

/** Fully editor-managed site footer (Strapi `footer` single type). Named `FooterContent`
 * to avoid colliding with the `Footer` React component that consumes it. */
export type FooterContent = z.infer<typeof footerSchema>;
export type Seo = z.infer<typeof seoSchema>;

/** Global shared brand story (Phase 4). */
export type BrandStory = z.infer<typeof brandStorySchema>;

/**
 * One per Vendure collection, created and kept in sync automatically by Vendure's
 * collection-sync plugin (matched by vendureCollectionSlug) — editors only add the
 * banner/tagline/description/SEO on top of what Vendure owns.
 */
export type CollectionPage = z.infer<typeof collectionPageSchema>;

/** Standalone Markdown policy page (Privacy, Terms, Shipping & Returns, …). */
export type LegalPage = z.infer<typeof legalPageSchema>;

/** Editorial Markdown panels layered onto a Vendure product's PDP (matched by slug). */
export type ProductPage = z.infer<typeof productPageSchema>;

export type NavLink = z.infer<typeof navLinkSchema>;
export type NavItem = z.infer<typeof navItemSchema>;
export type SiteNav = z.infer<typeof siteNavSchema>;

// Shared primitive components (Phase 1) — consumed by dynamic-zone blocks in Phase 3.
export type Cta = z.infer<typeof ctaSchema>;
export type SectionHeader = z.infer<typeof sectionHeaderSchema>;
export type MediaBlock = z.infer<typeof mediaBlockSchema>;

// Composable page (Phase 3) — a dynamic zone of section blocks.
export type Page = z.infer<typeof pageSchema>;
export type PageSection = z.infer<typeof pageSectionSchema>;
/** Narrow a section by its Strapi `__component` discriminant. */
export type SectionOf<T extends PageSection['__component']> = Extract<PageSection, { __component: T }>;
