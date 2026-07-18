'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { adjustCartLineAction, removeCartLineAction } from '@/lib/medusa/cart-actions';
import { formatPrice } from '@/lib/format';
import { CloseIcon } from '@/components/ui/icons';

export type CartLine = {
  id: string;
  quantity: number;
  linePriceWithTax: number;
  currencyCode: string;
  imageUrl: string | null;
  productName: string;
  productSlug: string;
  variantLabel: string | null;
};

type OptimisticState = { quantity: number; removed: boolean };

/**
 * One cart line with optimistic quantity/remove: the UI updates the instant the button is
 * pressed, the server action + router.refresh() reconcile in the background, and React
 * rolls the optimistic state back automatically if the action fails (surfaced via the
 * error line). The line price is scaled locally as an estimate — the refresh brings the
 * authoritative total (promotions, stock clamps) right after.
 */
export function CartLineItem({ line, channelCode }: { line: CartLine; channelCode: ChannelCode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, applyOptimistic] = useOptimistic(
    { quantity: line.quantity, removed: false } satisfies OptimisticState,
    (state: OptimisticState, update: Partial<OptimisticState>) => ({ ...state, ...update }),
  );

  const unitPrice = line.quantity > 0 ? line.linePriceWithTax / line.quantity : 0;
  const displayPrice = Math.round(unitPrice * optimistic.quantity);

  const handleQuantityChange = (nextQuantity: number) => {
    if (nextQuantity < 1 || isPending) return;
    setError(null);
    startTransition(async () => {
      applyOptimistic({ quantity: nextQuantity });
      const result = await adjustCartLineAction(channelCode, line.id, nextQuantity);
      if (!result.success) setError(result.message);
      router.refresh();
    });
  };

  const handleRemove = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      applyOptimistic({ removed: true });
      const result = await removeCartLineAction(channelCode, line.id);
      if (!result.success) setError(result.message);
      router.refresh();
    });
  };

  if (optimistic.removed) return null;

  return (
    <div className="flex gap-4 border-b hairline py-6">
      <Link href={routes.product(channelCode, line.productSlug)} className="relative block h-28 w-24 shrink-0 overflow-hidden bg-[var(--color-hairline)]">
        {line.imageUrl && (
          <Image src={line.imageUrl} alt={line.productName} fill sizes="96px" className="object-cover" />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={routes.product(channelCode, line.productSlug)} className="text-sm font-medium text-[var(--color-ink)]">
              {line.productName}
            </Link>
            {line.variantLabel && <p className="text-xs text-[var(--color-ink-muted)]">{line.variantLabel}</p>}
          </div>
          {/* after:-inset-* pseudo-elements expand each control's hit area to ~44px without
              growing the visual footprint (WCAG 2.5.8 target size). */}
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove item"
            className="relative text-[var(--color-ink-muted)] transition-colors after:absolute after:-inset-3 hover:text-[var(--color-ink)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center border border-[var(--color-hairline)]">
            <button
              type="button"
              onClick={() => handleQuantityChange(optimistic.quantity - 1)}
              disabled={optimistic.quantity <= 1}
              aria-label="Decrease quantity"
              className="relative flex h-8 w-8 items-center justify-center text-[var(--color-ink)] after:absolute after:-inset-y-2 after:inset-x-0 disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center text-sm text-[var(--color-ink)]" aria-live="polite">
              {optimistic.quantity}
            </span>
            <button
              type="button"
              onClick={() => handleQuantityChange(optimistic.quantity + 1)}
              aria-label="Increase quantity"
              className="relative flex h-8 w-8 items-center justify-center text-[var(--color-ink)] after:absolute after:-inset-y-2 after:inset-x-0"
            >
              +
            </button>
          </div>
          <p className="text-sm text-[var(--color-ink)]">{formatPrice(displayPrice, line.currencyCode)}</p>
        </div>
      </div>
    </div>
  );
}
