'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';

const SCROLL_THRESHOLD = 60;

// Deterministic header heights used to reserve the spacer on the very first (server-rendered)
// paint, before the ResizeObserver has measured the live element — this is what prevents the
// content jump (CLS) that a spacer starting at height 0 would cause. NavBar is `h-16` on
// mobile / `h-20` on lg (the mobile value is the first-paint guess; the observer corrects
// desktop within a frame); the announcement bar is `py-2` + `text-3xs` (≈30px), only
// present when authored.
const NAV_HEIGHT = 64;
const ANNOUNCEMENT_HEIGHT = 30;

/**
 * Owns the fixed positioning + transparent/solid background transition for the
 * header. AnnouncementBar and NavBar are Server Components rendered by the caller
 * and passed in as `children` — this wrapper never needs their data, only to sit
 * above them and drive color via CSS custom properties (`--nav-fg`, `--nav-fg-muted`)
 * that their own classes reference, so no scroll state has to be threaded through
 * server-rendered markup.
 *
 * Transparent-over-hero only applies on the channel's home route, where the hero sits
 * behind the header by design. Every other route gets the solid header from the first
 * frame and — since the header is always `fixed`, never `sticky` — a spacer of matching
 * height is rendered below it so content (e.g. the PDP image) is never hidden underneath.
 * The spacer measures the live header (nav + optional announcement bar) so it stays
 * correct whether or not announcements are showing.
 */
export function HeaderChrome({
  channelCode,
  hasAnnouncement = false,
  children,
}: {
  channelCode: ChannelCode;
  /** Whether the announcement bar is rendered — lets the spacer reserve the right height on
   *  the first paint (server-side) instead of starting at 0 and jumping after measurement. */
  hasAnnouncement?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === routes.home(channelCode);
  const [scrolled, setScrolled] = useState(!isHome);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(NAV_HEIGHT + (hasAnnouncement ? ANNOUNCEMENT_HEIGHT : 0));

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const transparent = isHome && !scrolled;

  return (
    <>
      <div
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-30 transition-[background-color,box-shadow,border-color] duration-500 ease-out ${
          transparent
            ? 'border-b border-transparent bg-transparent'
            : 'border-b hairline bg-[var(--color-paper)]/95 backdrop-blur'
        }`}
        style={
          {
            '--nav-fg': transparent ? '#ffffff' : 'var(--color-ink)',
            '--nav-fg-muted': transparent ? 'rgba(255,255,255,0.8)' : 'var(--color-ink-muted)',
          } as React.CSSProperties
        }
      >
        {children}
      </div>
      {/* Offsets the fixed header on every non-home route so content isn't hidden beneath it. */}
      {!isHome && <div aria-hidden style={{ height: headerHeight }} />}
    </>
  );
}
