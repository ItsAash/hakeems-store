import Image from 'next/image';
import type { ChannelCode } from '@/lib/channel';
import type { SectionOf } from '@/lib/strapi/types';
import { pickImageUrl } from '@/lib/strapi/client';
import { resolveColorToken } from '@/lib/design/color-tokens';
import { Cta } from '@/components/ui/cta';

/**
 * `section.hero-split` — promotional split hero: an editorial copy panel (eyebrow, serif
 * headline, subheading, optional promo label + CTA) beside a full-bleed image whose side
 * the editor flips with `imageSide`. Purely presentational — everything comes from Strapi,
 * so it renders synchronously with no Suspense boundary.
 */
export function HeroSplitBlock({
  section,
  channelCode,
}: {
  section: SectionOf<'section.hero-split'>;
  channelCode: ChannelCode;
}) {
  const background = resolveColorToken(section.backgroundToken) ?? 'var(--color-sand)';
  const imageLeft = section.imageSide === 'left';
  const desktopUrl = pickImageUrl(section.media.image, ['large', 'medium']);
  const alt = section.media.alt ?? section.header.heading;

  return (
    <section className="w-full" style={{ backgroundColor: background }}>
      <div className={`grid md:grid-cols-2 ${imageLeft ? '' : 'md:[direction:rtl]'}`}>
        {/* Image half — bleeds to its screen edge. The rtl trick flips column order without
            reordering the DOM, so the copy stays first for screen readers either way. */}
        <div className="relative aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[560px] [direction:ltr]">
          <Image
            src={desktopUrl}
            alt={alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        {/* Copy half — its outer (page) edge uses *-container-bleed to match CONTAINER
            exactly, including past CONTAINER's own max-w-[88rem] where plain px-* alone
            drifts (CONTAINER centres itself on wide monitors; a full-bleed section needs
            the same centre-offset math, not just the same padding number). Which edge is
            outer flips with imageSide (the rtl trick on the grid above puts the DOM-second
            copy div on the right when imageLeft, on the left otherwise) — the inner edge,
            touching the image, just needs generous ad-hoc padding, not exact alignment. */}
        <div
          className={`flex flex-col justify-center gap-6 px-5 py-14 [direction:ltr] sm:px-8 md:py-20 ${
            imageLeft ? 'md:pr-container-bleed md:pl-12 lg:pl-16' : 'md:pl-container-bleed md:pr-12 lg:pr-16'
          }`}
        >
          {section.promoLabel && (
            <span className="w-fit bg-[var(--color-ink)] px-3 py-1.5 text-3xs font-medium tracking-hero text-[var(--color-paper)] uppercase">
              {section.promoLabel}
            </span>
          )}
          {section.header.eyebrow && <p className="eyebrow">{section.header.eyebrow}</p>}
          <h2 className="max-w-xl font-serif text-display-xl text-[var(--color-ink)]">
            {section.header.heading}
          </h2>
          {section.header.subheading && (
            <p className="max-w-md leading-relaxed text-[var(--color-ink-muted)]">{section.header.subheading}</p>
          )}
          {section.cta && (
            <Cta
              label={section.cta.label}
              href={section.cta.href}
              channelCode={channelCode}
              variant={section.cta.variant}
              openInNewTab={section.cta.openInNewTab ?? false}
              className="mt-2"
            />
          )}
        </div>
      </div>
    </section>
  );
}
