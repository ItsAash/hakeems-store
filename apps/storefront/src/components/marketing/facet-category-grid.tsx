import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import type { FacetCategoryTile, SectionHeader } from '@/lib/strapi/types';
import { pickImageUrl } from '@/lib/strapi/client';
import { getVendureClient } from '@/lib/vendure/client';
import { routes } from '@/lib/routes';
import { CONTAINER } from '@/lib/ui';

/**
 * "Shop By Category" tiles. Each tile is a category entry point, so it always links to that
 * category's Collection page (`/{channel}/collections/{slug}`) — never `/shop?facet=…`.
 *
 * Strapi stores a stable facet-value **code** (`"<facetCode>:<valueCode>"`, e.g.
 * "categories:tops"), never a database id. The value segment mirrors the Vendure collection
 * slug by convention (the seed guarantees `categories:*` ⇄ collection slugs), so we route by
 * that slug. The facet-value id is still resolved from Vendure's live facets — but only to
 * show each tile's "N items" count, never for the link.
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
