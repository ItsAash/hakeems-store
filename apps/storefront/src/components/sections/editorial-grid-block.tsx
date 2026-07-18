import Image from 'next/image';
import Link from 'next/link';
import { withChannel, type ChannelCode } from '@/lib/channel';
import type { SectionOf } from '@/lib/strapi/types';
import { pickImageUrl } from '@/lib/strapi/client';
import { CONTAINER } from '@/lib/ui';

/** Grid-area classes per editor-chosen span. `feature` anchors a 2×2 cell; the mosaic
 * collapses to a single column below `sm`, where spans would just create dead space. */
const SPAN_CLASS = {
  standard: '',
  wide: 'sm:col-span-2',
  tall: 'sm:row-span-2',
  feature: 'sm:col-span-2 sm:row-span-2',
} as const;

/**
 * `section.editorial-grid` — asymmetric editorial mosaic (the "lookbook wall"): 2–6 image
 * tiles on a dense 12-ish grid, each optionally linking out, with per-tile span control in
 * Strapi. Purely presentational; renders nothing when the editor saved no tiles.
 */
export function EditorialGridBlock({
  section,
  channelCode,
}: {
  section: SectionOf<'section.editorial-grid'>;
  channelCode: ChannelCode;
}) {
  if (section.tiles.length === 0) return null;
  const header = section.header;

  return (
    <section className={`py-section ${CONTAINER}`}>
      {header && (
        <div className={`mb-10 flex flex-col gap-4 md:mb-14 ${header.align === 'center' ? 'items-center text-center' : ''}`}>
          {header.eyebrow && <p className="eyebrow">{header.eyebrow}</p>}
          <h2 className="font-serif text-display-lg text-[var(--color-ink)]">{header.heading}</h2>
          {header.subheading && <p className="max-w-xl text-[var(--color-ink-muted)]">{header.subheading}</p>}
        </div>
      )}

      <div className="grid auto-rows-[16rem] grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5" style={{ gridAutoFlow: 'dense' }}>
        {section.tiles.map((tile) => {
          const content = (
            <>
              <Image
                src={pickImageUrl(tile.image, ['large', 'medium'])}
                alt={tile.alt}
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover transition-transform duration-700 ease-luxe group-hover/tile:scale-[1.04]"
              />
              {(tile.label || tile.tagline) && (
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/60 to-transparent p-5 pt-10">
                  {tile.label && (
                    <span className="text-sm font-medium tracking-label text-[var(--color-paper)] uppercase">
                      {tile.label}
                    </span>
                  )}
                  {tile.tagline && <span className="text-2xs text-[var(--color-paper)]/75">{tile.tagline}</span>}
                </span>
              )}
            </>
          );

          const cellClass = `group/tile relative overflow-hidden bg-[var(--color-hairline)] ${SPAN_CLASS[tile.span]}`;
          return tile.href ? (
            <Link key={tile.id} href={withChannel(channelCode, tile.href)} className={cellClass}>
              {content}
            </Link>
          ) : (
            <div key={tile.id} className={cellClass}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
