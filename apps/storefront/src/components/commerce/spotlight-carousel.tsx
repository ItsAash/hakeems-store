'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { withChannel, type ChannelCode } from '@/lib/channel';
import type { ProductCardModel } from '@/lib/medusa/product-card';
import { ProductCard } from '@/components/commerce/product-card';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';

/** Cards visible at once on desktop — beyond this, the rail pages through the rest
 * in groups rather than growing the grid (a long single-row/wrapped grid of every
 * product was the "super bad" layout this replaces). */
const VISIBLE_ON_DESKTOP = 4;
const AUTOPLAY_INTERVAL_MS = 4000;

type SpotlightCarouselProps = {
  cards: ProductCardModel[];
  channelCode: ChannelCode;
  eyebrow: string | null;
  heading: string;
  paragraph: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** Auto-page the track every few seconds (wraps to the start at the end). Pauses while
   * hovered/focused and is disabled entirely under prefers-reduced-motion. */
  autoplay?: boolean;
};

/**
 * Full-width "New Arrivals"-style rail (athleta.gap.com is the reference): a header
 * row carrying the eyebrow/heading/copy on the left and a "shop all" link + paging
 * arrows on the right, then a native-scrolling, scroll-snapped card track below.
 * Paging is native smooth scroll (`scrollBy`), not a transform/state-driven slide —
 * fewer moving parts, and touch/trackpad users get free momentum scrolling alongside
 * the arrow buttons.
 */
export function SpotlightCarousel({
  cards,
  channelCode,
  eyebrow,
  heading,
  paragraph,
  ctaLabel,
  ctaHref,
  autoplay = false,
}: SpotlightCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateScrollState = () => {
      setCanScrollPrev(track.scrollLeft > 4);
      setCanScrollNext(track.scrollLeft < track.scrollWidth - track.clientWidth - 4);
    };

    updateScrollState();
    track.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [cards.length]);

  const scrollByPage = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * trackRef.current.clientWidth, behavior: 'smooth' });
  };

  const canPage = cards.length > VISIBLE_ON_DESKTOP;

  // Autoplay — plain interval over the same native-scroll paging as the arrows; wraps to
  // the start at the end of the track. Hover/focus pause and reduced-motion opt-out keep
  // it from fighting the user.
  useEffect(() => {
    if (!autoplay || !canPage || isPaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
      }
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoplay, canPage, isPaused]);

  return (
    <div
      onMouseEnter={autoplay ? () => setIsPaused(true) : undefined}
      onMouseLeave={autoplay ? () => setIsPaused(false) : undefined}
      onFocus={autoplay ? () => setIsPaused(true) : undefined}
      onBlur={autoplay ? () => setIsPaused(false) : undefined}
    >
      <div className="mb-8 flex items-end justify-between gap-6 md:mb-10">
        <div className="flex max-w-xl flex-col gap-4">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="font-serif text-display-lg text-[var(--color-ink)]">{heading}</h2>
          {paragraph && <p className="text-[var(--color-ink-muted)]">{paragraph}</p>}
        </div>

        <div className="hidden shrink-0 items-center gap-6 md:flex">
          {ctaLabel && ctaHref && (
            <Link
              href={withChannel(channelCode, ctaHref)}
              className="border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
            >
              {ctaLabel}
            </Link>
          )}
          {canPage && (
            <div className="flex items-center gap-2">
              <CarouselArrowButton direction="prev" disabled={!canScrollPrev} onClick={() => scrollByPage(-1)} />
              <CarouselArrowButton direction="next" disabled={!canScrollNext} onClick={() => scrollByPage(1)} />
            </div>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        // px-* gives the overflow clip box slack so a leftmost card's selected-swatch ring
        // isn't shaved; the matching -mx-* cancels it so the track still aligns to the grid.
        // Values mirror the CONTAINER gutters (px-5 sm:px-8 lg:px-12 — lib/ui.ts).
        className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 py-1 sm:-mx-8 sm:px-8 md:gap-5 lg:-mx-1 lg:px-1"
      >
        {cards.map((card) => (
          <div
            key={card.productId}
            className="shrink-0 snap-start basis-[78%] sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(25%-0.9375rem)]"
          >
            <ProductCard card={card} channelCode={channelCode} showQuickAdd />
          </div>
        ))}
      </div>

      {ctaLabel && ctaHref && (
        <Link
          href={withChannel(channelCode, ctaHref)}
          className="mt-6 inline-flex border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70 md:hidden"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

function CarouselArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'prev' ? ArrowLeftIcon : ArrowRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous products' : 'Next products'}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-ink)]/15 text-[var(--color-ink)] transition-colors duration-300 hover:border-[var(--color-ink)] disabled:opacity-30 disabled:hover:border-[var(--color-ink)]/15"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
