/**
 * Idempotent content seed for the Hakeems CMS, mirroring the pattern in
 * apps/vendure/scripts/seed.ts. Boots Strapi's core (no HTTP server — see
 * `.load()` vs `.start()` below) and writes through the Document Service
 * directly, so it needs no admin credentials or API token.
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

/** Upsert-by-filter + publish, for draftAndPublish collection types (home-page, collection-page, event). */
type DraftUID =
  | 'api::home-page.home-page'
  | 'api::collection-page.collection-page'
  | 'api::event.event';

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
  const tileNewDrop = await uploadImage(strapi, unsplash('photo-1483985988355-763728e1935b', 'w=1200&h=1500&fit=crop&q=80'), 'tile-new-drop.jpg');
  const tileDashain = await uploadImage(strapi, unsplash('photo-1515886657613-9f3515b0c78f', 'w=1200&h=1500&fit=crop&q=80'), 'tile-dashain-edit.jpg');
  const tileHarbour = await uploadImage(strapi, unsplash('photo-1558769132-cb1aea458c5e', 'w=1200&h=1500&fit=crop&q=80'), 'tile-harbour-nights.jpg');

  const heroBlockUp = await uploadImage(strapi, unsplash('photo-1558769132-cb1aea458c5e'), 'hero-block-up.jpg');
  const heroEssentials = await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2'), 'hero-essentials.jpg');
  const heroDashain = await uploadImage(strapi, unsplash('photo-1515886657613-9f3515b0c78f'), 'hero-dashain-edit.jpg');
  const heroHarbour = await uploadImage(strapi, unsplash('photo-1441986300917-64674bd600d8'), 'hero-harbour-nights.jpg');

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
        eyebrow: 'Nepal · SS26',
        heading: 'Built From The Block Up',
        subheading: 'Streetwear made with the community, for the community — designed in Kathmandu, worn from Jhamsikhel to Jomsom.',
        ctaLabel: 'Shop New Drop',
        ctaHref: '/nepal/collections/new-drop',
        align: 'start',
      },
      {
        image: heroEssentials,
        eyebrow: 'The Essentials',
        heading: 'Worn Daily, Made To Last',
        subheading: 'The permanent collection — core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Essentials',
        ctaHref: '/nepal/collections/the-essentials',
        align: 'start',
      },
      {
        image: heroDashain,
        eyebrow: 'Dashain Edit',
        heading: 'Festive, Not Fussy',
        subheading: 'A capsule for tika mornings and late family dinners — layering pieces built for the season. Nepal exclusive.',
        ctaLabel: 'Shop Dashain Edit',
        ctaHref: '/nepal/collections/dashain-edit',
        align: 'center',
      },
    ],
    collectionTiles: [
      { vendureCollectionSlug: 'new-drop', label: 'New Drop · SS26', tagline: 'Limited runs, gone when they’re gone', image: tileNewDrop },
      { vendureCollectionSlug: 'tops', label: 'Tops', tagline: 'Tees, sweats, hoodies & overshirts', image: tileTops },
      { vendureCollectionSlug: 'bottoms', label: 'Bottoms', tagline: 'Utility pants, joggers & denim', image: tileBottoms },
      { vendureCollectionSlug: 'accessories', label: 'Accessories', tagline: 'Totes, slings & caps', image: tileAccessories },
      { vendureCollectionSlug: 'the-essentials', label: 'The Essentials', tagline: 'The permanent collection', image: tileEssentials },
      { vendureCollectionSlug: 'dashain-edit', label: 'Dashain Edit', tagline: 'Festive capsule — Nepal exclusive', image: tileDashain },
    ],
    storyEyebrow: 'The Brand',
    storyHeading: 'Not made in a boardroom.',
    storyParagraphs,
    storyImage,
    values,
    seo: {
      metaTitle: 'Hakeems Nepal — Community Streetwear',
      metaDescription: 'Streetwear designed in Kathmandu, worn from Jhamsikhel to Jomsom. Shop the new drop, the essentials, and the Dashain edit.',
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
        eyebrow: 'Hong Kong · SS26',
        heading: 'Built From The Block Up',
        subheading:
          'Streetwear made with the community, for the community — designed in Kathmandu, cut for Hong Kong humidity and harbour nights.',
        ctaLabel: 'Shop New Drop',
        ctaHref: '/hongkong/collections/new-drop',
        align: 'start',
      },
      {
        image: heroEssentials,
        eyebrow: 'The Essentials',
        heading: 'Worn Daily, Made To Last',
        subheading: 'The permanent collection — core pieces we cut in every drop and restock season after season.',
        ctaLabel: 'Shop Essentials',
        ctaHref: '/hongkong/collections/the-essentials',
        align: 'start',
      },
      {
        image: heroHarbour,
        eyebrow: 'Harbour Nights',
        heading: 'After Dark, On The Harbour',
        subheading: 'Sleek, city-after-dark pieces cut for humid nights on the water. Hong Kong exclusive.',
        ctaLabel: 'Shop Harbour Nights',
        ctaHref: '/hongkong/collections/harbour-nights',
        align: 'center',
      },
    ],
    collectionTiles: [
      { vendureCollectionSlug: 'new-drop', label: 'New Drop · SS26', tagline: 'Limited runs, gone when they’re gone', image: tileNewDrop },
      { vendureCollectionSlug: 'tops', label: 'Tops', tagline: 'Tees, sweats, hoodies & overshirts', image: tileTops },
      { vendureCollectionSlug: 'bottoms', label: 'Bottoms', tagline: 'Utility pants, joggers & denim', image: tileBottoms },
      { vendureCollectionSlug: 'accessories', label: 'Accessories', tagline: 'Totes, slings & caps', image: tileAccessories },
      { vendureCollectionSlug: 'the-essentials', label: 'The Essentials', tagline: 'The permanent collection', image: tileEssentials },
      { vendureCollectionSlug: 'harbour-nights', label: 'Harbour Nights', tagline: 'City-after-dark — Hong Kong exclusive', image: tileHarbour },
    ],
    storyEyebrow: 'The Brand',
    storyHeading: 'Not made in a boardroom.',
    storyParagraphs,
    storyImage,
    values,
    seo: {
      metaTitle: 'Hakeems Hong Kong — Community Streetwear',
      metaDescription: 'Streetwear designed in Kathmandu, cut for Hong Kong humidity and harbour nights. Shop the new drop, the essentials, and Harbour Nights.',
    },
  });

  console.log('Seeded home-page (nepal, hongkong)');
}

