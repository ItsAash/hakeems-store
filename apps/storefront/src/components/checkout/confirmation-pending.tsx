'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 10;

/**
 * Stripe settles the order asynchronously via webhook (see apps/vendure's
 * StripeController), which can lag a second or two behind the browser's redirect back
 * from `stripe.confirmPayment`. Rather than prematurely showing "order confirmed" while
 * the order is still `ArrangingPayment`, this polls the server (via router.refresh(),
 * which re-runs the confirmation page's fetch) until the webhook lands and the parent
 * re-renders the real confirmation — or gives up after a few tries with a reassuring
 * message rather than an error, since the payment itself already succeeded on Stripe's
 * side by the time the customer sees this at all.
 */
export function ConfirmationPending() {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="eyebrow">Confirming Payment</p>
      <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Almost there…</h1>
      <p className="max-w-sm text-[var(--color-ink-muted)]">
        Your payment went through — we&apos;re just finishing up your order confirmation. This page will update
        automatically.
      </p>
    </div>
  );
}
