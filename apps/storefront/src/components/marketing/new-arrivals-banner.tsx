import type { ChannelCode } from '@/lib/channel';
import { resolveColorToken } from '@/lib/design/color-tokens';
import { Cta } from '@/components/ui/cta';

/** Blush fallback (matches the athleta.gap.com reference) when neither a palette token nor
 * a legacy hex is set. */
const DEFAULT_BG = 'var(--color-blush)';

type NewArrivalsBannerProps = {
  channelCode: ChannelCode;
  eyebrow: string | null;
  heading: string;
  paragraph: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** Legacy free-hex background (kept for backward compatibility). */
  backgroundColor: string | null;
  /** Preferred: a constrained palette token (see lib/design/color-tokens.ts). */
  backgroundToken: string | null;
  /** Montage images, ordered; supplied by the caller from the Vendure collection. */
  images: string[];
};

/**
 * Full-bleed "New Arrivals" editorial banner (athleta.gap.com reference): a solid text
 * panel on the left (eyebrow top, headline centred, copy + CTA bottom) and an image montage
 * on the right that bleeds to the screen edge. Left padding mirrors the site CONTAINER so
 * the copy lines up with the nav's wordmark. Presentational only — content comes from
 * Strapi, images from the Vendure "new-arrivals" collection.
 */
export function NewArrivalsBanner({
  channelCode,
  eyebrow,
  heading,
  paragraph,
  ctaLabel,
  ctaHref,
  backgroundColor,
  backgroundToken,
  images,
}: NewArrivalsBannerProps) {
  // Prefer the constrained palette token; fall back to a legacy free hex, then the default.
  const background = resolveColorToken(backgroundToken) ?? backgroundColor ?? DEFAULT_BG;

  return (
    <section className="w-full" style={{ backgroundColor: background }}>
      <div className="grid md:grid-cols-[2fr_3fr]">
        {/* Left — editorial text panel. justify-between spreads eyebrow (top), headline
            (middle) and copy+CTA (bottom). Left padding matches the site CONTAINER so the
            text lines up with the nav bar's wordmark even though the banner is full-bleed. */}
        <div className="flex flex-col justify-between gap-10 py-12 pr-6 pl-6 md:py-16 md:pr-12 md:pl-[calc(max((100vw-72rem)/2,0px)+2.5rem)] lg:pr-16">
          <p className="eyebrow">{eyebrow ?? 'New Arrivals'}</p>
          <h2 className="text-4xl leading-[1.02] tracking-[0.02em] text-[var(--color-ink)] uppercase md:text-5xl lg:text-6xl">
            {heading}
          </h2>
          <div className="flex flex-col gap-6">
            {paragraph && <p className="max-w-sm text-[var(--color-ink)]">{paragraph}</p>}
            {ctaLabel && ctaHref && <Cta label={ctaLabel} href={ctaHref} channelCode={channelCode} variant="primary" />}
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
