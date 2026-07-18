#!/usr/bin/env node
/**
 * Local dev-only scraper: pulls Athleta's product catalog (metadata + images) from the
 * public sitemap + product pages into ./scraped-data/athleta/ for seeding this project's
 * demo/dev database with realistic sample data. Not part of the app; not committed (see
 * .gitignore). Respects the site's published robots.txt (general crawling is allowed
 * there, including for AI/bot user agents) and rate-limits requests.
 *
 * Output layout mirrors ~/Downloads/SKIMS_Catalog:
 *   NN_PRODUCT_NAME/
 *     COLOR_NAME/
 *       COLOR_NAME_01.jpg ...
 *       metadata.json
 *       metadata.txt
 *   catalog.json / catalog.csv   (flat index of every color variant)
 *   README.md
 *
 * Usage:
 *   node scrape-athleta.mjs [--styles=20] [--concurrency=4] [--delay=350] [--out=DIR] [--force]
 *
 * "--styles" counts distinct product styles (grouped by the sitemap's pid prefix), not
 * individual color pages, since one style can have several color variants.
 */

import { mkdir, writeFile, stat, appendFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'https://athleta.gap.com';
const SITEMAP_URL = `${ROOT}/native-product-sitemap.xml`;
const USER_AGENT = 'hakeems-dev-catalog-scraper/1.0 (+local dev seed data; run manually, not a public service)';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? true];
  }),
);

const STYLE_TARGET = args.styles ? parseInt(args.styles, 10) : 20;
const CONCURRENCY = args.concurrency ? parseInt(args.concurrency, 10) : 4;
const DELAY_MS = args.delay ? parseInt(args.delay, 10) : 350;
const OUT_DIR = path.resolve(args.out || './scraped-data/athleta');
const FORCE = Boolean(args.force);
const ERROR_LOG = path.join(OUT_DIR, '_errors.log');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Sitemap pids are listed grouped by style (shared 6-digit prefix); group without fetching. */
async function getGroupedProductUrls(styleTarget) {
  const xml = await fetchText(SITEMAP_URL);
  const pids = [...xml.matchAll(/<loc>https:\/\/athleta\.gap\.com\/browse\/product\.do\?pid=(\d+)<\/loc>/g)].map(
    (m) => m[1],
  );

  const groups = new Map(); // stylePrefix -> [pid, ...]
  for (const pid of pids) {
    const prefix = pid.length > 3 ? pid.slice(0, -3) : pid;
    if (!groups.has(prefix)) {
      if (groups.size >= styleTarget) continue; // keep scanning in case later dupes belong to an existing group
      groups.set(prefix, []);
    }
    if (groups.has(prefix)) groups.get(prefix).push(pid);
  }

  return [...groups.values()].flat().map((pid) => `${ROOT}/browse/product.do?pid=${pid}`);
}

/** Decode the Next.js RSC streaming payload (`self.__next_f.push([1,"..."])` chunks) into one string. */
function decodeRscPayload(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"(.*?)"\]\)<\/script>/gs)].map((m) => m[1]);
  let full = '';
  for (const chunk of chunks) {
    try {
      full += JSON.parse(`"${chunk}"`);
    } catch {
      // skip chunks that aren't valid escaped JS strings (rare, non-data chunks)
    }
  }
  return full;
}

/** Extract a balanced `{...}` or `[...]` block starting at `startIndex`, respecting string literals. */
function extractBalanced(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIndex; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
    } else if (c === openChar) {
      depth++;
    } else if (c === closeChar) {
      depth--;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return null;
}

