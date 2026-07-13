'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { ChannelCode } from '@/lib/channel';
import { createStripePaymentIntentAction } from '@/lib/vendure/actions';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/**
 * Hong Kong's payment method (see apps/vendure "hongkong-stripe" PaymentMethod).
 * Follows Vendure's documented Stripe flow: create a PaymentIntent server-side via
 * `createStripePaymentIntent`, mount Stripe's PaymentElement with the client secret,
 * then confirm. Vendure's own webhook (/payments/stripe) settles the order
 * asynchronously once Stripe confirms — this component only has to get the customer
 * to a successful `confirmPayment` call.
 */
export function StripePaymentForm({ channelCode, orderCode }: { channelCode: ChannelCode; orderCode: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createStripePaymentIntentAction(channelCode).then((result) => {
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
        (Vendure) to enable card payment.
      </p>
    );
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!clientSecret) return <p className="text-sm text-[var(--color-ink-muted)]">Preparing payment…</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeCheckoutForm channelCode={channelCode} orderCode={orderCode} />
    </Elements>
  );
}

function StripeCheckoutForm({ channelCode, orderCode }: { channelCode: ChannelCode; orderCode: string }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setError(null);

    const confirmationPath = `/${channelCode}/checkout/confirmation?code=${orderCode}`;

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      // Absolute URL required: Stripe may need to redirect out to a bank/3DS page
      // and back, so a relative path isn't enough here (unlike our own router.push
      // calls elsewhere, which never leave the app).
      confirmParams: { return_url: `${window.location.origin}${confirmationPath}` },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    // No off-site redirect was needed (e.g. a card that didn't require 3DS) — Stripe
    // resolved in place, so navigate to confirmation ourselves.
    router.push(confirmationPath);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
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
