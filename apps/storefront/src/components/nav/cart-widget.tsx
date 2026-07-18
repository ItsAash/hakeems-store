'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { onCartOpenRequest } from '@/lib/cart-events';
import { formatPrice } from '@/lib/format';
import { BagIcon, CloseIcon, LockIcon } from '@/components/ui/icons';
import { Overlay } from '@/components/ui/overlay';
import { CartLineItem, type CartLine } from '@/components/commerce/cart-line-item';

export function CartWidget({
  initialCount,
  initialLines,
  subTotalWithTax,
  currencyCode,
  channelCode,
}: {
  initialCount: number;
  initialLines: CartLine[];
  subTotalWithTax: number;
  currencyCode: string;
  channelCode: ChannelCode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  // Adding to cart anywhere on the page (PDP buy box, quick-add) opens the drawer so the
  // shopper sees the result and the checkout path immediately.
  useEffect(() => onCartOpenRequest(() => setIsOpen(true)), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Cart, ${initialCount} item${initialCount === 1 ? '' : 's'}`}
        aria-haspopup="dialog"
        className="relative text-[var(--nav-fg)] after:absolute after:-inset-3"
      >
        <BagIcon className="h-5 w-5" />
        {initialCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-medium text-[var(--color-paper)]">
            {initialCount}
          </span>
        )}
      </button>

      <Overlay
        open={isOpen}
        onClose={close}
        label="Cart"
        panelClassName="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-[var(--color-paper-raised)] shadow-xl"
        panelClosedClassName="translate-x-full"
        panelOpenClassName="translate-x-0"
      >
        <div className="flex items-center justify-between border-b hairline px-6 py-5">
          <h2 className="text-sm tracking-wide uppercase">Cart ({initialCount})</h2>
          <button type="button" onClick={close} aria-label="Close cart" className="relative after:absolute after:-inset-3">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {initialLines.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--color-ink-muted)]">
            Your cart is empty.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6">
            {initialLines.map((line) => (
              <CartLineItem key={line.id} line={line} channelCode={channelCode} />
            ))}
          </div>
        )}

        <div className="border-t hairline p-6">
          {initialLines.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink-muted)]">Subtotal</span>
                <span className="text-[var(--color-ink)]">{formatPrice(subTotalWithTax, currencyCode)}</span>
              </div>
              <Link
                href={routes.checkout(channelCode)}
                onClick={close}
                className="flex w-full items-center justify-center bg-[var(--color-ink)] px-6 py-3.5 text-sm tracking-wide text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90"
              >
                Checkout
              </Link>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
                <LockIcon className="h-3 w-3" aria-hidden />
                Secure checkout · {channelCode === 'hongkong' ? 'Stripe' : 'Fonepay'} · Free returns within 30 days
              </p>
            </>
          )}
          <Link
            href={routes.cart(channelCode)}
            onClick={close}
            className={`flex w-full items-center justify-center text-sm tracking-wide uppercase transition-opacity ${
              initialLines.length > 0
                ? 'mt-3 border border-[var(--color-ink)] px-6 py-3 text-[var(--color-ink)] hover:opacity-70'
                : 'bg-[var(--color-ink)] px-6 py-3 text-[var(--color-paper)] hover:opacity-90'
            }`}
          >
            View Cart
          </Link>
        </div>
      </Overlay>
    </>
  );
}
