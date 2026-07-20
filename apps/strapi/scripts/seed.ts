/**
 * Idempotent content seed for the Lopho CMS, mirroring the pattern in
 * apps/medusa/src/seed.ts. Boots Strapi's core (no HTTP server — see
 * `.load()` vs `.start()` below) and writes through the Document Service
 * directly, so it needs no admin credentials or API token.
 *
 * Collection pages are NOT created here: Medusa's collection-sync subscriber creates
 * them automatically (see apps/medusa/src/subscribers/collection-sync.ts) whenever a
 * collection is created in Medusa. Run `pnpm --filter @lopho/medusa seed`
 * first (the root `seed` script already does this in order) so those entries
 * exist before this script enriches them with banners/copy/featured flags.
 *
 * Run with: pnpm --filter @lopho/strapi seed
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileStrapi, createStrapi } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

const unsplash = (photoId: string, params = 'w=2000&q=80&fit=crop') => `https://images.unsplash.com/${photoId}?${params}`;

let tmpDir: string;

/** Downloads an Unsplash image once and uploads it to Strapi's media library, keyed by file name. */
async function uploadImage(strapi: Core.Strapi, url: string, fileName: string): Promise<number> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: fileName } });
  if (existing) return existing.id;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const filepath = path.join(tmpDir, fileName);
  fs.writeFileSync(filepath, buffer);

  const uploadService = strapi.plugin('upload').service('upload');
  const [uploaded] = await uploadService.upload({
    data: {},
    files: {
      filepath,
      originalFilename: fileName,
      mimetype: 'image/jpeg',
      size: buffer.length,
    },
  });
  return uploaded.id;
}

type DraftUID = 'api::site-nav.site-nav' | 'api::legal-page.legal-page' | 'api::product-page.product-page';

// Seed data is assembled as plain object literals below, which won't structurally match
// the Document Service's generated per-content-type Input types (components in particular
// lose their literal enum narrowing once spread across multiple call sites) — `any` here
// trades that compile-time check for keeping the seed data readable as plain literals.
async function upsertAndPublish(strapi: Core.Strapi, uid: DraftUID, filters: Record<string, unknown>, data: any) {
  const existing = await strapi.documents(uid).findFirst({ filters, status: 'draft' });
  let documentId: string;
  if (existing) {
    await strapi.documents(uid).update({ documentId: existing.documentId, data });
    documentId = existing.documentId;
  } else {
    const created = await strapi.documents(uid).create({ data });
    documentId = created.documentId;
  }
  await strapi.documents(uid).publish({ documentId });
  return documentId;
}

