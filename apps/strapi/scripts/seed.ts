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
    tagline: 'Premium women’s activewear, designed in Kathmandu.',
    defaultSeo: {
      metaTitle: 'Hakeems — Premium Women’s Activewear',
      metaDescription:
        'Premium women’s activewear designed in Kathmandu, worn in Nepal and Hong Kong. Naked-feel leggings, seamless bras, yoga sets and layers engineered to move.',
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
    { label: 'Dresses', href: '/collections/dresses' },
    { label: 'Sets', href: '/collections/sets' },
    { label: 'Swim', href: '/collections/swim' },
  ];
  const items = [
    { label: 'New Arrivals', href: '/collections/new-arrivals' },
    // "Shop" is the explicit full-catalog entry point (/shop). Its children are category
    // entry points, which each go to their Collection page.
    { label: 'Shop', href: '/shop', children: shopChildren },
    { label: 'Shape & Sculpt', href: '/collections/shape-and-sculpt' },
    { label: 'Studio & Yoga', href: '/collections/studio-and-yoga' },
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
  // collection-page requires the Vendure collection id (vendureId). Resolve it live from the
  // Vendure shop API (public, no auth) so we can create the editorial page even when the
  // Vendure→Strapi sync webhook hasn't run. The Vendure seed must have created the collections.
  const vendureUrl = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
  const idBySlug = new Map<string, string>();
  try {
    const res = await fetch(vendureUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'vendure-token': 'nepal' },
      body: JSON.stringify({ query: '{ collections(options: { take: 100 }) { items { id slug } } }' }),
    });
    const json: any = await res.json();
    for (const c of json?.data?.collections?.items ?? []) idBySlug.set(c.slug, String(c.id));
  } catch {
    console.warn('Could not reach Vendure to resolve collection ids — is the server running?');
  }

  // Known-good activewear imagery (same Unsplash ids the Vendure seed already fetched).
  const h = async (id: string, name: string) => uploadImage(strapi, unsplash(id, 'w=1600&h=900&fit=crop&q=80'), name);
  const heroNew = await h('photo-1552902865-b72c031ac5ea', 'collection-new-arrivals.jpg');
  const heroShape = await h('photo-1571945153237-4929e783af4a', 'collection-shape.jpg');
  const heroPerf = await h('photo-1556905055-8f358a7a47b2', 'collection-performance.jpg');
  const heroStudio = await h('photo-1618354691373-d851c5c3a990', 'collection-studio.jpg');
  const heroOuter = await h('photo-1624378439575-d8705ad7ae80', 'collection-outerwear.jpg');
  const heroLounge = await h('photo-1620799140408-edc6dcb6d633', 'collection-loungewear.jpg');
  const heroTops = await h('photo-1583743814966-8936f5b7be1a', 'collection-tops.jpg');
  const heroBottoms = await h('photo-1594633312681-425c7b97ccd1', 'collection-bottoms.jpg');
  const heroSets = await h('photo-1591047139829-d91aecb6caea', 'collection-sets.jpg');
  const heroDress = await h('photo-1503341504253-dff4815485f1', 'collection-dresses.jpg');
  const heroSwim = await h('photo-1516762689617-e1cffcef479d', 'collection-swim.jpg');

  const pages = [
    { slug: 'spotlight', title: 'Spotlight', tagline: 'This week, front row', hero: heroNew, featured: true, sortOrder: 0,
      description: 'A rotating edit of the pieces we can’t keep in stock — our current best-sellers, restocked while they last.',
      metaTitle: 'Spotlight — Best-Selling Activewear | Hakeems', metaDescription: 'Our current best-sellers — the women’s activewear pieces everyone’s wearing right now.' },
    { slug: 'new-arrivals', title: 'New Arrivals', tagline: 'The latest drop', hero: heroNew, featured: true, sortOrder: 1,
      description: 'Fresh silhouettes, seasonal colour and first access to everything that just landed.',
      metaTitle: 'New Arrivals — Women’s Activewear | Hakeems', metaDescription: 'Shop the latest women’s activewear from Hakeems — new leggings, bras, sets and layers, fresh off the drop.' },
    { slug: 'shape-and-sculpt', title: 'Shape & Sculpt', tagline: 'Sculpt & support, invisibly', hero: heroShape, featured: true, sortOrder: 1,
      description: 'Second-skin bodysuits and smoothing shapewear that sculpt and support under everything you wear.',
      metaTitle: 'Shape & Sculpt — Bodysuits & Shapewear | Hakeems', metaDescription: 'Second-skin bodysuits and smoothing shapewear that sculpt and support, invisibly — the elevated base layer for any look.' },
    { slug: 'performance-essentials', title: 'Performance Essentials', tagline: 'Engineered to move', hero: heroPerf, featured: true, sortOrder: 2,
      description: 'The train-day core: bras, tights, tanks and shorts built to move with you, rep after rep.',
      metaTitle: 'Performance Essentials — Training Wear | Hakeems', metaDescription: 'Sweat-wicking, squat-proof training essentials — sports bras, leggings, shorts and tanks engineered to perform.' },
    { slug: 'studio-and-yoga', title: 'Studio & Yoga', tagline: 'Second-skin softness', hero: heroStudio, featured: true, sortOrder: 3,
      description: 'Buttery-soft, second-skin pieces for the mat and the flow — seamless bras, tees, flares and sets.',
      metaTitle: 'Studio & Yoga — Women’s Yoga Wear | Hakeems', metaDescription: 'Buttery-soft yoga and studio wear — seamless bras, tees, flares and matching sets designed for the mat.' },
    { slug: 'outerwear-and-layers', title: 'Outerwear & Layers', tagline: 'Wind, chill & transit-proof', hero: heroOuter, featured: false, sortOrder: 4,
      description: 'Shells, half-zips and travel layers that take you from cold starts to the commute.',
      metaTitle: 'Outerwear & Layers — Activewear | Hakeems', metaDescription: 'Water-resistant jackets, base layers and travel pieces — wind-, chill- and transit-proof layers.' },
    { slug: 'loungewear', title: 'Loungewear', tagline: 'Off-duty softness', hero: heroLounge, featured: false, sortOrder: 5,
      description: 'Brushed-soft joggers, hoodies and sets — the pieces you live in between sessions.',
      metaTitle: 'Loungewear — Women’s | Hakeems', metaDescription: 'Off-duty softness — brushed-fleece joggers, hoodies and matching lounge sets for rest days and travel.' },
    { slug: 'tops', title: 'Tops', tagline: 'Bras, tanks, tees & layers', hero: heroTops, featured: false, sortOrder: 6,
      description: 'From seamless sports bras to breathable tanks and cropped long-sleeves — the upper half, sorted.',
      metaTitle: 'Women’s Activewear Tops — Bras & Tanks | Hakeems', metaDescription: 'Women’s activewear tops — sports bras, tanks, seamless tees, long-sleeves and layers built to move.' },
    { slug: 'bottoms', title: 'Bottoms', tagline: 'Leggings, shorts & joggers', hero: heroBottoms, featured: false, sortOrder: 7,
      description: 'Naked-feel leggings, bike shorts, flares and travel pants in our sculpting, sweat-wicking knits.',
      metaTitle: 'Women’s Leggings & Shorts — Bottoms | Hakeems', metaDescription: 'Naked-feel high-rise leggings, bike shorts, yoga flares and travel pants — squat-proof and sweat-wicking.' },
    { slug: 'sets', title: 'Sets', tagline: 'Matching, made easy', hero: heroSets, featured: false, sortOrder: 8,
      description: 'Coordinated bra-and-legging sets and one-pieces — buy them together, wear them everywhere.',
      metaTitle: 'Matching Activewear Sets — Women’s | Hakeems', metaDescription: 'Coordinated women’s activewear sets — matching bra-and-legging sets, yoga sets and unitards.' },
    { slug: 'dresses', title: 'Dresses', tagline: 'One-and-done, elevated', hero: heroDress, featured: true, sortOrder: 9,
      description: 'Ribbed slip dresses, lounge maxis and the built-in tennis dress — effortless, sculpted one-pieces.',
      metaTitle: 'Women’s Dresses — Slip, Lounge & Tennis | Hakeems', metaDescription: 'Elevated one-piece dresses — ribbed slip dresses, lounge maxis, satin slips and the built-in tennis dress.' },
    { slug: 'swim', title: 'Swim', tagline: 'Mix, match, done', hero: heroSwim, featured: true, sortOrder: 10,
      description: 'Bikinis and one-pieces in a smooth, quick-dry swim knit — mix-and-match tops and bottoms.',
      metaTitle: 'Women’s Swimwear — Bikinis & One-Pieces | Hakeems', metaDescription: 'Smooth, quick-dry women’s swimwear — triangle and halter bikinis and sculpting one-pieces, made to mix and match.' },
  ];

  const uid = 'api::collection-page.collection-page';
  let count = 0;
  for (const page of pages) {
    const vendureId = idBySlug.get(page.slug);
    if (!vendureId) {
      console.warn(`Skipping "${page.slug}": no matching Vendure collection (run the Vendure seed first).`);
      continue;
    }
    const data: any = {
      vendureId,
      vendureCollectionSlug: page.slug,
      title: page.title,
      tagline: page.tagline,
      description: page.description,
      heroImage: page.hero,
      featured: page.featured,
      sortOrder: page.sortOrder,
      seo: { metaTitle: page.metaTitle, metaDescription: page.metaDescription },
    };
    const existing = await strapi.documents(uid).findFirst({ filters: { vendureCollectionSlug: page.slug }, status: 'draft' });
    if (existing) {
      await strapi.documents(uid).update({ documentId: existing.documentId, data });
      await strapi.documents(uid).publish({ documentId: existing.documentId });
    } else {
      const created = await strapi.documents(uid).create({ data });
      await strapi.documents(uid).publish({ documentId: created.documentId });
    }
    count += 1;
  }
  console.log(`Seeded ${count}/${pages.length} collection-pages`);
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
    heading: 'Made to move with you.',
    paragraphs: [
      {
        text: 'Hakeems designs premium women’s activewear from a small studio in Kathmandu — naked-feel fabrics, seamless construction and considered fits, tested in real training, real flows and real life, not just a lookbook.',
      },
      {
        text: 'We build in small, sustainable batches with recycled and organic fibres, so every piece earns its place in your rotation — supportive on the hardest days, soft enough to live in on the rest.',
      },
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
    { text: 'NEW ARRIVALS — THE SS26 ACTIVEWEAR EDIT IS HERE' },
    { text: 'FREE RETURNS WITHIN 14 DAYS' },
  ],
  hongkong: [
    { text: 'FREE HK ISLAND DELIVERY ON ORDERS OVER HKD 800' },
    { text: 'NEW ARRIVALS — THE SS26 ACTIVEWEAR EDIT IS HERE' },
    { text: 'FREE RETURNS WITHIN 14 DAYS' },
  ],
};

