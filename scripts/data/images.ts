/**
 * Product image pipeline (single source of truth for catalogue imagery).
 *
 * Goal: every product+colour gets a photo that actually matches the garment — a
 * "Seamless One-Piece Bodysuit" shows a bodysuit, not a generic tee.
 *
 * Design (deliberately NOT hardcoded URLs, so assets are trivially replaceable with
 * licensed photography later):
 *   product + colour  ->  descriptive prompt/keywords  ->  provider  ->  image bytes
 *
 * Providers are swappable via the CATALOG_IMAGE_PROVIDER env var:
 *   - `pollinations` (default): free AI image generation (no API key) — premium,
 *     on-model, per-colour studio shots in a consistent catalogue style.
 *   - `loremflickr`: keyword-matched stock photos (fallback / offline-lite).
 *   - `licensed`: drop real files named `<fileName>` into ./generated-images and they
 *     are used verbatim (the cache is always checked first) — the migration path to
 *     purchased/branded photography with zero code changes.
 *
 * The seed and the generator both build specs from here, so filenames line up and the
 * on-disk cache (./generated-images, gitignored) is shared: generate once, seed fast.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PersonaProduct } from './persona';

const HERE = dirname(fileURLToPath(import.meta.url));
/** Local asset cache — generated once, reused by every seed. Gitignored (not source). */
export const CACHE_DIR = join(HERE, 'generated-images');

/**
 * Distinct photos generated per colour. 1 = a matched featured shot for every colour (the core
 * requirement: image matches the garment + colour). Raise to 2+ for multi-frame per-colour
 * slideshows once a faster/keyed image source is wired in (the free AI provider is rate-limited).
 */
export const PER_COLOR_IMAGE_COUNT = 1;

const IMG_W = 1024;
const IMG_H = 1280; // 4:5 portrait — standard fashion catalogue ratio
/** Anything smaller is almost certainly a provider error page, not a real photo. */
const MIN_VALID_BYTES = 8_000;

export type ImageProviderName = 'pollinations' | 'loremflickr' | 'licensed';
export const IMAGE_PROVIDER: ImageProviderName =
  (process.env.CATALOG_IMAGE_PROVIDER as ImageProviderName) || 'pollinations';

/**
 * When a provider rate-limits, it returns a fixed "sorry" placeholder that is a valid JPEG but
 * the wrong picture (e.g. loremflickr's throttle image). We reject these by content hash so junk
 * is never cached — a rejected fetch simply retries / fails, and a re-run fills the gap later.
 */
const JUNK_SHA1 = new Set<string>([
  '148e4f8ddfe2cc295ce581d1f4c457f2a3fbffb9', // loremflickr rate-limit placeholder (313935 bytes)
]);

/**
 * The keyword fallback (loremflickr) serves junk while it is being rate-limited, so it is OFF by
 * default: we rely on the AI provider + retries + re-runs, which never yields a mismatched photo.
 * Set CATALOG_IMAGE_FALLBACK=on to re-enable it (useful offline once loremflickr is un-throttled).
 */
const FALLBACK_ENABLED = process.env.CATALOG_IMAGE_FALLBACK === 'on';

export type ImageSpec = {
  /** Stable Vendure asset name AND on-disk cache filename (idempotent by name). */
  fileName: string;
  /** Full AI prompt (pollinations) describing the exact garment + colour + style. */
  prompt: string;
  /** Comma-separated keywords for keyword providers (loremflickr). */
  keywords: string;
  /** Deterministic seed so the same product+colour always yields the same image. */
  seed: number;
};

const codeOf = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

/** Brand swatch names ("Onyx", "Sandstone") mean nothing to an image model — map to plain colours. */
const COLOR_WORD: Record<string, string> = {
  onyx: 'black',
  chalk: 'off-white ivory',
  'soft-sage': 'sage green',
  sandstone: 'sand beige',
  espresso: 'dark espresso brown',
  slate: 'slate grey',
  clay: 'warm clay nude',
  cocoa: 'cocoa brown',
  poppy: 'poppy red',
};
const colorWord = (name: string) => COLOR_WORD[codeOf(name)] ?? name.toLowerCase();

const CATEGORY_CONTEXT: Record<PersonaProduct['category'], string> = {
  tops: 'premium activewear top',
  bottoms: 'premium activewear',
  sets: 'coordinated premium activewear set',
  dresses: 'elegant premium dress',
  swim: 'premium swimwear',
  accessories: 'premium accessory',
};

/**
 * Garment subject phrase. Prefer an explicit per-product `photoHint` (override for
 * anything the name doesn't describe well); otherwise derive it from the product name.
 */
export function garmentSubject(product: PersonaProduct): string {
  return product.photoHint?.trim() || product.name.toLowerCase();
}

/** The descriptive AI prompt for a given product + colour, in a consistent catalogue style. */
export function buildPrompt(product: PersonaProduct, colorName: string): string {
  const subject = garmentSubject(product);
  const ctx = CATEGORY_CONTEXT[product.category] ?? 'premium apparel';
  const body =
    product.category === 'accessories'
      ? `the ${colorWord(colorName)} ${subject}, ${ctx}, product-only still life on a seamless light grey studio background`
      : `a female fashion model wearing a ${colorWord(colorName)} ${subject}, ${ctx}, full-length front view, standing relaxed pose, clean seamless light grey studio backdrop`;
  return `professional e-commerce fashion catalogue photograph, ${body}, soft even studio lighting, sharp focus, high resolution, minimalist premium brand aesthetic, photorealistic`;
}

