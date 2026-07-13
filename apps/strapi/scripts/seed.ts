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

type DraftUID = 'api::home-page.home-page' | 'api::site-nav.site-nav';

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

async function seedHomePages(strapi: Core.Strapi) {
  const storyImage = await uploadImage(strapi, unsplash('photo-1441986300917-64674bd600d8', 'w=1400&h=1120&fit=crop&q=80'), 'brand-story.jpg');
  const tileTops = await uploadImage(strapi, unsplash('photo-1445205170230-053b83016050', 'w=1200&h=1500&fit=crop&q=80'), 'tile-tops.jpg');
  const tileBottoms = await uploadImage(strapi, unsplash('photo-1560243563-062bfc001d68', 'w=1200&h=1500&fit=crop&q=80'), 'tile-bottoms.jpg');
  const tileAccessories = await uploadImage(strapi, unsplash('photo-1606522754091-a3bbf9ad4cb3', 'w=1200&h=1500&fit=crop&q=80'), 'tile-accessories.jpg');
  const tileEssentials = await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2', 'w=1200&h=1500&fit=crop&q=80'), 'tile-essentials.jpg');

  const heroBlockUp = await uploadImage(strapi, unsplash('photo-1558769132-cb1aea458c5e'), 'hero-block-up.jpg');
  const heroEssentials = await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2'), 'hero-essentials.jpg');
  const heroAccessories = await uploadImage(strapi, unsplash('photo-1553062407-98eeb64c6a62'), 'hero-accessories.jpg');
  const heroBottoms = await uploadImage(strapi, unsplash('photo-1594633312681-425c7b97ccd1'), 'hero-bottoms.jpg');

  const values = [
    { heading: 'Small batches', body: 'Every run is limited. When a drop sells through, it’s gone — no landfill overstock.' },
    { heading: 'Cut in Kathmandu', body: 'Designed and sewn in our own studio, with fabric sourced from mills we visit ourselves.' },
    { heading: 'Unisex by design', body: 'Fit is a personal choice, not an aisle. Every piece is cut to be worn by anyone.' },
  ];
  const storyParagraphs = [
    {
      text: 'Hakeems started as a pop-up table at a Kathmandu street event and grew into a full collection without losing that instinct — small batches, real fabric, and pieces built to survive an actual event, not just a lookbook.',
    },
    { text: 'Every drop is unisex by design. Fit and gender are personal choices, not aisles you have to pick a side of.' },
  ];

  await upsertAndPublish(strapi, 'api::home-page.home-page', { channel: 'nepal' }, {
    channel: 'nepal',
    announcements: [
      { text: 'FREE SHIPPING WITHIN KATHMANDU VALLEY ON ORDERS OVER NPR 5,000' },
      { text: 'NEW DROP — SS26 NOW AVAILABLE' },
      { text: 'POP-UP AT JAWALAKHEL — EVERY LAST SATURDAY' },
    ],
    heroSlides: [
      {
        image: heroBlockUp,
        heading: 'Built From The Block Up',
        subheading: 'Streetwear made with the community, for the community — designed in Kathmandu, worn from Jhamsikhel to Jomsom.',
        ctaLabel: 'Shop The Spotlight',
        ctaHref: '/nepal/collections/spotlight',
      },
      {
        image: heroEssentials,
        heading: 'Worn Daily, Made To Last',
        subheading: 'Core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Tops',
        ctaHref: '/nepal/collections/tops',
      },
      {
        image: heroAccessories,
        heading: 'Finish The Fit',
        subheading: 'Totes, slings and caps — the details that make the difference, from the pop-up to the street.',
        ctaLabel: 'Shop Accessories',
        ctaHref: '/nepal/collections/accessories',
      },
    ],
    facetCategoryTiles: [
      { vendureFacetValueCode: 'categories:tops', label: 'Tops', tagline: 'Tees, sweats, hoodies & overshirts', image: tileTops },
      { vendureFacetValueCode: 'categories:bottoms', label: 'Bottoms', tagline: 'Utility pants, joggers & denim', image: tileBottoms },
      { vendureFacetValueCode: 'categories:accessories', label: 'Accessories', tagline: 'Totes, slings & caps', image: tileAccessories },
      { vendureFacetValueCode: 'categories:sets', label: 'Sets', tagline: 'Matching pieces, worn together', image: tileEssentials },
    ],
    storyEyebrow: 'The Brand',
    storyHeading: 'Not made in a boardroom.',
    storyParagraphs,
    storyImage,
    values,
    seo: {
      metaTitle: 'Hakeems Nepal — Community Streetwear',
      metaDescription: 'Streetwear designed in Kathmandu, worn from Jhamsikhel to Jomsom. Shop tops, bottoms, accessories, and the weekly spotlight.',
    },
  });

  await upsertAndPublish(strapi, 'api::home-page.home-page', { channel: 'hongkong' }, {
    channel: 'hongkong',
    announcements: [
      { text: 'FREE HK ISLAND DELIVERY ON ORDERS OVER HKD 800' },
      { text: 'NEW DROP — SS26 NOW AVAILABLE' },
      { text: 'POP-UP AT PMQ — FIRST WEEKEND OF EVERY MONTH' },
    ],
    heroSlides: [
      {
        image: heroBlockUp,
        heading: 'Built From The Block Up',
        subheading:
          'Streetwear made with the community, for the community — designed in Kathmandu, cut for Hong Kong humidity and harbour nights.',
        ctaLabel: 'Shop The Spotlight',
        ctaHref: '/hongkong/collections/spotlight',
      },
      {
        image: heroEssentials,
        heading: 'Worn Daily, Made To Last',
        subheading: 'Core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Tops',
        ctaHref: '/hongkong/collections/tops',
      },
      {
        image: heroBottoms,
        heading: 'Built To Move',
        subheading: 'Utility pants, joggers and denim, cut for the street and the stage — Hong Kong humidity included.',
        ctaLabel: 'Shop Bottoms',
        ctaHref: '/hongkong/collections/bottoms',
      },
    ],
    facetCategoryTiles: [
      { vendureFacetValueCode: 'categories:tops', label: 'Tops', tagline: 'Tees, sweats, hoodies & overshirts', image: tileTops },
      { vendureFacetValueCode: 'categories:bottoms', label: 'Bottoms', tagline: 'Utility pants, joggers & denim', image: tileBottoms },
      { vendureFacetValueCode: 'categories:accessories', label: 'Accessories', tagline: 'Totes, slings & caps', image: tileAccessories },
      { vendureFacetValueCode: 'categories:sets', label: 'Sets', tagline: 'Matching pieces, worn together', image: tileEssentials },
    ],
    storyEyebrow: 'The Brand',
    storyHeading: 'Not made in a boardroom.',
    storyParagraphs,
    storyImage,
    values,
    seo: {
      metaTitle: 'Hakeems Hong Kong — Community Streetwear',
      metaDescription: 'Streetwear designed in Kathmandu, cut for Hong Kong humidity and harbour nights. Shop tops, bottoms, accessories, and the weekly spotlight.',
    },
  });

  console.log('Seeded home-page (nepal, hongkong)');
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
    { label: 'Shop', href: '/collections/tops', children: shopChildren },
    { label: 'Our Story', href: '/story' },
  ];

  await upsertAndPublish(strapi, 'api::site-nav.site-nav', { channel: 'nepal' }, { channel: 'nepal', items });
  await upsertAndPublish(strapi, 'api::site-nav.site-nav', { channel: 'hongkong' }, { channel: 'hongkong', items });

  console.log('Seeded site-nav (nepal, hongkong)');
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
 * Phase 4 — the global, channel-agnostic brand story, authored once here (read from the
 * nepal home-page's story fields, which were identical across channels). Section blocks
 * render this shared story by default, so it's no longer duplicated per channel.
 */
async function seedBrandStory(strapi: Core.Strapi) {
  const home: any = await strapi.documents('api::home-page.home-page').findFirst({
    filters: { channel: 'nepal' },
    status: 'draft',
    populate: { storyParagraphs: true, storyImage: true },
  });
  const data: any = {
    eyebrow: home?.storyEyebrow ?? 'The Brand',
    heading: home?.storyHeading ?? 'Not made in a boardroom.',
    paragraphs: (home?.storyParagraphs ?? []).map((p: any) => ({ text: p.text })),
    image: home?.storyImage ? (typeof home.storyImage === 'object' ? home.storyImage.id : home.storyImage) : null,
  };
  const existing = await strapi.documents('api::brand-story.brand-story').findFirst({});
  if (existing) {
    await strapi.documents('api::brand-story.brand-story').update({ documentId: existing.documentId, data });
  } else {
    await strapi.documents('api::brand-story.brand-story').create({ data });
  }
  console.log('Seeded brand-story (global)');
}

/**
 * Phase 3 migration — composes a Page (dynamic zone) per channel from the content already
 * seeded into home-page / spotlight / new-arrival, in the current homepage order. Reads the
 * seeded docs (single source of truth) and maps them into section blocks, so there's no
 * duplicated content here. Must run AFTER the seeders it reads from.
 */
async function seedPages(strapi: Core.Strapi) {
  const mediaId = (m: any): number | null => (m && typeof m === 'object' ? (m.id ?? null) : (m ?? null));

  for (const channel of ['nepal', 'hongkong'] as const) {
    const home: any = await strapi.documents('api::home-page.home-page').findFirst({
      filters: { channel },
      status: 'draft',
      populate: {
        heroSlides: { populate: '*' },
        facetCategoryTiles: { populate: '*' },
        storyParagraphs: true,
        storyImage: true,
      },
    });
    if (!home) continue;

    const sections: any[] = [
      {
        __component: 'section.hero-slider',
        slides: (home.heroSlides ?? []).map((s: any) => ({
          image: mediaId(s.image),
          imageMobile: mediaId(s.imageMobile),
          alt: s.alt ?? null,
          heading: s.heading,
          subheading: s.subheading ?? null,
          ctaLabel: s.ctaLabel ?? null,
          ctaHref: s.ctaHref ?? null,
        })),
      },
      {
        __component: 'section.category-grid',
        header: { eyebrow: 'Shop By Category', heading: 'Shop The Edit', align: 'left' },
        tiles: (home.facetCategoryTiles ?? []).map((t: any) => ({
          vendureFacetValueCode: t.vendureFacetValueCode,
          label: t.label,
          tagline: t.tagline ?? null,
          image: mediaId(t.image),
        })),
      },
      {
        __component: 'section.product-rail',
        header: { eyebrow: 'The Spotlight', heading: 'This Week, Front Row', align: 'left' },
        vendureCollectionSlug: 'spotlight',
        cta: { label: 'Shop The Spotlight', href: '/collections/spotlight', variant: 'link', openInNewTab: false },
      },
      {
        // Content-less marker — renders the shared global brand story (Phase 4). Set header /
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

    const existing: any = await strapi
      .documents('api::page.page')
      .findFirst({ filters: { slug: 'home', channel }, status: 'draft' });

    if (existing) {
      await strapi.documents('api::page.page').update({ documentId: existing.documentId, data: { sections } as any });
      await strapi.documents('api::page.page').publish({ documentId: existing.documentId });
    } else {
      const created = await strapi.documents('api::page.page').create({ data: { slug: 'home', channel, sections } as any });
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
  await seedHomePages(app);
  await seedSiteNavs(app);
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