function extractProductSchema(fullText) {
  const idx = fullText.indexOf('{"@context":"https://schema.org","@type":"Product"');
  if (idx === -1) return null;
  const raw = extractBalanced(fullText, idx, '{', '}');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractBreadcrumbCategory(fullText) {
  // The breadcrumb schema is embedded one escaping level deeper than the Product schema
  // (literal \" quote pairs survive the first RSC-chunk unescape), so undo that extra
  // level within a bounded window before balanced-parsing it as JSON.
  let idx = fullText.indexOf('"@type":"BreadcrumbList"');
  let text = fullText;
  if (idx === -1) {
    idx = fullText.indexOf('\\"@type\\":\\"BreadcrumbList\\"');
    if (idx === -1) return null;
    const windowStart = fullText.lastIndexOf('{\\"@context\\"', idx);
    if (windowStart === -1) return null;
    text = fullText.slice(windowStart, idx + 4000).replace(/\\"/g, '"');
    idx = text.indexOf('"@type":"BreadcrumbList"');
    if (idx === -1) return null;
  }
  const objStart = text.lastIndexOf('{"@context"', idx);
  if (objStart === -1) return null;
  const raw = extractBalanced(text, objStart, '{', '}');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const names = (parsed.itemListElement || [])
      .sort((a, b) => a.position - b.position)
      .map((item) => item.item?.name)
      .filter(Boolean);
    return names.length ? names.join(' > ') : null;
  } catch {
    return null;
  }
}

/** Best-effort fabric composition, e.g. "76% Polyamide / 24% Elastane", if it appears in the description. */
function extractMaterials(description) {
  const match = description?.match(/(\d{1,3}%\s*[A-Za-z][A-Za-z\s]*(?:\/\s*\d{1,3}%\s*[A-Za-z][A-Za-z\s]*)+)/);
  return match ? match[1].trim() : null;
}

function screamingSnakeCase(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for image ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

async function logError(message) {
  console.error(message);
  await appendFile(ERROR_LOG, `${new Date().toISOString()} ${message}\n`).catch(() => {});
}

function writeMetadataTxt(meta) {
  const lines = [
    `Product Name: ${meta.product_name}`,
    `Color: ${meta.color}`,
    `Parent Color: ${meta.parent_color ?? 'N/A'}`,
    `Full Name: ${meta.full_name}`,
    `Category: ${meta.category ?? 'N/A'}`,
    `Description: ${meta.description ?? 'N/A'}`,
    `Price: ${meta.price ?? 'N/A'}`,
    `Currency: ${meta.currency ?? 'N/A'}`,
    `Sizes Available: ${meta.sizes_available}`,
    `Materials: ${meta.materials ?? 'N/A'}`,
    `Rating: ${meta.rating ?? 'N/A'}`,
    `Rating Count: ${meta.rating_count ?? 'N/A'}`,
    `Sku Style: ${meta.sku_style}`,
    `Sku Color: ${meta.sku_color}`,
    `Brand: ${meta.brand}`,
    `Source Url: ${meta.source_url}`,
    `Image Files: ${meta.image_files.join(', ')}`,
  ];
  return lines.join('\n');
}

async function scrapeColorVariant(url, productNumber, index, total, catalogRows) {
  try {
    const html = await fetchText(url);
    const fullText = decodeRscPayload(html);
    const schema = extractProductSchema(fullText);
    if (!schema) {
      await logError(`[${index}/${total}] No product schema found: ${url}`);
      return;
    }

    const productName = schema.name || `Product ${schema.productID}`;
    const color = schema.color || 'DEFAULT';
    const colorSlug = screamingSnakeCase(color);
    const productSlug = screamingSnakeCase(productName);
    const productFolder = `${String(productNumber).padStart(2, '0')}_${productSlug}`;
    const variantDir = path.join(OUT_DIR, productFolder, colorSlug);

    if (!FORCE) {
      const exists = await stat(path.join(variantDir, 'metadata.json')).catch(() => null);
      if (exists) {
        console.log(`[${index}/${total}] skip (already scraped): ${productName} / ${color}`);
        return;
      }
    }

    await mkdir(variantDir, { recursive: true });

    const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers].filter(Boolean);
    const firstOffer = offers[0] || {};
    const images = [...new Set(schema.image || (firstOffer.image ? [firstOffer.image] : []))];
    const imageFiles = images.map((_, i) => `${colorSlug}_${String(i + 1).padStart(2, '0')}.jpg`);

    const meta = {
      product_name: productName,
      color,
      parent_color: null,
      full_name: `${productName} | ${color}`,
      category: extractBreadcrumbCategory(fullText),
      description: schema.description || null,
      price: firstOffer.price ? Number(firstOffer.price) : null,
      currency: firstOffer.priceCurrency || null,
      sizes_available: offers.length,
      materials: extractMaterials(schema.description),
      rating: schema.aggregateRating?.ratingValue ?? null,
      rating_count: schema.aggregateRating?.ratingCount ?? null,
      sku_style: schema.productID ? schema.productID.slice(0, -3) : null,
      sku_color: schema.productID || null,
      brand: schema.brand?.name || 'Athleta',
      source_url: url,
      image_files: imageFiles,
      image_source_urls: images,
    };

    await writeFile(path.join(variantDir, 'metadata.json'), JSON.stringify(meta, null, 2));
    await writeFile(path.join(variantDir, 'metadata.txt'), writeMetadataTxt(meta));

    for (let i = 0; i < images.length; i++) {
      try {
        await downloadImage(images[i], path.join(variantDir, imageFiles[i]));
      } catch (err) {
        await logError(`[${index}/${total}] image failed (${productName}/${color}): ${err.message}`);
      }
    }

    catalogRows.push({
      product_name: productName,
      color,
      category: meta.category,
      price: meta.price,
      currency: meta.currency,
      materials: meta.materials,
      source_url: url,
      style_folder: productFolder,
      num_images: images.length,
    });

    console.log(`[${index}/${total}] ${productName} / ${color} — ${images.length} images`);
  } catch (err) {
    await logError(`[${index}/${total}] FAILED ${url}: ${err.message}`);
  }
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i + 1, items.length);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
}

