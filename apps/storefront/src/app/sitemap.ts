import type { MetadataRoute } from 'next';
import { CHANNEL_CODES, type ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { createMedusaClient } from '@/lib/medusa/client';
import { getLegalPageSlugs } from '@/lib/strapi/queries';
import { CHANNEL_OG_LOCALE, PRIMARY_CHANNEL, absoluteUrl } from '@/lib/seo/site';

// Re-crawled hourly; the catalog/CMS drive it so new products, collections and legal pages
// appear automatically with no code change.
export const revalidate = 3600;

const PAGE_SIZE = 100;

type CatalogEntry = { slug: string; updatedAt?: string | null };

async function fetchCatalog(): Promise<{ products: CatalogEntry[]; collections: CatalogEntry[] }> {
  const client = createMedusaClient(PRIMARY_CHANNEL);

  const products: CatalogEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { products: page, count } = await client.store.product
      .list({ limit: PAGE_SIZE, offset, fields: 'handle,updated_at' })
      .catch(() => ({ products: [], count: 0 }));
    products.push(...page.map((p) => ({ slug: p.handle ?? '', updatedAt: p.updated_at as string | undefined })));
    if (offset + PAGE_SIZE >= count || page.length === 0) break;
  }

  const collections: CatalogEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { collections: page, count } = await client.store.collection
      .list({ limit: PAGE_SIZE, offset, fields: 'handle,updated_at' })
      .catch(() => ({ collections: [], count: 0 }));
    collections.push(...page.map((c) => ({ slug: c.handle ?? '', updatedAt: c.updated_at as string | undefined })));
    if (offset + PAGE_SIZE >= count || page.length === 0) break;
  }

  return { products, collections };
}

type PathFor = (channel: ChannelCode) => string;

/** One sitemap entry per channel for the same logical page, cross-linked via hreflang. */
function perChannel(pathFor: PathFor, opts: { lastModified?: string; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number }): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    CHANNEL_CODES.map((code) => [CHANNEL_OG_LOCALE[code].replace('_', '-'), absoluteUrl(pathFor(code))]),
  );
  return CHANNEL_CODES.map((channel) => ({
    url: absoluteUrl(pathFor(channel)),
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Slugs are shared across channels, so one catalog fetch (via the primary channel) suffices.
  const [{ products, collections }, legalPages] = await Promise.all([fetchCatalog(), getLegalPageSlugs().catch(() => [])]);

  return [
    ...perChannel((c) => routes.home(c), { changeFrequency: 'daily', priority: 1 }),
    ...perChannel((c) => routes.shop(c), { changeFrequency: 'daily', priority: 0.9 }),
    ...perChannel((c) => `/${c}/story`, { changeFrequency: 'monthly', priority: 0.5 }),
    ...collections.flatMap((collection) =>
      perChannel((c) => routes.collection(c, collection.slug), {
        lastModified: collection.updatedAt ?? undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    ),
    ...products.flatMap((product) =>
      perChannel((c) => routes.product(c, product.slug), {
        lastModified: product.updatedAt ?? undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    ),
    ...legalPages.flatMap((page) =>
      perChannel((c) => `/${c}/${page.slug}`, {
        lastModified: page.updatedAt ?? undefined,
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
    ),
  ];
}
