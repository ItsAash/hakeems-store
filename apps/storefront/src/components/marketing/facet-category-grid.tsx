import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import type { FacetCategoryTile } from '@/lib/strapi/types';
import { pickImageUrl } from '@/lib/strapi/client';
import { getVendureClient } from '@/lib/vendure/client';
import { CONTAINER } from '@/lib/ui';

/**
 * Facet-driven category tiles — deliberately independent of Vendure Collections
 * (see the collection-tile component for that). Each tile's live "N items" count
 * comes straight from Vendure's `search`; the label/tagline/image are Strapi's to own,
 * so merchandisers manage the whole grid (which categories, in what order, with what
 * photography) from Strapi without touching code.
 */
export async function FacetCategoryGrid({
  tiles,
  channelCode,
}: {
  tiles: FacetCategoryTile[];
  channelCode: ChannelCode;
}) {
  if (tiles.length === 0) return null;

  const client = getVendureClient(channelCode);
  const counts = await Promise.all(
    tiles.map((tile) =>
      client
        .FacetValueCount({ facetValueId: tile.vendureFacetValueId })
        .then((result) => result.search.totalItems)
        .catch(() => null),
    ),
  );

  return (
    <section className={`py-section ${CONTAINER}`}>
      <div className="mb-10 md:mb-14">
        <p className="mb-3 text-xs tracking-[0.2em] text-[var(--color-ink-muted)] uppercase">Shop By Category</p>
        <h2 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Shop The Edit</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {tiles.map((tile, i) => {
          const imageUrl = tile.image ? pickImageUrl(tile.image, ['medium', 'small']) : null;
          const count = counts[i];

          return (
            <Link
              key={tile.id}
              href={`/${channelCode}/shop?facetValueId=${tile.vendureFacetValueId}`}
              className="group relative block aspect-[3/4] overflow-hidden bg-[var(--color-ink)]"
            >
              {imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
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
