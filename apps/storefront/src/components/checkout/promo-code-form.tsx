'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { applyPromoCodeAction, removePromoCodeAction } from '@/lib/medusa/checkout-actions';
import { CloseIcon } from '@/components/ui/icons';

/**
 * Coupon entry + the currently applied codes, backed by Medusa's addPromotions /
 * removePromotions cart endpoints. Invalid/expired codes surface an inline error;
 * a successful apply refreshes the route so every total (summary, cart badge) updates.
 */
export function PromoCodeForm({
  channelCode,
  appliedCouponCodes,
}: {
  channelCode: ChannelCode;
  appliedCouponCodes: string[];
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const apply = () => {
    const trimmed = code.trim();
    if (!trimmed || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await applyPromoCodeAction(channelCode, trimmed);
      if (result.success) {
        setCode('');
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  const remove = (couponCode: string) => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      await removePromoCodeAction(channelCode, couponCode);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
        className="flex gap-2"
      >
        <label htmlFor="promo-code" className="sr-only">
          Promo code
        </label>
        <input
          id="promo-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Promo code"
          autoComplete="off"
          className="min-w-0 flex-1 border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)]"
        />
        <button
          type="submit"
          disabled={isPending || !code.trim()}
          className="border border-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-ink)]"
        >
          {isPending ? 'Applying…' : 'Apply'}
        </button>
      </form>

      {error && <p className="text-xs text-danger">{error}</p>}

      {appliedCouponCodes.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {appliedCouponCodes.map((couponCode) => (
            <li key={couponCode}>
              <button
                type="button"
                onClick={() => remove(couponCode)}
                aria-label={`Remove promo code ${couponCode}`}
                className="flex items-center gap-1.5 border border-[var(--color-hairline)] bg-[var(--color-paper-raised)] py-1 pr-2 pl-3 text-xs tracking-wide text-[var(--color-ink)] uppercase transition-colors hover:border-[var(--color-ink)]"
              >
                {couponCode}
                <CloseIcon className="h-3 w-3 text-[var(--color-ink-muted)]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
