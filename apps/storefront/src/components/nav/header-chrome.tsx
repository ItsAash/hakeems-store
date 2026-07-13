'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ChannelCode } from '@/lib/channel';

const SCROLL_THRESHOLD = 60;

/**
 * Owns the fixed positioning + transparent/solid background transition for the
 * header. AnnouncementBar and NavBar are Server Components rendered by the caller
 * and passed in as `children` — this wrapper never needs their data, only to sit
 * above them and drive color via CSS custom properties (`--nav-fg`, `--nav-fg-muted`)
 * that their own classes reference, so no scroll state has to be threaded through
 * server-rendered markup.
 *
 * Transparent-over-hero only applies on the channel's home route; every other route
 * (once Phase 6 adds them) gets the solid header from the first frame, and will need
 * top padding equal to this header's height since it's always `fixed`, never `sticky`.
 */
export function HeaderChrome({ channelCode, children }: { channelCode: ChannelCode; children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === `/${channelCode}`;
  const [scrolled, setScrolled] = useState(!isHome);

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

  const transparent = isHome && !scrolled;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
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
  );
}
