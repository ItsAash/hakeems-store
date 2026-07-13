'use client';

import { useEffect, useState } from 'react';
import type { Announcement } from '@/lib/strapi/types';

const ROTATE_MS = 5000;

export function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (announcements.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % announcements.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const current = announcements[index % announcements.length];
  if (!current) return null;

  return (
    <div className="relative flex items-center justify-center bg-[var(--color-ink)] px-10 py-2.5 text-center text-xs tracking-wide text-[var(--color-paper)]">
      {current.href ? (
        <a href={current.href} className="underline-offset-4 hover:underline">
          {current.text}
        </a>
      ) : (
        <span>{current.text}</span>
      )}
    </div>
  );
}
