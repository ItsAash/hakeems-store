'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { BagIcon, CloseIcon } from '@/components/ui/icons';
import { Portal } from '@/components/ui/portal';

/**
 * Phase 2 owns the icon, live count, and open/close shell. The drawer body here is a
 * placeholder — Phase 6 replaces it with real line items, quantity controls, and the
 * addItemToOrder/adjustOrderLine mutations wired to the same activeOrder this count
 * comes from.
 */
export function CartWidget({ initialCount, channelCode }: { initialCount: number; channelCode: ChannelCode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Cart, ${initialCount} item${initialCount === 1 ? '' : 's'}`}
        className="relative text-[var(--nav-fg)]"
      >
        <BagIcon className="h-5 w-5" />
        {initialCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-medium text-[var(--color-paper)]">
            {initialCount}
          </span>
        )}
      </button>

      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close cart"
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-[var(--color-ink)]/40"
            />
            <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-[var(--color-paper-raised)] shadow-xl">
              <div className="flex items-center justify-between border-b hairline px-6 py-5">
                <h2 className="text-sm tracking-wide uppercase">Cart ({initialCount})</h2>
                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close cart">
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--color-ink-muted)]">
                {initialCount > 0 ? 'Your cart — full line items are coming in the next phase.' : 'Your cart is empty.'}
              </div>
              <div className="border-t hairline p-6">
                <Link
                  href={`/${channelCode}/cart`}
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center bg-[var(--color-ink)] px-6 py-3 text-sm tracking-wide text-[var(--color-paper)] uppercase hover:opacity-90"
                >
                  View Cart
                </Link>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
