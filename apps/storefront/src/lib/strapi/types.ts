type StrapiMediaFormat = { url: string; width: number; height: number };

export type StrapiMedia = {
  url: string;
  width: number;
  height: number;
  alternativeText: string | null;
  formats: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  } | null;
};

export type Announcement = {
  id: number;
  text: string;
  href: string | null;
};

export type HeroSlide = {
  id: number;
  image: StrapiMedia;
  imageMobile: StrapiMedia | null;
  alt: string | null;
  heading: string;
  subheading: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type CollectionTile = {
  id: number;
  vendureCollectionSlug: string;
  label: string;
  tagline: string | null;
  image: StrapiMedia | null;
};

export type FacetCategoryTile = {
  id: number;
  vendureFacetValueId: string;
  label: string;
  tagline: string | null;
  image: StrapiMedia | null;
};

/**
 * Global, not per-channel — one curated Vendure collection is spotlighted
 * identically on every storefront (see the "spotlight" single type in Strapi).
 * Vendure still prices/localizes the products per-channel at render time.
 */
export type Spotlight = {
  id: number;
  vendureCollectionSlug: string;
  eyebrow: string | null;
  heading: string;
  paragraphs: Array<{ id: number; text: string }>;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type Seo = {
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: StrapiMedia | null;
};

/**
 * One per Vendure collection, created and kept in sync automatically by Vendure's
 * collection-sync plugin (matched by vendureCollectionSlug) — editors only add the
 * banner/tagline/description/SEO on top of what Vendure already owns (name, slug,
 * which products belong to it).
 */
export type CollectionPage = {
  id: number;
  vendureId: string;
  vendureCollectionSlug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  heroImage: StrapiMedia | null;
  seo: Seo | null;
};

export type HomePage = {
  id: number;
  channel: 'nepal' | 'hongkong';
  /** Single on/off switch for the whole marquee — null on rows created before this
   * field existed, which must read as "on" the same way the rest of the boolean
   * toggles in this schema do. */
  announcementBarEnabled: boolean | null;
  announcements: Announcement[];
  heroSlides: HeroSlide[];
  collectionTiles: CollectionTile[];
  facetCategoryTiles: FacetCategoryTile[];
  storyEyebrow: string | null;
  storyHeading: string | null;
  storyParagraphs: Array<{ id: number; text: string }>;
  storyImage: StrapiMedia | null;
  values: Array<{ id: number; heading: string; body: string }>;
};

export type NavLink = { id: number; label: string; href: string };
export type NavItem = NavLink & { children: NavLink[] };

export type SiteNav = {
  id: number;
  channel: 'nepal' | 'hongkong';
  items: NavItem[];
};

export type SiteSetting = {
  id: number;
  siteName: string;
  tagline: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  footerNote: string | null;
};
