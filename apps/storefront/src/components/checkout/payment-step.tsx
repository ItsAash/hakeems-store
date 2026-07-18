import type { ChannelCode } from '@/lib/channel';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { FonepayPlaceholderPayment } from '@/components/checkout/fonepay-placeholder-payment';

/** Medusa carts have no Vendure-style `ArrangingPayment` state gate to transition
 * through first — a payment session can be initiated as soon as the cart has a
 * shipping method, which is already guaranteed by the time this step renders (see
 * checkout-flow.tsx). Just hand off to the channel's payment method directly. */
export function PaymentStep({ channelCode }: { channelCode: ChannelCode }) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Payment</h2>

      {channelCode === 'hongkong' ? (
        <StripePaymentForm channelCode={channelCode} />
      ) : (
        <FonepayPlaceholderPayment channelCode={channelCode} />
      )}
    </div>
  );
}
