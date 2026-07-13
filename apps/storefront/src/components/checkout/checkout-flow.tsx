import type { ChannelCode } from '@/lib/channel';
import { AddressForm, type Country } from '@/components/checkout/address-form';
import { ShippingMethodStep, type ShippingMethodOption } from '@/components/checkout/shipping-method-step';
import { PaymentStep } from '@/components/checkout/payment-step';

type CheckoutStep = 'address' | 'shipping' | 'payment';

const STEPS: Array<{ key: CheckoutStep; label: string }> = [
  { key: 'address', label: 'Address' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
];

/**
 * Which step to show is derived entirely from the order's own state (has a shipping
 * address? a shipping method?) rather than tracked as separate client state — after
 * each step's Server Action, the caller does `router.refresh()`, the parent Server
 * Component re-fetches the order, and this component just re-derives the step from
 * the fresh data. Refreshing mid-checkout can never lose progress.
 */
export function CheckoutFlow({
  channelCode,
  orderCode,
  orderState,
  hasShippingAddress,
  hasShippingMethod,
  countries,
  defaultCountryCode,
  defaultEmail,
  isLoggedIn,
  shippingMethods,
  currencyCode,
}: {
  channelCode: ChannelCode;
  orderCode: string;
  orderState: string;
  hasShippingAddress: boolean;
  hasShippingMethod: boolean;
  countries: Country[];
  defaultCountryCode: string;
  defaultEmail?: string;
  isLoggedIn?: boolean;
  shippingMethods: ShippingMethodOption[];
  currencyCode: string;
}) {
  const step: CheckoutStep = !hasShippingAddress ? 'address' : !hasShippingMethod ? 'shipping' : 'payment';

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator current={step} />

      {step === 'address' && (
        <AddressForm
          channelCode={channelCode}
          countries={countries}
          defaultCountryCode={defaultCountryCode}
          defaultEmail={defaultEmail}
          isLoggedIn={isLoggedIn}
        />
      )}
      {step === 'shipping' && (
        <ShippingMethodStep methods={shippingMethods} currencyCode={currencyCode} channelCode={channelCode} />
      )}
      {step === 'payment' && <PaymentStep channelCode={channelCode} orderState={orderState} orderCode={orderCode} />}
    </div>
  );
}

function StepIndicator({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="flex items-center gap-3 text-xs tracking-[0.1em] uppercase">
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
