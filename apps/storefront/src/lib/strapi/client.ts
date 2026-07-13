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
  /** Field/component paths to populate, e.g. ['heroSlides.image', 'seo.ogImage']. */
  populate?: string[];
  filters?: Record<string, unknown>;
  /** Revalidation window in seconds for Next.js fetch caching. */
  revalidate?: number;
};

function buildQueryString(options: StrapiFetchOptions): string {
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
    throw new Error(`Strapi request failed: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}
