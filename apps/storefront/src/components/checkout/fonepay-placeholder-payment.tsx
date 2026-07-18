'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getMedusaConfig } from '@/lib/medusa/config';
import { initiatePaymentSessionAction, completeCartAction } from '@/lib/medusa/payment-actions';

/**
 * Nepal's payment method settles synchronously (see apps/medusa's fonepay-placeholder
 * module — it's an explicit placeholder, not a real Fonepay integration yet), so
 * there's no redirect or client SDK: starting the payment session and completing the
 * cart both happen in one click.
 */
export function FonepayPlaceholderPayment({ channelCode }: { channelCode: ChannelCode }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setError(null);

    const { paymentProviderId } = getMedusaConfig(channelCode);
    const sessionResult = await initiatePaymentSessionAction(channelCode, paymentProviderId);
    if (!sessionResult.success) {
      setError(sessionResult.message);
      setIsSubmitting(false);
      return;
    }

    const completeResult = await completeCartAction(channelCode);
    if (!completeResult.success) {
      setError(completeResult.message);
      setIsSubmitting(false);
      return;
    }

    router.push(routes.checkoutConfirmation(channelCode, completeResult.order.id));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-ink-muted)]">
        Cash/mobile payment on delivery — a real Fonepay integration is coming soon. Placing your order confirms it now.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={handlePlaceOrder}
        disabled={isSubmitting}
        className="w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Placing Order…' : 'Place Order'}
      </button>
    </div>
  );
}