function keywordsFor(product: PersonaProduct, _colorName: string): string {
  // Keyword providers (loremflickr) match loosely — keep it to the garment noun + "woman"
  // so we get a relevant fashion photo, not a random hit on a colour adjective.
  return `${garmentSubject(product)} woman`.replace(/\s+/g, ',');
}

function hashSeed(...parts: (string | number)[]): number {
  return createHash('sha1').update(parts.join('|')).digest().readUInt32BE(0) % 1_000_000_000;
}

/** The provider URL for a spec (default provider, or an explicit override). */
export function providerUrl(spec: ImageSpec, provider: ImageProviderName = IMAGE_PROVIDER): string {
  if (provider === 'loremflickr') {
    return `https://loremflickr.com/${IMG_W}/${IMG_H}/${encodeURIComponent(spec.keywords)}?lock=${spec.seed}`;
  }
  // pollinations (default) — AI generation, no key required.
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    spec.prompt,
  )}?width=${IMG_W}&height=${IMG_H}&model=flux&nologo=true&seed=${spec.seed}`;
}

/** The N image specs for one product+colour. */
export function colorImageSpecs(product: PersonaProduct, colorName: string): ImageSpec[] {
  const code = codeOf(colorName);
  const prompt = buildPrompt(product, colorName);
  const keywords = keywordsFor(product, colorName);
  return Array.from({ length: PER_COLOR_IMAGE_COUNT }, (_, i) => ({
    fileName: `catalog-${product.slug}-${code}-${i + 1}.jpg`,
    prompt,
    keywords,
    seed: hashSeed(product.slug, code, i),
  }));
}

export type ProductImageSpecs = {
  /** Product-level gallery (its primary colour) — used as the product's featured images. */
  gallery: ImageSpec[];
  /** Per-colour specs keyed by colour code (matches Vendure ProductOption.code). */
  byColorCode: Record<string, ImageSpec[]>;
};

export function productImageSpecs(product: PersonaProduct): ProductImageSpecs {
  const byColorCode: Record<string, ImageSpec[]> = {};
  for (const colorName of product.colors) byColorCode[codeOf(colorName)] = colorImageSpecs(product, colorName);
  const primary = product.colors[0];
  return { gallery: primary ? byColorCode[codeOf(primary)] : [], byColorCode };
}

/* ------------------------------------------------------------------ */
/* Fetching + caching                                                  */
/* ------------------------------------------------------------------ */

const cachePath = (fileName: string) => join(CACHE_DIR, fileName);

function readValidCache(fileName: string): Buffer | null {
  const p = cachePath(fileName);
  if (existsSync(p) && statSync(p).size >= MIN_VALID_BYTES) return readFileSync(p);
  return null;
}

/** Guard against provider error pages masquerading as a 200. */
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < MIN_VALID_BYTES) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50) return true; // PNG
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF') return true; // WEBP
  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function writeCache(fileName: string, buf: Buffer) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(fileName), buf);
}

function sha1(buf: Buffer): string {
  return createHash('sha1').update(buf).digest('hex');
}

async function fetchImage(url: string, timeoutMs: number): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!looksLikeImage(buf)) return null;
    if (JUNK_SHA1.has(sha1(buf))) return null; // rate-limit placeholder — treat as a failure
    return buf;
  } catch {
    return null;
  }
}

/**
 * Resolve image bytes for a spec: on-disk cache first (so licensed drop-ins and
 * prior generations win), then the default provider with retries (varying the seed),
 * then the keyword fallback provider. Returns null only if everything failed.
 */
export async function loadImageBytes(
  spec: ImageSpec,
  opts: { attempts?: number; timeoutMs?: number; writeCache?: boolean; cacheOnly?: boolean } = {},
): Promise<Buffer | null> {
  const cached = readValidCache(spec.fileName);
  if (cached) return cached;

  // Cache-only mode (CATALOG_IMAGE_CACHE_ONLY=1): never hit the network — used by the seed so a
  // not-yet-generated image is skipped instantly instead of blocking on a rate-limited provider.
  if (opts.cacheOnly || process.env.CATALOG_IMAGE_CACHE_ONLY === '1') return null;

  const attempts = opts.attempts ?? 6;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const persist = opts.writeCache !== false;

  for (let attempt = 0; attempt < attempts; attempt++) {
    // Vary the seed on retry so a bad generation isn't retried identically.
    const url = providerUrl({ ...spec, seed: spec.seed + attempt * 101 });
    const buf = await fetchImage(url, timeoutMs);
    if (buf) {
      if (persist) writeCache(spec.fileName, buf);
      return buf;
    }
    // Pollinations rate-limits per-IP (429) and its queue is slow — back off generously so a
    // throttled request recovers on a later attempt rather than failing.
    if (attempt < attempts - 1) await sleep(6000 * (attempt + 1));
  }

  // Fallback provider (keyword stock) — only when explicitly enabled (see FALLBACK_ENABLED).
  if (FALLBACK_ENABLED) {
    const fallback = await fetchImage(providerUrl(spec, 'loremflickr'), timeoutMs);
    if (fallback) {
      if (persist) writeCache(spec.fileName, fallback);
      return fallback;
    }
  }
  return null;
}