async function seedSiteSetting(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::site-setting.site-setting').findFirst({});
  // See the comment on upsertAndPublish above re: `any` for hand-written seed literals.
  const data: any = {
    siteName: 'Lopho',
    tagline: 'Community streetwear, designed in Kathmandu.',
    defaultSeo: {
      metaTitle: 'Lopho — Community Streetwear',
      metaDescription:
        'Streetwear designed in Kathmandu, worn in Nepal and Hong Kong. Small-batch drops, real fabric, built for the pop-up and the street.',
    },
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/lopho' },
      { platform: 'tiktok', url: 'https://tiktok.com/@lopho' },
    ],
    supportEmail: 'support@lopho.com',
    supportPhone: '+977-1-4000000',
    footerNote: 'All prices include tax. Shipping calculated at checkout by district/city.',
    legalLinks: [
      { label: 'Shipping & Returns', href: '/shipping-returns' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  };

  if (existing) {
    await strapi.documents('api::site-setting.site-setting').update({ documentId: existing.documentId, data });
  } else {
    await strapi.documents('api::site-setting.site-setting').create({ data });
  }
  console.log('Seeded site-setting');
}

async function seedFooter(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::footer.footer').findFirst({});
  // See the comment on upsertAndPublish above re: `any` for hand-written seed literals.
  const data: any = {
    brandName: 'Lopho',
    brandTagline: 'Community streetwear, designed in Kathmandu — small-batch drops, real fabric, built for the street.',
    columns: [
      {
        heading: 'Shop',
        links: [
          { label: 'New Arrivals', href: '/shop?sort=newest' },
          { label: 'All Products', href: '/shop' },
          { label: 'Collections', href: '/collections' },
          { label: 'Spotlight', href: '/shop?spotlight=true' },
        ],
      },
      {
        heading: 'Company',
        links: [
          { label: 'Our Story', href: '/story' },
          { label: 'Stockists', href: '/story' },
          { label: 'Careers', href: '/story' },
        ],
      },
      {
        heading: 'Support',
        links: [
          { label: 'My Account', href: '/account' },
          { label: 'Track Order', href: '/account/orders' },
          { label: 'Shipping & Returns', href: '/shipping-returns' },
        ],
      },
    ],
    contact: {
      heading: 'Get in touch',
      email: 'support@lopho.com',
      phone: '+977-1-4000000',
      address: 'Jhamsikhel, Lalitpur\nKathmandu, Nepal',
    },
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/lopho' },
      { platform: 'tiktok', url: 'https://tiktok.com/@lopho' },
    ],
    newsletter: {
      enabled: true,
      heading: 'Join the list',
      description: 'Early access to drops, restocks and studio notes. No spam — unsubscribe anytime.',
      placeholder: 'Enter your email',
      buttonLabel: 'Subscribe',
      successMessage: "Thanks — you're on the list.",
    },
    legalLinks: [
      { label: 'Shipping & Returns', href: '/shipping-returns' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
    copyrightText: '© {year} {siteName}. All rights reserved.',
    footerNote: 'All prices include tax. Shipping calculated at checkout by district/city.',
  };

  if (existing) {
    await strapi.documents('api::footer.footer').update({ documentId: existing.documentId, data });
  } else {
    await strapi.documents('api::footer.footer').create({ data });
  }
  console.log('Seeded footer');
}

async function seedSiteNavs(strapi: Core.Strapi) {
  // Both channels share the same catalog shape (the scraped-catalog taxonomy + one
  // cross-channel Spotlight capsule) — no channel-exclusive collections — so nepal and
  // hongkong get the same nav structure.
  const shopChildren = [
    { label: 'Tops', href: '/collections/tops' },
    { label: 'Bottoms', href: '/collections/bottoms' },
    { label: 'Bras', href: '/collections/bras' },
    { label: 'Jackets', href: '/collections/jackets' },
    { label: 'Accessories', href: '/collections/accessories' },
  ];
  const items = [
    { label: 'Spotlight', href: '/collections/spotlight' },
    // "Shop" is the explicit full-catalog entry point (/shop). Its children are category
    // entry points, which each go to their Collection page.
    { label: 'Shop', href: '/shop', children: shopChildren },
    { label: 'Our Story', href: '/story' },
  ];

  await upsertAndPublish(strapi, 'api::site-nav.site-nav', { channel: 'nepal' }, { channel: 'nepal', items });
  await upsertAndPublish(strapi, 'api::site-nav.site-nav', { channel: 'hongkong' }, { channel: 'hongkong', items });

  console.log('Seeded site-nav (nepal, hongkong)');
}

/**
 * Seeds the standalone legal/policy pages linked from the footer. The body is Markdown, edited
 * freely by admins in Strapi afterwards; these are just sensible starting drafts. Idempotent by
 * slug (matches the footer legalLinks: /privacy, /terms, /shipping-returns).
 */
async function seedLegalPages(strapi: Core.Strapi) {
  const pages: Array<{ slug: string; title: string; content: string; seo: { metaTitle: string; metaDescription: string } }> = [
    {
      slug: 'privacy',
      title: 'Privacy Policy',
      seo: {
        metaTitle: 'Privacy Policy — Lopho',
        metaDescription: 'How Lopho collects, uses, and protects your personal information when you shop with us.',
      },
      content: `Your privacy matters to us. This policy explains what we collect, why we collect it, and the choices you have. It applies to lopho.com and every order placed with Lopho in Nepal and Hong Kong.

## Information We Collect

- **Details you give us** — name, email, phone, shipping and billing address, and order history when you create an account or check out.
- **Payment information** — processed securely by our payment providers. We never store your full card number on our servers.
- **Usage data** — pages viewed, items browsed, and device/browser information, collected to improve the store.

## How We Use Your Information

We use your information to:

1. Process and deliver your orders, and send order updates.
2. Provide customer support and respond to your requests.
3. Improve our products, site, and shopping experience.
4. Send marketing emails **only** when you have opted in — you can unsubscribe at any time.

## Sharing Your Information

We do not sell your personal information. We share it only with the service providers who help us run the store — payment processors, delivery partners, and email providers — and only to the extent they need it to perform their service, or where required by law.

## Cookies

We use cookies to keep you signed in, remember your cart, and understand how the site is used. You can control cookies through your browser settings; disabling them may affect parts of the site.

## Your Rights

You may request access to, correction of, or deletion of your personal data, and you may object to certain processing. To exercise any of these rights, contact us using the details below.

## Data Retention

We keep your information for as long as your account is active or as needed to provide our services and meet legal, tax, and accounting obligations.

## Contact Us

Questions about this policy? Email us at [support@lopho.com](mailto:support@lopho.com) and we'll be happy to help.`,
    },
    {
      slug: 'terms',
      title: 'Terms of Service',
      seo: {
        metaTitle: 'Terms of Service — Lopho',
        metaDescription: 'The terms that govern your use of the Lopho store and any purchase you make with us.',
      },
      content: `Welcome to Lopho. By using our site or placing an order, you agree to these terms.

## Orders

All orders are subject to acceptance and product availability. We reserve the right to refuse or cancel an order, and will refund any payment in full if we do.

## Pricing

Prices are shown in your channel's currency and include tax where applicable. Shipping is calculated at checkout based on your delivery zone. We may update prices at any time, but changes will not affect orders already placed.

## Products

We work hard to show our products accurately, but colours and details may vary slightly between screens and the finished garment.

## Intellectual Property

All content on this site — text, imagery, and designs — belongs to Lopho and may not be reused without permission.

## Contact

For anything about these terms, reach us at [support@lopho.com](mailto:support@lopho.com).`,
    },
    {
      slug: 'shipping-returns',
      title: 'Shipping & Returns',
      seo: {
        metaTitle: 'Shipping & Returns — Lopho',
        metaDescription: 'Delivery timelines, shipping rates, and how to return or exchange an item bought from Lopho.',
      },
      content: `## Shipping

Orders are dispatched within 1–2 business days. Shipping is calculated at checkout by delivery zone. Free shipping applies within the Kathmandu Valley on orders over NPR 5,000, and on Hong Kong Island for orders over HKD 800.

## Returns

Unworn items with their original tags can be returned within **14 days** of delivery. Final-sale pieces, marked at checkout, cannot be returned.

## How to Return

1. Email [support@lopho.com](mailto:support@lopho.com) with your order number.
2. We'll share return instructions and the nearest drop-off or pickup option.
3. Once we receive and inspect your item, your refund is issued to the original payment method.

## Exchanges

Need a different size or colour? Start a return and place a new order — it's the fastest way to get what you want before it sells out.`,
    },
  ];

  for (const page of pages) {
    await upsertAndPublish(strapi, 'api::legal-page.legal-page', { slug: page.slug }, page);
  }

  console.log('Seeded legal-pages (privacy, terms, shipping-returns)');
}

/**
 * Enriches collection-page entries that Medusa's collection-sync subscriber already created
 * (matched by collectionSlug) with banner image, tagline, description, and featured
 * flag. Deliberately does NOT create entries here — Medusa is the source of truth for
 * which collections exist, so a slug with no matching entry means the collection hasn't
 * synced yet (Strapi was down, or `pnpm --filter @lopho/medusa seed` hasn't run) and is
 * skipped with a warning rather than faked.
 */
async function seedCollectionPages(strapi: Core.Strapi) {
  // Collection banners stay editorial Unsplash: the scraped catalog assets are 520px
  // product shots — unsuitable for a 2800px full-bleed banner (documented in the log).
  const heroTops = await uploadImage(strapi, unsplash('photo-1445205170230-053b83016050', 'w=1600&h=900&fit=crop&q=80'), 'collection-tops.jpg');
  const heroBottoms = await uploadImage(strapi, unsplash('photo-1560243563-062bfc001d68', 'w=1600&h=900&fit=crop&q=80'), 'collection-bottoms.jpg');
  const heroBras = await uploadImage(strapi, unsplash('photo-1518611012118-696072aa579a', 'w=1600&h=900&fit=crop&q=80'), 'collection-bras.jpg');
  const heroJackets = await uploadImage(strapi, unsplash('photo-1551488831-00ddcb6c6bd3', 'w=1600&h=900&fit=crop&q=80'), 'collection-jackets.jpg');
  const heroAccessories = await uploadImage(strapi, unsplash('photo-1606522754091-a3bbf9ad4cb3', 'w=1600&h=900&fit=crop&q=80'), 'collection-accessories.jpg');
  const heroSpotlight = await uploadImage(strapi, unsplash('photo-1571945153237-4929e783af4a', 'w=1600&h=900&fit=crop&q=80'), 'collection-spotlight.jpg');
  const heroNewArrivals = await uploadImage(strapi, unsplash('photo-1558769132-cb1aea458c5e', 'w=1600&h=900&fit=crop&q=80'), 'collection-new-arrivals.jpg');

  const enrichments: Array<{ collectionSlug: string; data: Record<string, unknown> }> = [
    {
      collectionSlug: 'tops',
      data: {
        title: 'Tops',
        tagline: 'Tees, tanks, sweats and shirting',
        description: 'Tees, tanks, fleece and crisp poplin — the upper half of every fit.',
        heroImage: heroTops,
        featured: false,
        sortOrder: 1,
      },
    },
    {
      collectionSlug: 'bottoms',
      data: {
        title: 'Bottoms',
        tagline: 'Pants, shorts and leggings',
        description: 'Featherweight pants, run shorts and rib leggings — built to move.',
        heroImage: heroBottoms,
        featured: false,
        sortOrder: 2,
      },
    },
    {
      collectionSlug: 'bras',
      data: {
        title: 'Bras',
        tagline: 'Every support level, every size',
        description: 'From studio scoops to high-impact support, sized A to DD and beyond.',
        heroImage: heroBras,
        featured: false,
        sortOrder: 3,
      },
    },
    {
      collectionSlug: 'jackets',
      data: {
        title: 'Jackets',
        tagline: 'Layers for weather and warm-ups',
        description: 'Rain shells and crop layers that finish the fit and shrug the weather.',
        heroImage: heroJackets,
        featured: false,
        sortOrder: 4,
      },
    },
    {
      collectionSlug: 'accessories',
      data: {
        title: 'Accessories',
        tagline: 'Pouches, caps and carry-alls',
        description: 'The pieces that organize the kit — pouches, caps and carry-alls.',
        heroImage: heroAccessories,
        featured: false,
        sortOrder: 5,
      },
    },
    {
      collectionSlug: 'spotlight',
      data: {
        title: 'Spotlight',
        tagline: 'This week, front row',
        description: 'A rotating edit of the pieces we’re wearing most right now — restocked while they last.',
        heroImage: heroSpotlight,
        featured: true,
        sortOrder: 6,
      },
    },
    {
      collectionSlug: 'new-arrivals',
      data: {
        title: 'New Arrivals',
        tagline: 'Just landed',
        description: 'The latest drop — fresh colorways and new silhouettes, straight off the line.',
        heroImage: heroNewArrivals,
        featured: true,
        sortOrder: 7,
      },
    },
  ];

  const uid = 'api::collection-page.collection-page';
  let enriched = 0;
  for (const { collectionSlug, data } of enrichments) {
    const existing = await strapi.documents(uid).findFirst({ filters: { collectionSlug }, status: 'draft' });
    if (!existing) {
      console.warn(`Skipping "${collectionSlug}": no synced collection-page yet (has Medusa's seed run and pushed it?)`);
      continue;
    }
    await strapi.documents(uid).update({ documentId: existing.documentId, data });
    await strapi.documents(uid).publish({ documentId: existing.documentId });
    enriched += 1;
  }
  console.log(`Enriched ${enriched}/${enrichments.length} collection-page entries`);
}

/**
 * The global, channel-agnostic brand story — authored once here as the single source of
 * truth. Section blocks render this shared story by default, so it's never duplicated
 * per channel. No longer sourced from home-page (retired in favor of the Page builder).
 */
async function seedBrandStory(strapi: Core.Strapi) {
  const storyImage = await uploadImage(strapi, unsplash('photo-1441986300917-64674bd600d8', 'w=1400&h=1120&fit=crop&q=80'), 'brand-story.jpg');
  const data: any = {
    eyebrow: 'The Brand',
    heading: 'Not made in a boardroom.',
    paragraphs: [
      {
        text: 'Lopho started as a pop-up table at a Kathmandu street event and grew into a full collection without losing that instinct — small batches, real fabric, and pieces built to survive an actual event, not just a lookbook.',
      },
      { text: 'Every drop is unisex by design. Fit and gender are personal choices, not aisles you have to pick a side of.' },
    ],
    image: storyImage,
  };
  const existing = await strapi.documents('api::brand-story.brand-story').findFirst({});
  if (existing) {
    await strapi.documents('api::brand-story.brand-story').update({ documentId: existing.documentId, data });
  } else {
    await strapi.documents('api::brand-story.brand-story').create({ data });
  }
  console.log('Seeded brand-story (global)');
}

/** Per-channel announcement-bar copy — the only piece of the retired home-page content
 * type that's genuinely per-channel rather than page content; it lives directly on each
 * channel's 'home' Page now (see seedPages) and the root layout reads it from there. */
const CHANNEL_ANNOUNCEMENTS: Record<'nepal' | 'hongkong', Array<{ text: string }>> = {
  nepal: [
    { text: 'FREE SHIPPING WITHIN KATHMANDU VALLEY ON ORDERS OVER NPR 5,000' },
    { text: 'NEW DROP — SS26 NOW AVAILABLE' },
    { text: 'POP-UP AT JAWALAKHEL — EVERY LAST SATURDAY' },
  ],
  hongkong: [
    { text: 'FREE HK ISLAND DELIVERY ON ORDERS OVER HKD 800' },
    { text: 'NEW DROP — SS26 NOW AVAILABLE' },
    { text: 'POP-UP AT PMQ — FIRST WEEKEND OF EVERY MONTH' },
  ],
};

/** Brand-pillar strip shown right under the hero — channel-agnostic, matches the voice
 * already established in seedBrandStory. */
const VALUE_PROPS = [
  { heading: 'Small-Batch Drops', body: "Every style is cut in limited runs — once it's gone, it's gone. No overproduction, no filler." },
  { heading: 'Fabric You Can Feel', body: 'Technical knits and heavyweight fleece, tested on the street before they ever hit a rack.' },
  { heading: 'Unisex By Design', body: 'Every piece is cut for any body. Fit is a choice, not an aisle.' },
  { heading: 'Made Between Nepal & Hong Kong', body: 'Designed in Kathmandu, worn from Jhamsikhel to the harbour — one collection, two cities.' },
];

/** Per-channel social proof — quotes are written to feel local to each market rather
 * than reused verbatim across channels. */
const CHANNEL_TESTIMONIALS: Record<'nepal' | 'hongkong', Array<{ quote: string; author: string; context: string }>> = {
  nepal: [
    { quote: 'The Brooklyn pant goes from the office to the evening walk without missing a beat. I own three colours now.', author: 'Aayusha R.', context: 'Kathmandu' },
    { quote: 'The Forever Fleece crew in Elm is the softest thing I own. Real quality, not fast-fashion quality.', author: 'Bibek T.', context: 'Lalitpur' },
    { quote: 'First activewear brand where the bra actually fits the way it looks on the model.', author: 'Prakriti S.', context: 'Verified buyer' },
  ],
  hongkong: [
    { quote: 'The Breezy Tank is cut for actual humidity — finally a brand that gets HK summers.', author: 'Chloe W.', context: 'Hong Kong Island' },
    { quote: 'The Interval bra held up through a 10K in Kowloon heat and still looks new.', author: 'Marcus L.', context: 'Kowloon' },
    { quote: 'Ordered the Salutation crop jacket in Breaker, arrived in days. Worth it.', author: 'Priya N.', context: 'Verified buyer' },
  ],
};

/**
 * Composes each channel's 'home' Page (dynamic zone) directly — the sole source of truth
 * for home-page content now that the home-page collection type is retired. Sections are
 * literal here (previously they were migrated from home-page's fields); reorder/add/remove
 * them straight in Strapi afterwards with no code change needed.
 */
/** Look up a catalog image already uploaded by seed-catalog.ts (keyed by its
 * deterministic file name); null when the catalog seed hasn't run. */
async function findCatalogImage(strapi: Core.Strapi, fileName: string): Promise<number | null> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: fileName } });
  return existing?.id ?? null;
}

