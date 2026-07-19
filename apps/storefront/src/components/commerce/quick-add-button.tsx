'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ChannelCode } from '@/lib/channel';
import type { CardSizeVariant } from '@/lib/medusa/product-card';
import { addItemToCartAction } from '@/lib/medusa/cart-actions';
import { requestCartOpen } from '@/lib/cart-events';
import { CheckIcon, PlusIcon } from '@/components/ui/icons';

type Status = 'idle' | 'sizes' | 'loading' | 'added' | 'error';

const BAR_CLASS =
  'flex w-full items-center justify-center gap-2 bg-[var(--color-paper)]/95 py-3.5 text-3xs font-medium tracking-cta text-[var(--color-ink)] uppercase backdrop-blur transition-colors duration-200 hover:bg-[var(--color-paper)]';

/**
 * Size-aware quick add (the slide-up bar on product cards). One-size products add
 * immediately; sized products expand into a size row first — silently adding an
 * arbitrary size is never acceptable for apparel. Adds via the real addItemToCart
 * Server Action; success refreshes the route (server-rendered nav badge) and opens
 * the cart drawer.
 */
export function QuickAddButton({
  channelCode,
  sizeVariants,
}: {
  channelCode: ChannelCode;
  sizeVariants: CardSizeVariant[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');

  const buyable = sizeVariants.filter((sv) => sv.inStock);
  const isOneSize = sizeVariants.length <= 1;

  const add = async (variantId: string) => {
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

  if (buyable.length === 0) return null;

  if (status === 'sizes') {
    return (
      <div
        className="flex w-full items-stretch bg-[var(--color-paper)]/95 backdrop-blur"
        role="group"
        aria-label="Select a size"
        onMouseLeave={() => setStatus('idle')}
      >
        {sizeVariants.map((sv) => (
          <button
            key={sv.variantId}
            type="button"
            disabled={!sv.inStock}
            onClick={(event) => {
              event.preventDefault();
              void add(sv.variantId);
            }}
            className="flex-1 py-3.5 text-3xs font-medium tracking-label text-[var(--color-ink)] uppercase transition-colors duration-200 hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] disabled:text-[var(--color-ink-muted)]/40 disabled:line-through disabled:hover:bg-transparent"
          >
            {sv.size}
          </button>
        ))}
      </div>
    );
  }

  const label =
    status === 'added' ? 'Added' : status === 'error' ? 'Try Again' : status === 'loading' ? 'Adding…' : 'Quick Add';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        if (status !== 'idle') return;
        if (isOneSize) void add(buyable[0]!.variantId);
        else setStatus('sizes');
      }}
      disabled={status === 'loading'}
      aria-label={isOneSize ? 'Quick add to cart' : 'Quick add — choose a size'}
      aria-haspopup={isOneSize ? undefined : 'true'}
      className={`${BAR_CLASS} disabled:opacity-60`}
    >
      {status === 'added' ? <CheckIcon className="h-3.5 w-3.5" /> : status === 'idle' ? <PlusIcon className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}