/**
 * Composes each channel's 'home' Page (dynamic zone) directly — the sole source of truth
 * for home-page content now that the home-page collection type is retired. Sections are
 * literal here (previously they were migrated from home-page's fields); reorder/add/remove
 * them straight in Strapi afterwards with no code change needed.
 */
async function seedPages(strapi: Core.Strapi) {
  const tileTops = await uploadImage(strapi, unsplash('photo-1583743814966-8936f5b7be1a', 'w=1200&h=1500&fit=crop&q=80'), 'tile-tops.jpg');
  const tileBottoms = await uploadImage(strapi, unsplash('photo-1594633312681-425c7b97ccd1', 'w=1200&h=1500&fit=crop&q=80'), 'tile-bottoms.jpg');
  const tileSets = await uploadImage(strapi, unsplash('photo-1591047139829-d91aecb6caea', 'w=1200&h=1500&fit=crop&q=80'), 'tile-sets.jpg');
  const tileDresses = await uploadImage(strapi, unsplash('photo-1503341504253-dff4815485f1', 'w=1200&h=1500&fit=crop&q=80'), 'tile-dresses.jpg');
  const tileSwim = await uploadImage(strapi, unsplash('photo-1516762689617-e1cffcef479d', 'w=1200&h=1500&fit=crop&q=80'), 'tile-swim.jpg');
  const facetCategoryTiles = [
    { vendureFacetValueCode: 'categories:tops', label: 'Tops', tagline: 'Bras, bodysuits & layers', image: tileTops },
    { vendureFacetValueCode: 'categories:bottoms', label: 'Bottoms', tagline: 'Leggings, flares & cargos', image: tileBottoms },
    { vendureFacetValueCode: 'categories:dresses', label: 'Dresses', tagline: 'Slip, lounge & tennis', image: tileDresses },
    { vendureFacetValueCode: 'categories:sets', label: 'Sets', tagline: 'Matching, made easy', image: tileSets },
    { vendureFacetValueCode: 'categories:swim', label: 'Swim', tagline: 'Bikinis & one-pieces', image: tileSwim },
  ];

  const heroMove = await uploadImage(strapi, unsplash('photo-1552902865-b72c031ac5ea'), 'hero-move.jpg');
  const heroStudio = await uploadImage(strapi, unsplash('photo-1556905055-8f358a7a47b2'), 'hero-studio.jpg');
  const heroFabric = await uploadImage(strapi, unsplash('photo-1618354691373-d851c5c3a990'), 'hero-fabric.jpg');

  // hrefs are channel-RELATIVE — the storefront's withChannel() adds the channel prefix once.
  const heroSlides = [
    {
      image: heroMove,
      heading: 'Made To Move',
      subheading: 'Premium women’s activewear — naked-feel leggings, seamless bras and second-skin sets, designed in Kathmandu.',
      ctaLabel: 'Shop New Arrivals',
      ctaHref: '/collections/new-arrivals',
      alt: 'Woman stretching in Hakeems activewear against a soft studio backdrop',
    },
    {
      image: heroStudio,
      heading: 'Second-Skin Softness',
      subheading: 'Buttery-soft pieces for the mat and the flow — built to disappear the moment you move.',
      ctaLabel: 'Shop Studio & Yoga',
      ctaHref: '/collections/studio-and-yoga',
      alt: 'Woman in a Hakeems yoga set on a studio floor',
    },
    {
      image: heroFabric,
      heading: 'Engineered To Perform',
      subheading: 'Sweat-wicking, squat-proof and made to last — the train-day essentials you reach for every session.',
      ctaLabel: 'Shop Performance',
      ctaHref: '/collections/performance-essentials',
      alt: 'Close-up of Hakeems performance knit activewear fabric',
    },
  ];
  const HERO_SLIDES: Record<'nepal' | 'hongkong', any[]> = {
    nepal: heroSlides,
    hongkong: heroSlides,
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
