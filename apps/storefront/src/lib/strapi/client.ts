import qs from 'qs';
import { z } from 'zod';
import type { StrapiMedia } from '@/lib/strapi/types';

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

/** Strapi media `url`/`formats[*].url` are host-relative in dev; some production
 * upload providers (S3, Cloudinary) already return absolute URLs — pass those through. */
export function resolveMediaUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${STRAPI_API_URL}${url}`;
}

/**
 * Picks a reasonably-sized rendition instead of the raw upload (which can be
 * several thousand px wide) — falls back down the list, then to the original.
 */
export function pickImageUrl(media: StrapiMedia, preferred: Array<'large' | 'medium' | 'small' | 'thumbnail'>): string {
  for (const size of preferred) {
    const format = media.formats?.[size];
    if (format) return resolveMediaUrl(format.url);
  }
  return resolveMediaUrl(media.url);
}

export type StrapiListResponse<T> = {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
};

export type StrapiSingleResponse<T> = {
  data: T | null;
};

type StrapiFetchOptions = {
  /** Populate paths. A `string[]` covers flat cases (e.g. ['heroSlides.image']); an object
   * is stringified with `qs` for deep/dynamic-zone populate (the `{ on: { ... } }` form). */
  populate?: string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  /** Revalidation window in seconds for Next.js fetch caching. */
  revalidate?: number;
  /** Runtime shape guard for the response. On mismatch we log and fall back to the raw
   * payload (fail-soft) rather than crash the page. */
  schema?: z.ZodType;
  /** For single types: a 404 (no entry created yet) resolves to `{ data: null }` instead
   * of throwing — so an unpublished/empty single type omits its section instead of 500-ing. */
  notFoundAsNull?: boolean;
};

function buildQueryString(options: StrapiFetchOptions): string {
  // Object populate (deep / dynamic-zone) — stringify the whole query with qs.
  if (options.populate && !Array.isArray(options.populate)) {
    return qs.stringify(
      { populate: options.populate, filters: options.filters },
      { encodeValuesOnly: true },
    );
  }

  // Flat populate — simple indexed params.
  const params = new URLSearchParams();
  options.populate?.forEach((path, index) => {
    params.set(`populate[${index}]`, path);
  });
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      params.set(`filters[${key}]`, String(value));
    }
  }
  return params.toString();
}

/** Thin typed wrapper over Strapi's REST Content API — no GraphQL plugin is installed. */
export async function strapiFetch<T>(path: string, options: StrapiFetchOptions = {}): Promise<T> {
  const query = buildQueryString(options);
  const url = `${STRAPI_API_URL}/api/${path}${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    headers: {
      ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
    },
    next: { revalidate: options.revalidate ?? 60 },
  });

  if (!response.ok) {
    // A single type with no entry 404s; treat that as "empty", not a hard failure.
    if (response.status === 404 && options.notFoundAsNull) {
      return { data: null } as T;
    }
    throw new Error(`Strapi request failed: ${response.status} ${path}`);
  }

  const json = await response.json();

  if (options.schema) {
    const parsed = options.schema.safeParse(json);
    if (!parsed.success) {
      // Fail-soft: don't crash the page on shape drift — log the exact issues and fall
      // back to the raw payload so the rest of the page still renders.
      console.error(`[strapi] response validation failed for "${path}":`, parsed.error.issues);
      return json as T;
    }
    return parsed.data as T;
  }

  return json as T;
}
