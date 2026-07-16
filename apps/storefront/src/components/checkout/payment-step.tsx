'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { transitionToArrangingPaymentAction } from '@/lib/vendure/actions';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { FonepayPlaceholderPayment } from '@/components/checkout/fonepay-placeholder-payment';

/** Orders must be in `ArrangingPayment` before any payment mutation is accepted —
 * this transitions it once on entering the step, then hands off to the
 * channel-specific payment method. */
export function PaymentStep({
  channelCode,
  orderState,
  orderCode,
}: {
  channelCode: ChannelCode;
  orderState: string;
  orderCode: string;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(orderState === 'ArrangingPayment');
  const [error, setError] = useState<string | null>(null);
  const hasRequestedTransition = useRef(false);

  useEffect(() => {
    if (isReady || hasRequestedTransition.current) return;
    hasRequestedTransition.current = true;
    transitionToArrangingPaymentAction(channelCode).then((result) => {
      if (result.success) {
        setIsReady(true);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
    // Runs once on mount to make the single state transition; the ref guard
    // survives React Strict Mode's mount/cleanup/mount double-invoke in dev.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Payment</h2>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : !isReady ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Preparing payment…</p>
      ) : channelCode === 'hongkong' ? (
        <StripePaymentForm channelCode={channelCode} orderCode={orderCode} />
      ) : (
        <FonepayPlaceholderPayment channelCode={channelCode} orderCode={orderCode} />
      )}
    </div>
  );
}
