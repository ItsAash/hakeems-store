import Link from 'next/link';
import { withChannel, type ChannelCode } from '@/lib/channel';

/** Blush fallback matching the reference (athleta.gap.com New Arrivals) when Strapi
 * doesn't supply a background colour. */
const DEFAULT_BG = '#f7e8e6';

type NewArrivalsBannerProps = {
  channelCode: ChannelCode;
  eyebrow: string | null;
  heading: string;
  paragraph: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  backgroundColor: string | null;
  /** Montage images, ordered; supplied by the caller from the Vendure collection. */
  images: string[];
};

/**
 * Full-bleed "New Arrivals" editorial banner modelled on athleta.gap.com: a solid blush
 * text panel on the left (eyebrow pinned top, headline centred, copy + pill CTA at the
 * bottom) and a tight image montage on the right that bleeds to the screen edge. Stacks
 * to a single column on mobile.
 *
 * Presentational only: the left-hand content comes from Strapi and the montage images from
 * the Vendure "new-arrivals" collection, both passed in — so nothing here needs to change
 * when the copy or the collection does.
 */
export function NewArrivalsBanner({
  channelCode,
  eyebrow,
  heading,
  paragraph,
  ctaLabel,
  ctaHref,
  backgroundColor,
  images,
}: NewArrivalsBannerProps) {
  const ctaTo = ctaHref ? withChannel(channelCode, ctaHref) : null;

  return (
    <section className="w-full" style={{ backgroundColor: backgroundColor ?? DEFAULT_BG }}>
      <div className="grid md:grid-cols-[2fr_3fr]">
        {/* Left — editorial text panel. justify-between spreads eyebrow (top), headline
            (middle) and copy+CTA (bottom) like the reference. The left padding mirrors the
            site CONTAINER (max-w-6xl centered + px) so the text lines up on the same vertical
            edge as the nav bar's "Hakeems" title, even though the banner itself is full-bleed. */}
        <div className="flex flex-col justify-between gap-10 py-12 pr-6 pl-6 md:py-16 md:pr-12 md:pl-[calc(max((100vw-72rem)/2,0px)+2.5rem)] lg:pr-16">
          <p className="eyebrow">{eyebrow ?? 'New Arrivals'}</p>
          <h2 className="text-4xl leading-[1.02] tracking-[0.02em] text-[var(--color-ink)] uppercase md:text-5xl lg:text-6xl">
            {heading}
          </h2>
          <div className="flex flex-col gap-6">
            {paragraph && <p className="max-w-sm text-[var(--color-ink)]">{paragraph}</p>}
            {ctaLabel && ctaTo && (
              <Link
                href={ctaTo}
                className="inline-flex w-fit items-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 text-sm font-medium tracking-wide text-[var(--color-paper)] transition-opacity hover:opacity-90"
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>

        {/* Right — image montage. Bleeds to the edge; each cell subtly zooms on hover. */}
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 md:gap-2">
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="group/cell relative aspect-[3/4] overflow-hidden bg-[var(--color-hairline)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover/cell:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
