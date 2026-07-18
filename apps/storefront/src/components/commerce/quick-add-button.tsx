'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ChannelCode } from '@/lib/channel';
import { addItemToCartAction } from '@/lib/medusa/cart-actions';
import { requestCartOpen } from '@/lib/cart-events';
import { PlusIcon, CheckIcon } from '@/components/ui/icons';

type Status = 'idle' | 'loading' | 'added' | 'error';

/**
 * Adds the given variant via a real addItemToCart mutation (Server Action, see
 * lib/medusa/cart-actions.ts) — not a UI shell. On success, refreshes the route so the
 * server-rendered nav cart badge picks up the new total; there's no separate client
 * cart store to keep in sync (see STOREFRONT_PLAN.md §3.2).
 */
export function QuickAddButton({ channelCode, variantId }: { channelCode: ChannelCode; variantId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');

  const handleClick = async () => {
    setStatus('loading');
    const result = await addItemToCartAction(channelCode, variantId, 1);
    if (result.success) {
      setStatus('added');
      router.refresh();
      requestCartOpen();
      setTimeout(() => setStatus('idle'), 1800);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 1800);
    }
  };

  const label =
    status === 'added' ? 'Added' : status === 'error' ? 'Try Again' : status === 'loading' ? 'Adding…' : 'Quick Add';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        void handleClick();
      }}
      disabled={status === 'loading'}
      aria-label="Quick add to cart"
      className="flex w-full items-center justify-center gap-2 bg-[var(--color-paper)]/95 py-3.5 text-3xs font-medium tracking-cta text-[var(--color-ink)] uppercase backdrop-blur transition-colors duration-200 hover:bg-[var(--color-paper)] disabled:opacity-60"
    >
      {status === 'added' ? <CheckIcon className="h-3.5 w-3.5" /> : status === 'idle' ? <PlusIcon className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}
