import type { ChannelCode } from '@/lib/channel';
import { AddressForm } from '@/components/checkout/address-form';
import type { ZoneNode } from '@/components/checkout/shipping-zone-picker';
import { ShippingMethodStep, type ShippingMethodOption } from '@/components/checkout/shipping-method-step';
import { PaymentStep } from '@/components/checkout/payment-step';

type CheckoutStep = 'address' | 'shipping' | 'payment';

const STEPS: Array<{ key: CheckoutStep; label: string }> = [
  { key: 'address', label: 'Address' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
];

/**
 * Which step to show is derived entirely from the cart's own state (has a shipping
 * address? a shipping method?) rather than tracked as separate client state — after
 * each step's Server Action, the caller does `router.refresh()`, the parent Server
 * Component re-fetches the cart, and this component just re-derives the step from
 * the fresh data. Refreshing mid-checkout can never lose progress.
 *
 * Contact fields pre-fill from the logged-in customer's saved data when available.
 */
export function CheckoutFlow({
  channelCode,
  hasShippingAddress,
  hasShippingMethod,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  shippingMethods,
  shippingZones,
  currencyCode,
}: {
  channelCode: ChannelCode;
  hasShippingAddress: boolean;
  hasShippingMethod: boolean;
  defaultEmail?: string;
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultPhone?: string;
  shippingMethods: ShippingMethodOption[];
  /** This channel's shipping-zone tree — drives the delivery-zone picker below the address. */
  shippingZones: ZoneNode[];
  currencyCode: string;
}) {
  const step: CheckoutStep = !hasShippingAddress ? 'address' : !hasShippingMethod ? 'shipping' : 'payment';

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator current={step} />

      {step === 'address' && (
        <AddressForm
          channelCode={channelCode}
          defaultEmail={defaultEmail}
          defaultFirstName={defaultFirstName}
          defaultLastName={defaultLastName}
          defaultPhone={defaultPhone}
          shippingZones={shippingZones}
          currencyCode={currencyCode}
        />
      )}
      {step === 'shipping' && (
        <ShippingMethodStep methods={shippingMethods} currencyCode={currencyCode} channelCode={channelCode} />
      )}
      {step === 'payment' && <PaymentStep channelCode={channelCode} />}
    </div>
  );
}

function StepIndicator({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="flex items-center gap-3 text-xs tracking-label">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-3">
            {index > 0 && <span className="h-px w-6 bg-[var(--color-hairline)]" aria-hidden="true" />}
            <span className={isCurrent || isDone ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'}>
              {index + 1}. {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
