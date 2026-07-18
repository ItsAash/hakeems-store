import Image from 'next/image';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import type { FacetCategoryTile, SectionHeader } from '@/lib/strapi/types';
import { pickImageUrl } from '@/lib/strapi/client';
import { createMedusaClient } from '@/lib/medusa/client';
import { getCollectionByHandle } from '@/lib/medusa/products';
import { routes } from '@/lib/routes';
import { CONTAINER } from '@/lib/ui';

/**
 * "Shop By Category" tiles. Each tile is a category entry point, so it always links to that
 * category's Collection page (`/{channel}/collections/{slug}`) — never `/shop?facet=…`.
 *
 * Strapi stores a stable `"<facetCode>:<collectionSlug>"` code (e.g. "categories:tops") —
 * a naming leftover from the Vendure days, kept as-is so existing Strapi content doesn't
 * need re-authoring. Only the value segment (the collection slug) is actually used: it's
 * both the link target and, resolved to a Medusa collection id, the source of each tile's
 * "N items" count.
 */
export async function FacetCategoryGrid({
  tiles,
  channelCode,
  header,
}: {
  tiles: FacetCategoryTile[];
  channelCode: ChannelCode;
  /** Optional Strapi-authored header; falls back to the default copy when absent. */
  header?: SectionHeader | null;
}) {
  if (tiles.length === 0) return null;

  const client = createMedusaClient(channelCode);

  const counts = await Promise.all(
    tiles.map(async (tile) => {
      const collectionSlug = tile.vendureFacetValueCode.split(':')[1] ?? '';
      if (!collectionSlug) return null;
      const collection = await getCollectionByHandle(channelCode, collectionSlug);
      if (!collection) return null;
      return client.store.product
        .list({ collection_id: [collection.id], limit: 1 })
        .then((result) => result.count)
        .catch(() => null);
    }),
  );

  return (
    <section className={`py-section ${CONTAINER}`}>
      <div className="mb-10 md:mb-14">
        <p className="mb-3 text-xs tracking-[0.2em] text-[var(--color-ink-muted)] uppercase">
          {header?.eyebrow ?? 'Shop By Category'}
        </p>
        <h2 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">
          {header?.heading ?? 'Shop The Edit'}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {tiles.map((tile, i) => {
          const imageUrl = tile.image ? pickImageUrl(tile.image, ['medium', 'small']) : null;
          const count = counts[i];
          // The value segment of "<facetCode>:<valueCode>" is the collection slug. Route to
          // that collection; if the code carries no value segment, fall back to /shop rather
          // than emit a broken link.
          const collectionSlug = tile.vendureFacetValueCode.split(':')[1] ?? '';
          const href = collectionSlug ? routes.collection(channelCode, collectionSlug) : routes.shop(channelCode);

          return (
            <Link
              key={tile.id}
              href={href}
              className="group relative block aspect-[3/4] overflow-hidden bg-[var(--color-ink)]"
            >
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt={`Shop ${tile.label}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/25 transition-colors duration-300 group-hover:bg-black/35" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-0.5 p-5 md:p-6">
                <h3 className="font-serif text-xl text-[var(--color-paper)] md:text-2xl">{tile.label}</h3>
                {tile.tagline && <p className="text-xs text-[var(--color-paper)]/75">{tile.tagline}</p>}
                {/* No badge at all when count is 0/unknown — a visible "0 items" reads
                    as broken on a category that simply has no products assigned yet. */}
                <p className="mt-1 text-[11px] text-[var(--color-paper)]/60">{!!count ? count : '0'} items</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
