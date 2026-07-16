'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { withChannel } from '@/lib/channel';
import type { HeroSlide } from '@/lib/strapi/types';
import { pickImageUrl } from '@/lib/strapi/client';
import { ArrowRightIcon } from '@/components/ui/icons';
import { CONTAINER } from '@/lib/ui';

const AUTOPLAY_MS = 5000;
const FADE_MS = 1000;

export function HeroSlider({
  slides,
  channelCode,
}: {
  slides: HeroSlide[];
  channelCode: ChannelCode;
}) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRef = useRef(0);

  // Keep a mutable ref in sync so the interval callback always reads fresh state
  currentRef.current = current;

  const goTo = useCallback(
    (target: number) => {
      if (fading) return;
      if (target === currentRef.current) return;
      setPrev(currentRef.current);
      setCurrent(target);
      setFading(true);
    },
    [fading],
  );

  // End the crossfade after the CSS transition finishes
  useEffect(() => {
    if (!fading) return;
    const t = setTimeout(() => {
      setPrev(null);
      setFading(false);
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [fading]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (slides.length < 2) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    stop();
    timerRef.current = setInterval(() => {
      goTo((currentRef.current + 1) % slides.length);
    }, AUTOPLAY_MS);
  }, [slides.length, goTo, stop]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  if (slides.length === 0) return null;

  return (
    <section
      className="group/hero relative h-dvh min-h-[420px] w-full overflow-hidden bg-[var(--color-ink)]"
      // onMouseEnter={stop}
      onMouseLeave={start}
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {/* ── Slide layers ─────────────────────────────────────────── */}
      {slides.map((slide, i) => {
        const isActive = i === current;
        const isExiting = i === prev;

        /*
         * Crossfade z-index strategy (no horizontal movement):
         *   active  → z-20, opacity 0→1  (CSS transition handles the fade-in)
         *   exiting → z-10, opacity 1     (stays fully visible underneath — no transition)
         *   other   → z-0,  opacity 0     (instantly hidden)
         */
        const style: React.CSSProperties = isActive
          ? { zIndex: 20, transition: `opacity ${FADE_MS}ms ease-in-out` }
          : isExiting
            ? { opacity: 1, zIndex: 10, transition: 'none' }
            : { opacity: 0, zIndex: 0, transition: 'none', pointerEvents: 'none' };

        const desktopUrl = pickImageUrl(slide.image, ['large', 'medium']);
        const mobileUrl = slide.imageMobile
          ? pickImageUrl(slide.imageMobile, ['medium', 'small'])
          : null;

        return (
          <div
            key={slide.id}
            className="absolute inset-0"
            style={style}
            aria-hidden={!isActive}
          >
            {/* Image — Ken Burns pauses when hidden, no remounting */}
            <div
              className="animate-hero-kenburns h-full w-full"
              style={{
                animationDuration: '12s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDirection: 'alternate',
                animationPlayState: isActive ? 'running' : 'paused',
              }}
            >
              <picture>
                {mobileUrl && (
                  <source media="(max-width: 767px)" srcSet={mobileUrl} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={desktopUrl}
                  alt={slide.alt ?? ''}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                />
              </picture>
            </div>

            {/* Per-slide overlays — crossfade naturally with the slide,
                no separate layer that could desync */}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Text content — inset via the shared CONTAINER rhythm so the heading's
                left edge lines up with the nav logo and every section below it */}
            <div className="absolute inset-x-0 bottom-0 pb-20 md:pb-28">
              <div className={`flex flex-col items-start gap-4 ${CONTAINER}`}>
                {/* First slide carries the page's single H1 (it's the most prominent heading on
                    the home page); subsequent slides are H2s to keep the outline valid. */}
                {(() => {
                  const HeadingTag = i === 0 ? 'h1' : 'h2';
                  return (
                    <HeadingTag className="max-w-2xl font-serif text-4xl leading-[1.05] text-[var(--color-paper)] md:text-7xl">
                      {slide.heading}
                    </HeadingTag>
                  );
                })()}
                {slide.subheading && (
                  <p className="max-w-md text-sm leading-relaxed text-[var(--color-paper)]/70 md:text-base">
                    {slide.subheading}
                  </p>
                )}
                {slide.ctaLabel && slide.ctaHref && (
                  <Link
                    href={withChannel(channelCode, slide.ctaHref)}
                    /* ── Filled button (clean, premium, high contrast) ── */
                    className="group/cta mt-2 inline-flex items-center gap-3 bg-[var(--color-paper)] px-8 py-4 text-[11px] font-medium tracking-[0.2em] uppercase text-[var(--color-ink)] transition-all duration-300 hover:bg-[var(--color-paper)]/90"
                  /* ── Alternative: refined outline ── */
                  // className="group/cta mt-2 inline-flex items-center gap-3 rounded-sm border border-[var(--color-paper)]/40 px-8 py-4 text-[11px] font-medium tracking-[0.2em] uppercase text-[var(--color-paper)] transition-all duration-500 hover:border-[var(--color-paper)]/80 hover:bg-[var(--color-paper)]/10"
                  >
                    {slide.ctaLabel}
                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Navigation ───────────────────────────────────────────── */}
      {slides.length > 1 && (
        <>
          {/* Chevron arrows — appear on hover over the hero */}
          <button
            type="button"
            onClick={() =>
              goTo(
                (currentRef.current - 1 + slides.length) % slides.length,
              )
            }
            aria-label="Previous slide"
            className="absolute left-5 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/20 p-2.5 text-[var(--color-paper)] opacity-0 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-black/40 group-hover/hero:opacity-100 md:left-8"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo((currentRef.current + 1) % slides.length)}
            aria-label="Next slide"
            className="absolute right-5 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/20 p-2.5 text-[var(--color-paper)] opacity-0 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-black/40 group-hover/hero:opacity-100 md:right-8"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Dot indicators — thin bars, current expands */}
          <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 gap-2.5">
            {slides.map((slide, i) => {
              const isCurrent = i === current;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`h-[2px] rounded-full transition-all duration-500 ease-out ${isCurrent
                    ? 'w-8 bg-[var(--color-paper)]'
                    : 'w-2 bg-[var(--color-paper)]/30 hover:bg-[var(--color-paper)]/50'
                    }`}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}