async function seedPages(strapi: Core.Strapi) {
  // Category tiles use REAL catalog imagery (uploaded by seed:catalog); each falls back
  // to an editorial Unsplash shot only if the catalog seed hasn't run yet.
  const tileTops =
    (await findCatalogImage(strapi, 'catalog-18_forever_fleece_relaxed_crew_sweatshirt-elm-elm_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1445205170230-053b83016050', 'w=1200&h=1500&fit=crop&q=80'), 'tile-tops.jpg'));
  const tileBottoms =
    (await findCatalogImage(strapi, 'catalog-01_brooklyn_mid_rise_ankle_pant-navy-navy_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1560243563-062bfc001d68', 'w=1200&h=1500&fit=crop&q=80'), 'tile-bottoms.jpg'));
  const tileBras =
    (await findCatalogImage(strapi, 'catalog-11_transcend_scoop_sports_bra_a_c-coastal_teal-coastal_teal_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2', 'w=1200&h=1500&fit=crop&q=80'), 'tile-essentials.jpg'));
  const tileAccessories =
    (await findCatalogImage(strapi, 'catalog-05_all_about_large_cosmetic_pouch-siren-siren_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1606522754091-a3bbf9ad4cb3', 'w=1200&h=1500&fit=crop&q=80'), 'tile-accessories.jpg'));
  const facetCategoryTiles = [
    { categoryCode: 'categories:tops', label: 'Tops', tagline: 'Tees, tanks, sweats & shirting', image: tileTops },
    { categoryCode: 'categories:bottoms', label: 'Bottoms', tagline: 'Pants, shorts & leggings', image: tileBottoms },
    { categoryCode: 'categories:bras', label: 'Bras', tagline: 'Every support level, every size', image: tileBras },
    { categoryCode: 'categories:accessories', label: 'Accessories', tagline: 'Pouches, caps & carry-alls', image: tileAccessories },
  ];

  const heroSplitImage = await uploadImage(
    strapi,
    unsplash('photo-1571945153237-4929e783af4a', 'w=1600&h=2000&fit=crop&q=80'),
    'hero-split-drop.jpg',
  );
  // Editorial mosaic tiles use real catalog imagery (Unsplash fallback pre-catalog-seed).
  const editorialFeature =
    (await findCatalogImage(strapi, 'catalog-15_salutation_crop_jacket-breaker-breaker_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1558769132-cb1aea458c5e', 'w=1600&h=2000&fit=crop&q=80'), 'editorial-feature.jpg'));
  const editorialStreet =
    (await findCatalogImage(strapi, 'catalog-17_midday_oversized_poplin_shirt-bright_white-bright_white_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1552902865-b72c031ac5ea', 'w=1200&h=1500&fit=crop&q=80'), 'editorial-street.jpg'));
  const editorialDetail =
    (await findCatalogImage(strapi, 'catalog-05_all_about_large_cosmetic_pouch-spark_bright_white-spark_bright_white_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1553062407-98eeb64c6a62', 'w=1200&h=1500&fit=crop&q=80'), 'editorial-detail.jpg'));
  const editorialStudio =
    (await findCatalogImage(strapi, 'catalog-12_interval_sports_bra_d_dd-alpine-alpine_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1518611012118-696072aa579a', 'w=1600&h=1000&fit=crop&q=80'), 'editorial-studio.jpg'));
  const editorialFabric =
    (await findCatalogImage(strapi, 'catalog-20_pranayama_restore_rib_wrap-elm_rib-elm_rib_01.jpg')) ??
    (await uploadImage(strapi, unsplash('photo-1620799140408-edc6dcb6d633', 'w=1200&h=1500&fit=crop&q=80'), 'editorial-fabric.jpg'));

  const heroBlockUp = await uploadImage(strapi, unsplash('photo-1558769132-cb1aea458c5e'), 'hero-block-up.jpg');
  const heroEssentials = await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2'), 'hero-essentials.jpg');
  const heroAccessories = await uploadImage(strapi, unsplash('photo-1553062407-98eeb64c6a62'), 'hero-accessories.jpg');
  const heroBottoms = await uploadImage(strapi, unsplash('photo-1594633312681-425c7b97ccd1'), 'hero-bottoms.jpg');

  const HERO_SLIDES: Record<'nepal' | 'hongkong', any[]> = {
    nepal: [
      {
        image: heroBlockUp,
        heading: 'Built From The Block Up',
        subheading: 'Streetwear made with the community, for the community — designed in Kathmandu, worn from Jhamsikhel to Jomsom.',
        ctaLabel: 'Shop The Spotlight',
        ctaHref: '/nepal/collections/spotlight',
        alt: 'Model wearing Lopho streetwear on a Kathmandu rooftop at golden hour',
      },
      {
        image: heroEssentials,
        heading: 'Worn Daily, Made To Last',
        subheading: 'Core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Tops',
        ctaHref: '/nepal/collections/tops',
        alt: 'Folded Lopho everyday tees and sweats in core neutral tones',
      },
      {
        image: heroAccessories,
        heading: 'Finish The Fit',
        subheading: 'Totes, slings and caps — the details that make the difference, from the pop-up to the street.',
        ctaLabel: 'Shop Accessories',
        ctaHref: '/nepal/collections/accessories',
        alt: 'Lopho canvas tote, sling pack and cap arranged on a concrete surface',
      },
    ],
    hongkong: [
      {
        image: heroBlockUp,
        heading: 'Built From The Block Up',
        subheading:
          'Streetwear made with the community, for the community — designed in Kathmandu, cut for Hong Kong humidity and harbour nights.',
        ctaLabel: 'Shop The Spotlight',
        ctaHref: '/hongkong/collections/spotlight',
        alt: 'Model in Lopho streetwear against a Hong Kong harbour skyline at night',
      },
      {
        image: heroEssentials,
        heading: 'Worn Daily, Made To Last',
        subheading: 'Core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Tops',
        ctaHref: '/hongkong/collections/tops',
        alt: 'Folded Lopho everyday tees and sweats in core neutral tones',
      },
      {
        image: heroBottoms,
        heading: 'Built To Move',
        subheading: 'Utility pants, joggers and denim, cut for the street and the stage — Hong Kong humidity included.',
        ctaLabel: 'Shop Bottoms',
        ctaHref: '/hongkong/collections/bottoms',
        alt: 'Model wearing Lopho utility pants and joggers on a city street',
      },
    ],
  };

  for (const channel of ['nepal', 'hongkong'] as const) {
    const sections: any[] = [
      { __component: 'section.hero-slider', slides: HERO_SLIDES[channel] },
      {
        __component: 'section.value-props',
        header: { eyebrow: 'Why Lopho', heading: 'What Makes It Ours', align: 'left' },
        items: VALUE_PROPS,
        backgroundToken: 'paper',
      },
      {
        __component: 'section.category-grid',
        header: { eyebrow: 'Shop By Category', heading: 'Shop The Edit', align: 'left' },
        tiles: facetCategoryTiles,
      },
      {
        // The configurable carousel variant of the product rail — exercises autoplay +
        // the editor-capped item count.
        __component: 'section.product-carousel',
        header: { eyebrow: 'The Spotlight', heading: 'This Week, Front Row', align: 'left' },
        collectionSlug: 'spotlight',
        cta: { label: 'Shop The Spotlight', href: '/collections/spotlight', variant: 'link', openInNewTab: false },
        itemLimit: 12,
        autoplay: true,
      },
      {
        __component: 'section.hero-split',
        header: {
          eyebrow: 'Limited Drop',
          heading: 'The Monsoon Layer',
          subheading:
            'Water-shrugging shells and quick-dry knits, cut for the season the city actually has. Small batch — gone when it rains out.',
          align: 'left',
        },
        media: { image: heroSplitImage, alt: 'Model in a Lopho water-resistant shell against a rain-washed street' },
        cta: { label: 'Shop The Drop', href: '/collections/spotlight', variant: 'primary', openInNewTab: false },
        promoLabel: 'This Week Only',
        imageSide: 'right',
        backgroundToken: 'sand',
      },
      {
        // Content-less marker — renders the shared global brand story. Set header /
        // paragraphs on this block to override the shared story for this channel only.
        __component: 'section.brand-story',
      },
      {
        __component: 'section.editorial-grid',
        header: { eyebrow: 'The Lookbook', heading: 'Worn On The Street', align: 'center' },
        tiles: [
          { image: editorialFeature, alt: 'Salutation crop jacket in Breaker blue, worn on model', label: 'The Crop Jacket', tagline: 'Salutation, in Breaker', href: '/products/salutation-crop-jacket', span: 'feature' },
          { image: editorialStreet, alt: 'Midday oversized poplin shirt in bright white', label: 'Crisp Poplin', href: '/products/midday-oversized-poplin-shirt', span: 'standard' },
          { image: editorialDetail, alt: 'All-About cosmetic pouch in Spark', label: 'The Details', href: '/collections/accessories', span: 'standard' },
          { image: editorialStudio, alt: 'Interval sports bra in Alpine, worn in the studio', label: 'Studio Hours', tagline: 'The Interval bra', href: '/collections/bras', span: 'wide' },
          { image: editorialFabric, alt: 'Pranayama rib wrap in Elm rib knit', label: 'Fabric First', href: '/products/pranayama-restore-rib-wrap', span: 'standard' },
        ],
      },
      {
        __component: 'section.editorial-banner',
        header: { eyebrow: 'New Arrivals', heading: 'Just Landed', align: 'left' },
        collectionSlug: 'new-arrivals',
        cta: { label: 'Shop New Arrivals', href: '/collections/new-arrivals', variant: 'primary', openInNewTab: false },
        backgroundToken: 'blush',
      },
      {
        __component: 'section.testimonials',
        header: { eyebrow: 'From The Community', heading: 'Worn, Not Just Bought', align: 'left' },
        items: CHANNEL_TESTIMONIALS[channel],
        backgroundToken: 'sand',
      },
    ];

    const data = {
      slug: 'home',
      channel,
      sections,
      announcementBarEnabled: true,
      announcements: CHANNEL_ANNOUNCEMENTS[channel],
    };

    const existing: any = await strapi
      .documents('api::page.page')
      .findFirst({ filters: { slug: 'home', channel }, status: 'draft' });

    if (existing) {
      await strapi.documents('api::page.page').update({ documentId: existing.documentId, data: data as any });
      await strapi.documents('api::page.page').publish({ documentId: existing.documentId });
    } else {
      const created = await strapi.documents('api::page.page').create({ data: data as any });
      await strapi.documents('api::page.page').publish({ documentId: created.documentId });
    }
  }

  console.log('Seeded pages (home: nepal, hongkong)');
}

async function main() {
  const { distDir } = await compileStrapi();
  const app = await createStrapi({ distDir }).load();
  app.log.level = 'error';

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lopho-strapi-seed-'));

  await seedSiteSetting(app);
  await seedFooter(app);
  await seedSiteNavs(app);
  await seedLegalPages(app);
  await seedBrandStory(app);
  await seedCollectionPages(app);
  await seedPages(app);
  console.log('Lopho Strapi seed complete.');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Deliberately skip app.destroy(): shutting down the DB pool here can race an
  // in-flight pooled connection and throw an unhandled "aborted" rejection from tarn
  // that isn't reachable via try/catch (it rejects an unrelated pending operation's
  // promise, not this call's). Harmless either way since process.exit() below tears
  // the whole process down right after — nothing is left mid-write.
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