async function seedCollectionPages(strapi: Core.Strapi) {
  const heroTops = await uploadImage(strapi, unsplash('photo-1445205170230-053b83016050', 'w=1600&h=900&fit=crop&q=80'), 'collection-tops.jpg');
  const heroBottoms = await uploadImage(strapi, unsplash('photo-1560243563-062bfc001d68', 'w=1600&h=900&fit=crop&q=80'), 'collection-bottoms.jpg');
  const heroAccessories = await uploadImage(strapi, unsplash('photo-1606522754091-a3bbf9ad4cb3', 'w=1600&h=900&fit=crop&q=80'), 'collection-accessories.jpg');
  const heroEssentials = await uploadImage(strapi, unsplash('photo-1487222477894-8943e31ef7b2', 'w=1600&h=900&fit=crop&q=80'), 'collection-essentials.jpg');
  const heroNewDrop = await uploadImage(strapi, unsplash('photo-1483985988355-763728e1935b', 'w=1600&h=900&fit=crop&q=80'), 'collection-new-drop.jpg');
  const heroDashain = await uploadImage(strapi, unsplash('photo-1515886657613-9f3515b0c78f', 'w=1600&h=900&fit=crop&q=80'), 'collection-dashain-edit.jpg');
  const heroHarbour = await uploadImage(strapi, unsplash('photo-1558769132-cb1aea458c5e', 'w=1600&h=900&fit=crop&q=80'), 'collection-harbour-nights.jpg');

  const pages: Array<Record<string, unknown>> = [
    {
      vendureCollectionSlug: 'tops',
      title: 'Tops',
      tagline: 'Tees, sweats, hoodies and overshirts',
      description: 'Tees, sweats, hoodies and overshirts — the upper half of every Hakeems fit.',
      heroImage: heroTops,
      channel: 'both',
      featured: false,
      sortOrder: 1,
    },
    {
      vendureCollectionSlug: 'bottoms',
      title: 'Bottoms',
      tagline: 'Utility pants, joggers and denim',
      description: 'Utility pants, joggers and denim built for the street and the stage.',
      heroImage: heroBottoms,
      channel: 'both',
      featured: false,
      sortOrder: 2,
    },
    {
      vendureCollectionSlug: 'accessories',
      title: 'Accessories',
      tagline: 'Totes, slings and caps',
      description: 'Totes, slings and caps — the pieces that finish the fit.',
      heroImage: heroAccessories,
      channel: 'both',
      featured: false,
      sortOrder: 3,
    },
    {
      vendureCollectionSlug: 'the-essentials',
      title: 'The Essentials',
      tagline: 'The permanent collection',
      description: 'The permanent collection. Core pieces we cut in every drop, restocked season after season.',
      heroImage: heroEssentials,
      channel: 'both',
      featured: true,
      sortOrder: 4,
    },
    {
      vendureCollectionSlug: 'new-drop',
      title: 'New Drop · SS26',
      tagline: 'The latest release',
      description: 'The latest release — limited runs designed in Kathmandu and gone when they’re gone.',
      heroImage: heroNewDrop,
      channel: 'both',
      featured: true,
      sortOrder: 5,
    },
    {
      vendureCollectionSlug: 'dashain-edit',
      title: 'Dashain Edit',
      tagline: 'Festive capsule — Nepal exclusive',
      description: 'A festive capsule for Dashain — layering pieces built for tika mornings and late family dinners. Nepal only.',
      heroImage: heroDashain,
      channel: 'nepal',
      featured: true,
      sortOrder: 6,
    },
    {
      vendureCollectionSlug: 'harbour-nights',
      title: 'Harbour Nights',
      tagline: 'City-after-dark — Hong Kong exclusive',
      description: 'Sleek, city-after-dark pieces cut for humid nights on the harbour. Hong Kong only.',
      heroImage: heroHarbour,
      channel: 'hongkong',
      featured: true,
      sortOrder: 6,
    },
  ];

  for (const page of pages) {
    await upsertAndPublish(strapi, 'api::collection-page.collection-page', { vendureCollectionSlug: page.vendureCollectionSlug }, page);
  }
  console.log(`Seeded collection-page x${pages.length}`);
}

