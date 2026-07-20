'use client';

import Link from 'next/link';
import { useOptionalChannel } from '@/lib/channel-context';
import { routes } from '@/lib/routes';
import { CONTAINER } from '@/lib/ui';

/**
 * Renders inside app/[channel]/layout.tsx's `children` slot, so it keeps the site's
 * nav/footer chrome for a bad slug — unlike the root not-found.tsx, which has no
 * channel context. Channel is optional here (not just absent-and-throwing) because an
 * *invalid* `[channel]` segment triggers notFound() from the layout itself, before
 * ChannelProvider ever mounts — that case still needs to render something.
 */
export default function NotFound() {
  const channel = useOptionalChannel();

  return (
    <main className={`flex flex-1 flex-col items-center justify-center gap-4 py-section text-center ${CONTAINER}`}>
      <p className="eyebrow">404</p>
      <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Page not found</h1>
      <p className="max-w-sm text-sm text-[var(--color-ink-muted)]">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        href={channel ? routes.home(channel.code) : '/'}
        className="mt-2 border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
      >
        Back to Lopho
      </Link>
    </main>
  );
}
