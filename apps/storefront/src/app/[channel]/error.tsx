'use client';

import { useEffect } from 'react';
import { CONTAINER } from '@/lib/ui';

/**
 * Channel-level error boundary: a Vendure or Strapi outage degrades to a styled,
 * recoverable message inside the existing nav/footer chrome (the [channel] layout stays
 * mounted) instead of a white screen.
 */
export default function ChannelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[storefront] route error:', error);
  }, [error]);

  return (
    <main className={`flex flex-1 flex-col items-start gap-5 py-section ${CONTAINER}`}>
      <p className="eyebrow">Something went wrong</p>
      <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">
        We couldn&rsquo;t load this page.
      </h1>
      <p className="max-w-md text-sm text-[var(--color-ink-muted)]">
        It&rsquo;s likely temporary. Try again in a moment — your cart and account are unaffected.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex items-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 text-sm font-medium tracking-wide text-[var(--color-paper)] transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
