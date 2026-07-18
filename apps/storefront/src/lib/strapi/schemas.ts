/**
 * Runtime schemas for every Strapi payload the storefront consumes, and the single source
 * of truth for the corresponding TypeScript types (see `types.ts`, which re-exports
 * `z.infer` of these). Validating at the fetch boundary (see `strapiFetch`) turns silent
 * shape drift — a renamed field, a forgotten `populate`, a Strapi upgrade — into a loud,
 * localized log instead of an `undefined` surfacing deep in a component.
 *
 * Shapes mirror Strapi 5's flattened response format (no `data.attributes` nesting).
 * Nullable scalars/relations use `.nullable()` because Strapi returns `null` (not omitted)
 * for empty fields that exist in the schema.
 */
import { z } from 'zod';
import { COLOR_TOKEN_KEYS } from '@/lib/design/color-tokens';

// ---------- primitives & shared components ----------
const mediaFormatSchema = z.object({ url: z.string(), width: z.number(), height: z.number() });

export const mediaSchema = z.object({
  url: z.string(),
  width: z.number(),
  height: z.number(),
  alternativeText: z.string().nullable(),
  formats: z
    .object({
      thumbnail: mediaFormatSchema.optional(),
      small: mediaFormatSchema.optional(),
      medium: mediaFormatSchema.optional(),
      large: mediaFormatSchema.optional(),
    })
    .nullable(),
});

const paragraphSchema = z.object({ id: z.number(), text: z.string() });

export const socialPlatformSchema = z.enum(['instagram', 'tiktok', 'facebook', 'youtube', 'x', 'whatsapp']);
const channelSchema = z.enum(['nepal', 'hongkong']);

/** Constrained section-background palette (keys defined in lib/design/color-tokens.ts). */
export const colorTokenSchema = z.enum(COLOR_TOKEN_KEYS);

export const seoSchema = z.object({
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  ogImage: mediaSchema.nullable(),
});

// ---------- shared primitive components (Phase 1) ----------
/** Standardized call-to-action; mirrors the Strapi `shared.cta` component. */
export const ctaSchema = z.object({
  id: z.number(),
  label: z.string(),
  href: z.string(),
  variant: z.enum(['primary', 'secondary', 'link']),
  openInNewTab: z.boolean().nullable(),
});

/** Reusable eyebrow/heading/subheading/alignment; mirrors `shared.section-header`. */
export const sectionHeaderSchema = z.object({
  id: z.number(),
  eyebrow: z.string().nullable(),
  heading: z.string(),
  subheading: z.string().nullable(),
  align: z.enum(['left', 'center']),
});

/** Responsive image with optional mobile variant; mirrors `shared.media`. */
export const mediaBlockSchema = z.object({
  id: z.number(),
  image: mediaSchema,
  imageMobile: mediaSchema.nullable(),
  alt: z.string().nullable(),
});

// ---------- content types ----------
export const announcementSchema = z.object({ id: z.number(), text: z.string(), href: z.string().nullable() });

export const heroSlideSchema = z.object({
  id: z.number(),
  image: mediaSchema,
  imageMobile: mediaSchema.nullable(),
  alt: z.string().nullable(),
  heading: z.string(),
  subheading: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  ctaHref: z.string().nullable(),
});

export const facetCategoryTileSchema = z.object({
  id: z.number(),
  /** Stable, namespaced category reference, `"<namespace>:<collectionSlug>"` (e.g.
   * "categories:tops") — only the slug segment is used, resolved against Medusa at render
   * time, never a raw DB id. */
  categoryCode: z.string(),
  label: z.string(),
  tagline: z.string().nullable(),
  image: mediaSchema.nullable(),
});

export const siteSettingSchema = z.object({
  id: z.number(),
  siteName: z.string(),
  tagline: z.string().nullable(),
  /** Site-wide SEO defaults (title/description/OG) — the fallback for any page without its own. */
  defaultSeo: seoSchema.nullable(),
  supportEmail: z.string().nullable(),
  supportPhone: z.string().nullable(),
  footerNote: z.string().nullable(),
  socialLinks: z.array(z.object({ id: z.number(), platform: socialPlatformSchema, url: z.string() })),
  legalLinks: z.array(z.object({ id: z.number(), label: z.string(), href: z.string() })),
});

