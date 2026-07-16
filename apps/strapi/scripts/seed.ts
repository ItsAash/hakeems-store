/**
 * Idempotent content seed for the Hakeems CMS, mirroring the pattern in
 * apps/vendure/scripts/seed.ts. Boots Strapi's core (no HTTP server — see
 * `.load()` vs `.start()` below) and writes through the Document Service
 * directly, so it needs no admin credentials or API token.
 *
 * Collection pages are NOT created here: Vendure's collection-sync plugin creates
 * them automatically (see apps/vendure/src/plugins/collection-sync) whenever a
 * collection is created in Vendure. Run `pnpm --filter @hakeems/vendure seed`
 * first (the root `seed` script already does this in order) so those entries
 * exist before this script enriches them with banners/copy/featured flags.
 *
 * Run with: pnpm --filter @hakeems/strapi seed
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

type DraftUID = 'api::site-nav.site-nav' | 'api::legal-page.legal-page';

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
    siteName: 'Hakeems',
    tagline: 'Community streetwear, designed in Kathmandu.',
    defaultSeo: {
      metaTitle: 'Hakeems — Community Streetwear',
      metaDescription:
        'Streetwear designed in Kathmandu, worn in Nepal and Hong Kong. Small-batch drops, real fabric, built for the pop-up and the street.',
    },
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/hakeems' },
      { platform: 'tiktok', url: 'https://tiktok.com/@hakeems' },
    ],
    supportEmail: 'support@hakeems.com',
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

async function seedSiteNavs(strapi: Core.Strapi) {
  // Both channels share the same catalog shape today (tops/bottoms/accessories/sets +
  // one cross-channel Spotlight capsule) — no more channel-exclusive collections — so
  // nepal and hongkong get the same nav structure.
  const shopChildren = [
    { label: 'Tops', href: '/collections/tops' },
    { label: 'Bottoms', href: '/collections/bottoms' },
    { label: 'Accessories', href: '/collections/accessories' },
    { label: 'Sets', href: '/collections/sets' },
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
        metaTitle: 'Privacy Policy — Hakeems',
        metaDescription: 'How Hakeems collects, uses, and protects your personal information when you shop with us.',
      },
      content: `Your privacy matters to us. This policy explains what we collect, why we collect it, and the choices you have. It applies to hakeems.com and every order placed with Hakeems in Nepal and Hong Kong.

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

Questions about this policy? Email us at [support@hakeems.com](mailto:support@hakeems.com) and we'll be happy to help.`,
    },
    {
      slug: 'terms',
      title: 'Terms of Service',
      seo: {
        metaTitle: 'Terms of Service — Hakeems',
        metaDescription: 'The terms that govern your use of the Hakeems store and any purchase you make with us.',
      },
      content: `Welcome to Hakeems. By using our site or placing an order, you agree to these terms.

## Orders

All orders are subject to acceptance and product availability. We reserve the right to refuse or cancel an order, and will refund any payment in full if we do.

## Pricing

Prices are shown in your channel's currency and include tax where applicable. Shipping is calculated at checkout based on your delivery zone. We may update prices at any time, but changes will not affect orders already placed.

## Products

We work hard to show our products accurately, but colours and details may vary slightly between screens and the finished garment.

## Intellectual Property

All content on this site — text, imagery, and designs — belongs to Hakeems and may not be reused without permission.

## Contact

For anything about these terms, reach us at [support@hakeems.com](mailto:support@hakeems.com).`,
    },
    {
      slug: 'shipping-returns',
      title: 'Shipping & Returns',
      seo: {
        metaTitle: 'Shipping & Returns — Hakeems',
        metaDescription: 'Delivery timelines, shipping rates, and how to return or exchange an item bought from Hakeems.',
      },
      content: `## Shipping

Orders are dispatched within 1–2 business days. Shipping is calculated at checkout by delivery zone. Free shipping applies within the Kathmandu Valley on orders over NPR 5,000, and on Hong Kong Island for orders over HKD 800.

## Returns

Unworn items with their original tags can be returned within **14 days** of delivery. Final-sale pieces, marked at checkout, cannot be returned.

## How to Return

1. Email [support@hakeems.com](mailto:support@hakeems.com) with your order number.
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
 * Enriches collection-page entries that Vendure's collection-sync plugin already created
 * (matched by vendureCollectionSlug) with banner image, tagline, description, and featured
 * flag. Deliberately does NOT create entries here — Vendure is the source of truth for
 * which collections exist, so a slug with no matching entry means the collection hasn't
 * synced yet (Strapi was down, or `pnpm --filter @hakeems/vendure seed` hasn't run) and is
 * skipped with a warning rather than faked.
 */
