'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { addFonepayPlaceholderPaymentAction } from '@/lib/vendure/actions';

/**
 * Nepal's payment method settles synchronously (see fonepay-placeholder.handler.ts —
 * it's an explicit placeholder Vendure-side, not a real Fonepay integration yet), so
 * there's no redirect or client SDK: one mutation call places the order.
 */
export function FonepayPlaceholderPayment({ channelCode, orderCode }: { channelCode: ChannelCode; orderCode: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await addFonepayPlaceholderPaymentAction(channelCode);
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    router.push(routes.checkoutConfirmation(channelCode, result.orderCode ?? orderCode));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-ink-muted)]">
        Cash/mobile payment on delivery — a real Fonepay integration is coming soon. Placing your order confirms it now.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
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
