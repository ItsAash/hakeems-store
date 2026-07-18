'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { initiatePaymentSessionAction, completeCartAction } from '@/lib/medusa/payment-actions';
import { getMedusaConfig } from '@/lib/medusa/config';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/**
 * Hong Kong's payment method (see apps/medusa's `@medusajs/medusa/payment-stripe`
 * provider, registered as "pp_stripe_stripe"). Starts a payment session via
 * `initiatePaymentSessionAction`, mounts Stripe's PaymentElement with the session's
 * client secret, then confirms. Unlike Vendure (which created the order up front and
 * settled it via webhook), Medusa only creates the order once `cart.complete()` is
 * called — so a successful confirmPayment is followed by completeCartAction here,
 * client-side, before navigating to the confirmation page.
 */
export function StripePaymentForm({ channelCode }: { channelCode: ChannelCode }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { paymentProviderId } = getMedusaConfig(channelCode);
    initiatePaymentSessionAction(channelCode, paymentProviderId).then((result) => {
      if (cancelled) return;
      if (result.success) setClientSecret(result.clientSecret);
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [channelCode]);

  if (!publishableKey || !stripePromise) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        Stripe isn&apos;t configured yet — set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (storefront) and STRIPE_SECRET_KEY
        (Medusa) to enable card payment.
      </p>
    );
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!clientSecret) return <p className="text-sm text-[var(--color-ink-muted)]">Preparing payment…</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeCheckoutForm channelCode={channelCode} />
    </Elements>
  );
}

function StripeCheckoutForm({ channelCode }: { channelCode: ChannelCode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = async () => {
    const result = await completeCartAction(channelCode);
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }
    router.push(routes.checkoutConfirmation(channelCode, result.order.id));
  };

  // Stripe redirected back here after an off-site 3DS/bank challenge (the `if_required`
  // mode below only avoids a redirect when the payment method doesn't need one) —
  // `redirect_status` on the return URL tells us how it went.
  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    if (redirectStatus === 'succeeded') {
      setIsSubmitting(true);
      placeOrder();
    } else if (redirectStatus === 'failed') {
      setError('Payment failed. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      // Absolute URL required: Stripe may need to redirect out to a bank/3DS page and
      // back — the checkout page re-renders this same payment step on return, where
      // the effect above picks up `redirect_status` from the query string.
      confirmParams: { return_url: `${window.location.origin}${routes.checkout(channelCode)}` },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    // No off-site redirect was needed (e.g. a card that didn't require 3DS) — Stripe
    // resolved in place, so place the order ourselves.
    await placeOrder();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || isSubmitting}
        className="mt-2 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Processing…' : 'Pay Now'}
      </button>
    </form>
  );
}