// ---------- footer (fully editor-managed via the `footer` single type) ----------
const footerLinkSchema = z.object({ id: z.number(), label: z.string(), href: z.string() });
const footerColumnSchema = z.object({
  id: z.number(),
  heading: z.string(),
  links: z.array(footerLinkSchema),
});
const footerContactSchema = z.object({
  id: z.number(),
  heading: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});
const footerNewsletterSchema = z.object({
  id: z.number(),
  enabled: z.boolean(),
  heading: z.string().nullable(),
  description: z.string().nullable(),
  placeholder: z.string().nullable(),
  buttonLabel: z.string().nullable(),
  successMessage: z.string().nullable(),
});

export const footerSchema = z.object({
  id: z.number(),
  brandName: z.string(),
  brandTagline: z.string().nullable(),
  columns: z.array(footerColumnSchema),
  contact: footerContactSchema.nullable(),
  socialLinks: z.array(z.object({ id: z.number(), platform: socialPlatformSchema, url: z.string() })),
  newsletter: footerNewsletterSchema.nullable(),
  legalLinks: z.array(footerLinkSchema),
  copyrightText: z.string().nullable(),
  footerNote: z.string().nullable(),
});

/** Standalone Markdown/rich-text policy page (Privacy, Terms, Shipping & Returns, …). */
export const legalPageSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  seo: seoSchema.nullable(),
  updatedAt: z.string().nullable(),
});

/** One curated colorway gallery (mirrors Strapi `product.colorway-gallery`): CMS-managed
 * imagery for a single color family. `colorName` joins against the Medusa Color option
 * value case-insensitively; `colorHex` renders the swatch chip (wins over Medusa's
 * option-value `metadata.swatch`). */
export const colorwaySchema = z.object({
  id: z.number(),
  colorName: z.string(),
  colorHex: z.string(),
  gallery: z.array(mediaSchema),
});

/** Editorial layer over a Medusa product (matched by handle): titled Markdown panels
 * appended to the PDP's detail accordion, plus optional colorway galleries. Both arrays
 * `.catch([])` so an entry authored with only one of the two (panels is optional since the
 * colorway rollout) degrades to an empty list, never a dropped page. */
export const productPageSchema = z.object({
  id: z.number(),
  productSlug: z.string(),
  panels: z.array(z.object({ id: z.number(), title: z.string(), content: z.string() })).catch([]),
  colorways: z.array(colorwaySchema).catch([]),
});

/** Slim shape for the bulk colorway lookup (`getProductColorwaysBySlugs`), which populates
 * ONLY colorways — validating against the full productPageSchema would flag the absent
 * `panels` on every listing render. */
export const productColorwaysSchema = z.object({
  id: z.number(),
  productSlug: z.string(),
  colorways: z.array(colorwaySchema).catch([]),
});

