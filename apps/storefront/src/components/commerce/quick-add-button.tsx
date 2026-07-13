'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ChannelCode } from '@/lib/channel';
import { addItemToOrderAction } from '@/lib/vendure/actions';
import { PlusIcon, CheckIcon } from '@/components/ui/icons';

type Status = 'idle' | 'loading' | 'added' | 'error';

/**
 * Adds the given variant via a real addItemToOrder mutation (Server Action, see
 * lib/vendure/actions.ts) — not a UI shell. On success, refreshes the route so the
 * server-rendered nav cart badge picks up the new total; there's no separate client
 * cart store to keep in sync (see STOREFRONT_PLAN.md §3.2).
 */
export function QuickAddButton({ channelCode, variantId }: { channelCode: ChannelCode; variantId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');

  const handleClick = async () => {
    setStatus('loading');
    const result = await addItemToOrderAction(channelCode, variantId, 1);
    if (result.success) {
      setStatus('added');
      router.refresh();
      setTimeout(() => setStatus('idle'), 1800);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 1800);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'loading'}
      aria-label="Quick add to cart"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-ink)]/15 bg-[var(--color-paper-raised)] text-[var(--color-ink)] transition-colors duration-300 hover:border-[var(--color-ink)] disabled:opacity-50"
    >
      {status === 'added' ? (
        <CheckIcon className="h-4 w-4" />
      ) : status === 'error' ? (
        <span className="text-sm leading-none">!</span>
      ) : (
        <PlusIcon className="h-4 w-4" />
      )}
    </button>
  );
}
