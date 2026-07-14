import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import type { FacetCategoryTile, SectionHeader } from '@/lib/strapi/types';
import { pickImageUrl } from '@/lib/strapi/client';
import { getVendureClient } from '@/lib/vendure/client';
import { CONTAINER } from '@/lib/ui';

/**
 * Facet-driven category tiles — deliberately independent of Vendure Collections
 * (see the collection-tile component for that). Each tile's live "N items" count comes
 * straight from Vendure's `search`; the label/tagline/image are Strapi's to own, so
 * merchandisers manage the whole grid from Strapi without touching code.
 *
 * Strapi stores a stable facet-value **code** (`"<facetCode>:<valueCode>"`, e.g.
 * "categories:tops"), never a database id. We resolve it to Vendure's live facet-value id
 * here at render time — so re-seeds or environment moves (which reassign ids) never break
 * the grid.
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

  const client = getVendureClient(channelCode);

  // Build a "<facetCode>:<valueCode>" -> facetValueId map from Vendure's live facets.
  const facetData = await client.FacetValues().catch(() => null);
  const codeToId = new Map<string, string>();
  for (const facet of facetData?.facets.items ?? []) {
    for (const value of facet.values) {
      codeToId.set(`${facet.code}:${value.code}`, value.id);
    }
  }

  const resolved = tiles.map((tile) => ({ tile, facetValueId: codeToId.get(tile.vendureFacetValueCode) ?? null }));

  const counts = await Promise.all(
    resolved.map(({ facetValueId }) =>
      facetValueId
        ? client
            .FacetValueCount({ facetValueId })
            .then((result) => result.search.totalItems)
            .catch(() => null)
        : Promise.resolve(null),
    ),
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
        {resolved.map(({ tile, facetValueId }, i) => {
          const imageUrl = tile.image ? pickImageUrl(tile.image, ['medium', 'small']) : null;
          const count = counts[i];
          // Resolved → filtered shop; unresolved code → the unfiltered shop, never a broken link.
          const href = facetValueId ? `/${channelCode}/shop?facetValueId=${facetValueId}` : `/${channelCode}/shop`;

          return (
            <Link
              key={tile.id}
              href={href}
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