export const collectionPageSchema = z.object({
  id: z.number(),
  // `medusaCollectionId` is intentionally absent: it is now a private, sync-only key in
  // Strapi. The storefront references collections solely by the stable `collectionSlug`.
  collectionSlug: z.string(),
  title: z.string(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  heroImage: mediaSchema.nullable(),
  seo: seoSchema.nullable(),
});

const navLinkSchema = z.object({ id: z.number(), label: z.string(), href: z.string() });
const navItemSchema = navLinkSchema.extend({ children: z.array(navLinkSchema) });
export const siteNavSchema = z.object({ id: z.number(), channel: channelSchema, items: z.array(navItemSchema) });

// Exposed for `z.infer` in types.ts.
export { navLinkSchema, navItemSchema };

/** Global, channel-agnostic brand story (Phase 4) — the shared base for section.brand-story. */
export const brandStorySchema = z.object({
  id: z.number(),
  eyebrow: z.string().nullable(),
  heading: z.string(),
  paragraphs: z.array(paragraphSchema),
  image: mediaSchema.nullable(),
});

// ---------- dynamic-zone section blocks (Phase 3) ----------
// Each block carries Strapi's `__component` discriminant; the storefront's SectionRenderer
// switches on it. Nested single components are `.nullable()` (Strapi returns null when the
// editor leaves them empty); repeatables default to [].
const heroSliderSectionSchema = z.object({
  __component: z.literal('section.hero-slider'),
  id: z.number(),
  slides: z.array(heroSlideSchema),
});
const heroSplitSectionSchema = z.object({
  __component: z.literal('section.hero-split'),
  id: z.number(),
  header: sectionHeaderSchema,
  media: mediaBlockSchema,
  cta: ctaSchema.nullable(),
  promoLabel: z.string().nullable(),
  imageSide: z.enum(['left', 'right']).catch('right'),
  backgroundToken: colorTokenSchema.nullable().catch(null),
});
const editorialTileSchema = z.object({
  id: z.number(),
  image: mediaSchema,
  alt: z.string(),
  label: z.string().nullable(),
  tagline: z.string().nullable(),
  href: z.string().nullable(),
  span: z.enum(['standard', 'wide', 'tall', 'feature']).catch('standard'),
});
const editorialGridSectionSchema = z.object({
  __component: z.literal('section.editorial-grid'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  tiles: z.array(editorialTileSchema),
});
const productCarouselSectionSchema = z.object({
  __component: z.literal('section.product-carousel'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  collectionSlug: z.string(),
  cta: ctaSchema.nullable(),
  itemLimit: z.number().int().min(4).max(24).catch(12),
  autoplay: z.boolean().catch(false),
});
const categoryGridSectionSchema = z.object({
  __component: z.literal('section.category-grid'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  tiles: z.array(facetCategoryTileSchema),
});
const productRailSectionSchema = z.object({
  __component: z.literal('section.product-rail'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  collectionSlug: z.string(),
  cta: ctaSchema.nullable(),
});
const editorialBannerSectionSchema = z.object({
  __component: z.literal('section.editorial-banner'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  collectionSlug: z.string(),
  cta: ctaSchema.nullable(),
  backgroundToken: colorTokenSchema.nullable().catch(null),
});
const brandStorySectionSchema = z.object({
  __component: z.literal('section.brand-story'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  paragraphs: z.array(paragraphSchema),
  image: mediaSchema.nullable(),
});
const valuePropsSectionSchema = z.object({
  __component: z.literal('section.value-props'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  items: z.array(z.object({ id: z.number(), heading: z.string(), body: z.string() })),
  backgroundToken: colorTokenSchema.nullable().catch(null),
});
const testimonialsSectionSchema = z.object({
  __component: z.literal('section.testimonials'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  items: z.array(
    z.object({ id: z.number(), quote: z.string(), author: z.string(), context: z.string().nullable() }),
  ),
  backgroundToken: colorTokenSchema.nullable().catch(null),
});
const faqSectionSchema = z.object({
  __component: z.literal('section.faq'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  items: z.array(z.object({ id: z.number(), question: z.string(), answer: z.string() })),
});
const proseSectionSchema = z.object({
  __component: z.literal('section.prose'),
  id: z.number(),
  header: sectionHeaderSchema.nullable(),
  content: z.string(),
});

export const pageSectionSchema = z.discriminatedUnion('__component', [
  heroSliderSectionSchema,
  heroSplitSectionSchema,
  categoryGridSectionSchema,
  editorialGridSectionSchema,
  productRailSectionSchema,
  productCarouselSectionSchema,
  editorialBannerSectionSchema,
  brandStorySectionSchema,
  valuePropsSectionSchema,
  testimonialsSectionSchema,
  faqSectionSchema,
  proseSectionSchema,
]);

const KNOWN_SECTION_COMPONENTS: ReadonlySet<string> = new Set(
  pageSectionSchema.options.map((option) => option.shape.__component.value),
);

/**
 * The dynamic zone, made tolerant of blocks the storefront doesn't know yet: an editor
 * adding a brand-new section type in Strapi (ahead of a code deploy) must degrade to "that
 * one block is skipped", never "the whole page fails validation and renders empty".
 */
export const pageSectionsSchema = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter(
          (entry) =>
            entry &&
            typeof entry === 'object' &&
            KNOWN_SECTION_COMPONENTS.has((entry as { __component?: string }).__component ?? ''),
        )
      : value,
  z.array(pageSectionSchema),
);

export const pageSchema = z.object({
  id: z.number(),
  slug: z.string(),
  channel: channelSchema,
  sections: pageSectionsSchema,
  /** Site-wide announcement marquee, authored on the 'home' page per channel and read by
   * the root layout regardless of route (retired from the old home-page content type). */
  announcementBarEnabled: z.boolean().nullable(),
  announcements: z.array(announcementSchema),
});

// ---------- response envelopes ----------
/** Strapi list endpoint: `{ data: T[], meta }`. `meta` is not consumed, so it's lenient. */
export const listResponse = <T extends z.ZodTypeAny>(item: T) => z.object({ data: z.array(item), meta: z.any() });
/** Strapi single-type endpoint: `{ data: T | null }`. */
export const singleResponse = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ data: item.nullable(), meta: z.any() });
