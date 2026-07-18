'use client';

import { useEffect, useState } from 'react';
import type { Announcement } from '@/lib/strapi/types';

const ROTATE_MS = 5000;

export function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (announcements.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % announcements.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const current = announcements[index % announcements.length];
  if (!current) return null;

  return (
    <div
      className="relative flex items-center justify-center gap-1 bg-[var(--color-ink)] px-10 py-2 text-center text-3xs font-medium tracking-label text-[var(--color-paper)]/90 uppercase"
      aria-live="polite"
    >
      {current.href ? (
        <a href={current.href} className="truncate underline-offset-4 transition-colors duration-200 hover:text-[var(--color-paper)] hover:underline">
          {current.text}
        </a>
      ) : (
        <span className="truncate">{current.text}</span>
      )}
    </div>
  );
}
