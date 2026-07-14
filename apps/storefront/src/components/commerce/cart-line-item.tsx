'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { adjustOrderLineAction, removeOrderLineAction } from '@/lib/vendure/actions';
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

export function CartLineItem({ line, channelCode }: { line: CartLine; channelCode: ChannelCode }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuantityChange = async (nextQuantity: number) => {
    if (nextQuantity < 1) return;
    setIsUpdating(true);
    await adjustOrderLineAction(channelCode, line.id, nextQuantity);
    router.refresh();
    setIsUpdating(false);
  };

  const handleRemove = async () => {
    setIsUpdating(true);
    await removeOrderLineAction(channelCode, line.id);
    router.refresh();
  };

  return (
    <div className={`flex gap-4 border-b hairline py-6 transition-opacity ${isUpdating ? 'opacity-50' : ''}`}>
      <Link href={routes.product(channelCode, line.productSlug)} className="block h-28 w-24 shrink-0 overflow-hidden bg-[var(--color-hairline)]">
        {line.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={line.imageUrl} alt={line.productName} className="h-full w-full object-cover" />
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
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUpdating}
            aria-label="Remove item"
            className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center border border-[var(--color-hairline)]">
            <button
              type="button"
              onClick={() => handleQuantityChange(line.quantity - 1)}
              disabled={isUpdating}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 items-center justify-center text-[var(--color-ink)] disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center text-sm text-[var(--color-ink)]">{line.quantity}</span>
            <button
              type="button"
              onClick={() => handleQuantityChange(line.quantity + 1)}
              disabled={isUpdating}
              aria-label="Increase quantity"
              className="flex h-8 w-8 items-center justify-center text-[var(--color-ink)] disabled:opacity-40"
            >
              +
            </button>
          </div>
          <p className="text-sm text-[var(--color-ink)]">{formatPrice(line.linePriceWithTax, line.currencyCode)}</p>
        </div>
      </div>
    </div>
  );
}