async function seedCollectionPages(strapi: Core.Strapi) {
  const heroTops = await uploadImage(strapi, unsplash('photo-1445205170230-053b83016050', 'w=1600&h=900&fit=crop&q=80'), 'collection-tops.jpg');
  const heroBottoms = await uploadImage(strapi, unsplash('photo-1560243563-062bfc001d68', 'w=1600&h=900&fit=crop&q=80'), 'collection-bottoms.jpg');
  const heroAccessories = await uploadImage(strapi, unsplash('photo-1606522754091-a3bbf9ad4cb3', 'w=1600&h=900&fit=crop&q=80'), 'collection-accessories.jpg');
  const heroSets = await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2', 'w=1600&h=900&fit=crop&q=80'), 'collection-sets.jpg');
  const heroSpotlight = await uploadImage(strapi, unsplash('photo-1571945153237-4929e783af4a', 'w=1600&h=900&fit=crop&q=80'), 'collection-spotlight.jpg');

  const enrichments: Array<{ vendureCollectionSlug: string; data: Record<string, unknown> }> = [
    {
      vendureCollectionSlug: 'tops',
      data: {
        title: 'Tops',
        tagline: 'Tees, sweats, hoodies and overshirts',
        description: 'Tees, sweats, hoodies and overshirts — the upper half of every Hakeems fit.',
        heroImage: heroTops,
        featured: false,
        sortOrder: 1,
      },
    },
    {
      vendureCollectionSlug: 'bottoms',
      data: {
        title: 'Bottoms',
        tagline: 'Utility pants, joggers and denim',
        description: 'Utility pants, joggers and denim built for the street and the stage.',
        heroImage: heroBottoms,
        featured: false,
        sortOrder: 2,
      },
    },
    {
      vendureCollectionSlug: 'accessories',
      data: {
        title: 'Accessories',
        tagline: 'Totes, slings and caps',
        description: 'Totes, slings and caps — the pieces that finish the fit.',
        heroImage: heroAccessories,
        featured: false,
        sortOrder: 3,
      },
    },
    {
      vendureCollectionSlug: 'sets',
      data: {
        title: 'Sets',
        tagline: 'Matching pieces, worn together',
        description: 'Matching pieces, worn together.',
        heroImage: heroSets,
        featured: false,
        sortOrder: 4,
      },
    },
    {
      vendureCollectionSlug: 'spotlight',
      data: {
        title: 'Spotlight',
        tagline: 'This week, front row',
        description: 'A rotating edit of the pieces we’re wearing most right now — pulled from every drop, restocked while they last.',
        heroImage: heroSpotlight,
        featured: true,
        sortOrder: 5,
      },
    },
  ];

  const uid = 'api::collection-page.collection-page';
  let enriched = 0;
  for (const { vendureCollectionSlug, data } of enrichments) {
    const existing = await strapi.documents(uid).findFirst({ filters: { vendureCollectionSlug }, status: 'draft' });
    if (!existing) {
      console.warn(`Skipping "${vendureCollectionSlug}": no synced collection-page yet (has Vendure's seed run and pushed it?)`);
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
        text: 'Hakeems started as a pop-up table at a Kathmandu street event and grew into a full collection without losing that instinct — small batches, real fabric, and pieces built to survive an actual event, not just a lookbook.',
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

/**
 * Composes each channel's 'home' Page (dynamic zone) directly — the sole source of truth
 * for home-page content now that the home-page collection type is retired. Sections are
 * literal here (previously they were migrated from home-page's fields); reorder/add/remove
 * them straight in Strapi afterwards with no code change needed.
 */
async function seedPages(strapi: Core.Strapi) {
  const tileTops = await uploadImage(strapi, unsplash('photo-1445205170230-053b83016050', 'w=1200&h=1500&fit=crop&q=80'), 'tile-tops.jpg');
  const tileBottoms = await uploadImage(strapi, unsplash('photo-1560243563-062bfc001d68', 'w=1200&h=1500&fit=crop&q=80'), 'tile-bottoms.jpg');
  const tileAccessories = await uploadImage(strapi, unsplash('photo-1606522754091-a3bbf9ad4cb3', 'w=1200&h=1500&fit=crop&q=80'), 'tile-accessories.jpg');
  const tileEssentials = await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2', 'w=1200&h=1500&fit=crop&q=80'), 'tile-essentials.jpg');
  const facetCategoryTiles = [
    { vendureFacetValueCode: 'categories:tops', label: 'Tops', tagline: 'Tees, sweats, hoodies & overshirts', image: tileTops },
    { vendureFacetValueCode: 'categories:bottoms', label: 'Bottoms', tagline: 'Utility pants, joggers & denim', image: tileBottoms },
    { vendureFacetValueCode: 'categories:accessories', label: 'Accessories', tagline: 'Totes, slings & caps', image: tileAccessories },
    { vendureFacetValueCode: 'categories:sets', label: 'Sets', tagline: 'Matching pieces, worn together', image: tileEssentials },
  ];

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
        alt: 'Model wearing Hakeems streetwear on a Kathmandu rooftop at golden hour',
      },
      {
        image: heroEssentials,
        heading: 'Worn Daily, Made To Last',
        subheading: 'Core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Tops',
        ctaHref: '/nepal/collections/tops',
        alt: 'Folded Hakeems everyday tees and sweats in core neutral tones',
      },
      {
        image: heroAccessories,
        heading: 'Finish The Fit',
        subheading: 'Totes, slings and caps — the details that make the difference, from the pop-up to the street.',
        ctaLabel: 'Shop Accessories',
        ctaHref: '/nepal/collections/accessories',
        alt: 'Hakeems canvas tote, sling pack and cap arranged on a concrete surface',
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
        alt: 'Model in Hakeems streetwear against a Hong Kong harbour skyline at night',
      },
      {
        image: heroEssentials,
        heading: 'Worn Daily, Made To Last',
        subheading: 'Core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Tops',
        ctaHref: '/hongkong/collections/tops',
        alt: 'Folded Hakeems everyday tees and sweats in core neutral tones',
      },
      {
        image: heroBottoms,
        heading: 'Built To Move',
        subheading: 'Utility pants, joggers and denim, cut for the street and the stage — Hong Kong humidity included.',
        ctaLabel: 'Shop Bottoms',
        ctaHref: '/hongkong/collections/bottoms',
        alt: 'Model wearing Hakeems utility pants and joggers on a city street',
      },
    ],
  };

  for (const channel of ['nepal', 'hongkong'] as const) {
    const sections: any[] = [
      { __component: 'section.hero-slider', slides: HERO_SLIDES[channel] },
      {
        __component: 'section.category-grid',
        header: { eyebrow: 'Shop By Category', heading: 'Shop The Edit', align: 'left' },
        tiles: facetCategoryTiles,
      },
      {
        __component: 'section.product-rail',
        header: { eyebrow: 'The Spotlight', heading: 'This Week, Front Row', align: 'left' },
        vendureCollectionSlug: 'spotlight',
        cta: { label: 'Shop The Spotlight', href: '/collections/spotlight', variant: 'link', openInNewTab: false },
      },
      {
        // Content-less marker — renders the shared global brand story. Set header /
        // paragraphs on this block to override the shared story for this channel only.
        __component: 'section.brand-story',
      },
      {
        __component: 'section.editorial-banner',
        header: { eyebrow: 'New Arrivals', heading: 'Just Landed', align: 'left' },
        vendureCollectionSlug: 'new-arrivals',
        cta: { label: 'Shop New Arrivals', href: '/collections/new-arrivals', variant: 'primary', openInNewTab: false },
        backgroundToken: 'blush',
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

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakeems-strapi-seed-'));

  await seedSiteSetting(app);
  await seedSiteNavs(app);
  await seedLegalPages(app);
  await seedBrandStory(app);
  await seedCollectionPages(app);
  await seedPages(app);
  console.log('Hakeems Strapi seed complete.');

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