async function seedEvents(strapi: Core.Strapi) {
  const coverNepal = await uploadImage(strapi, unsplash('photo-1509631179647-0177331693ae', 'w=1600&h=1000&fit=crop&q=80'), 'event-jawalakhel.jpg');
  const coverHongKong = await uploadImage(strapi, unsplash('photo-1496747611176-843222e1e57c', 'w=1600&h=1000&fit=crop&q=80'), 'event-pmq.jpg');

  const productDocumentId = async (vendureId: string) => {
    const ref = await strapi.documents('api::product-reference.product-reference').findFirst({
      filters: { vendureId },
      status: 'draft',
    });
    return ref?.documentId;
  };

  const nextLastSaturday = () => {
    const date = new Date();
    date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7));
    date.setHours(14, 0, 0, 0);
    return date.toISOString();
  };
  const firstWeekendNextMonth = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 1);
    const day = date.getDay();
    date.setDate(1 + ((6 - day + 7) % 7));
    date.setHours(18, 0, 0, 0);
    return date.toISOString();
  };

  const dashainProductIds = (await Promise.all(['11', '2', '4'].map(productDocumentId))).filter(Boolean) as string[];
  const harbourProductIds = (await Promise.all(['8', '13', '14'].map(productDocumentId))).filter(Boolean) as string[];

  await upsertAndPublish(strapi, 'api::event.event', { slug: 'hakeems-pop-up-jawalakhel' }, {
    title: 'Hakeems Pop-Up — Jawalakhel',
    slug: 'hakeems-pop-up-jawalakhel',
    status: 'upcoming',
    eventDate: nextLastSaturday(),
    location: 'Jawalakhel, Lalitpur',
    address: 'Jawalakhel Chowk, Lalitpur 44700',
    description:
      'Where it all started. Come try on the new drop, grab a Dashain Edit piece before it sells out, and hang out at the table that started this whole thing.',
    coverImage: coverNepal,
    featuredProducts: dashainProductIds,
    channel: 'nepal',
    seo: { metaTitle: 'Hakeems Pop-Up — Jawalakhel', metaDescription: 'Join us at Jawalakhel, Lalitpur — every last Saturday.' },
  });

  await upsertAndPublish(strapi, 'api::event.event', { slug: 'hakeems-pop-up-pmq' }, {
    title: 'Hakeems Pop-Up — PMQ',
    slug: 'hakeems-pop-up-pmq',
    status: 'upcoming',
    eventDate: firstWeekendNextMonth(),
    location: 'PMQ, Central, Hong Kong',
    address: '35 Aberdeen Street, Central, Hong Kong',
    description: 'Harbour Nights comes to PMQ. Try the city-after-dark capsule in person, first weekend of every month.',
    coverImage: coverHongKong,
    featuredProducts: harbourProductIds,
    channel: 'hongkong',
    seo: { metaTitle: 'Hakeems Pop-Up — PMQ', metaDescription: 'Join us at PMQ, Central — first weekend of every month.' },
  });

  console.log('Seeded event x2');
}

/**
 * Vendure pushes product-reference updates to the DRAFT only (see
 * apps/strapi/src/api/product-reference/controllers/product-reference.ts) so an
 * in-progress editorial draft is never prematurely published. For a fresh seed
 * there's no in-progress editorial content to protect, so republish every
 * product-reference once here to bring its live snapshot's title/handle in sync.
 */
async function republishProductReferences(strapi: Core.Strapi) {
  const drafts = await strapi.documents('api::product-reference.product-reference').findMany({ status: 'draft' });
  for (const draft of drafts) {
    await strapi.documents('api::product-reference.product-reference').publish({ documentId: draft.documentId });
  }
  console.log(`Republished ${drafts.length} product-reference entries`);
}

async function main() {
  const { distDir } = await compileStrapi();
  const app = await createStrapi({ distDir }).load();
  app.log.level = 'error';

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakeems-strapi-seed-'));

  await seedSiteSetting(app);
  await seedHomePages(app);
  await seedCollectionPages(app);
  // Publish product-references before events: events relate to them by documentId, and
  // publishing an event only carries over relations to targets that already have a
  // published version at that moment.
  await republishProductReferences(app);
  await seedEvents(app);
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