function toCsv(rows) {
  const headers = ['product_name', 'color', 'category', 'price', 'currency', 'materials', 'source_url', 'style_folder', 'num_images'];
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\n');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Fetching product sitemap and grouping by style...');
  const urls = await getGroupedProductUrls(STYLE_TARGET);
  console.log(`Selected ${urls.length} color-variant pages across ~${STYLE_TARGET} styles.`);

  // Assign a stable product-number prefix per distinct product name as pages resolve,
  // in sitemap (style-grouped) order, so a style's colors all land in the same NN_ folder.
  const productNumbers = new Map();
  let nextNumber = 1;
  const catalogRows = [];

  const worker = async (url, index, total) => {
    // Pre-fetch just enough to know the product name/number bucket; scrapeColorVariant
    // re-does the fetch, which is simpler than threading state through — acceptable given
    // the modest catalog sizes this script targets.
    await scrapeColorVariant(url, await resolveProductNumber(url), index, total, catalogRows);
  };

  async function resolveProductNumber(url) {
    // pid prefix (minus last 3 digits) is a good enough proxy for "same style" without
    // a second network round-trip.
    const pid = new URL(url).searchParams.get('pid') || '';
    const stylePrefix = pid.length > 3 ? pid.slice(0, -3) : pid;
    if (!productNumbers.has(stylePrefix)) productNumbers.set(stylePrefix, nextNumber++);
    return productNumbers.get(stylePrefix);
  }

  console.log(`Scraping with concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms, out=${OUT_DIR}`);
  await runPool(urls, CONCURRENCY, worker);

  await writeFile(path.join(OUT_DIR, 'catalog.json'), JSON.stringify(catalogRows, null, 2));
  await writeFile(path.join(OUT_DIR, 'catalog.csv'), toCsv(catalogRows));

  const styleCount = productNumbers.size;
  const imageCount = catalogRows.reduce((sum, r) => sum + r.num_images, 0);
  const readme = `# Athleta Catalog — Dev Seed Scrape

Source: https://athleta.gap.com

Scope: ${styleCount} product styles x their available color variants.
Totals: ${styleCount} styles, ${catalogRows.length} color variants, ${imageCount} images.

## Structure
    NN_PRODUCT_NAME/
        COLOR_NAME/
            COLOR_NAME_01.jpg ...   (full-resolution product images)
            metadata.json           (machine-readable)
            metadata.txt            (human-readable)
    catalog.json / catalog.csv      (flat index of every color variant)

## Metadata fields
product_name, color, parent_color, full_name, category, description, price + currency,
sizes_available, materials, rating, rating_count, sku_style, sku_color, brand, source_url,
image_files, image_source_urls.

NOTE: These are Athleta's / Gap Inc.'s copyrighted assets, scraped for internal dev/demo
catalog seeding only. Do not publish or redistribute.
`;
  await writeFile(path.join(OUT_DIR, 'README.md'), readme);

  console.log(`Done. ${styleCount} styles, ${catalogRows.length} variants, ${imageCount} images -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
