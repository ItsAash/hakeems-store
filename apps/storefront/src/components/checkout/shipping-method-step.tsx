'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { addShippingMethodAction } from '@/lib/medusa/checkout-actions';
import { formatPrice } from '@/lib/format';

export type ShippingMethodOption = {
  id: string;
  name: string;
  /** Minor units, matching every other price in the app. */
  amount: number;
};

export function ShippingMethodStep({
  methods,
  currencyCode,
  channelCode,
}: {
  methods: ShippingMethodOption[];
  currencyCode: string;
  channelCode: ChannelCode;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(methods[0]?.id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    setIsSubmitting(true);
    setError(null);

    const result = await addShippingMethodAction(channelCode, selectedId);
    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  };

  if (methods.length === 0) {
    return <p className="text-sm text-[var(--color-ink-muted)]">No shipping methods are available for this address.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Shipping Method</h2>

      <div className="flex flex-col gap-3">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex cursor-pointer items-center justify-between gap-4 border px-4 py-3.5 transition-colors ${
              selectedId === method.id ? 'border-[var(--color-ink)]' : 'border-[var(--color-hairline)]'
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="shippingMethod"
                value={method.id}
                checked={selectedId === method.id}
                onChange={() => setSelectedId(method.id)}
                className="accent-[var(--color-ink)]"
              />
              <span className="text-sm text-[var(--color-ink)]">{method.name}</span>
            </span>
            <span className="text-sm text-[var(--color-ink)]">{formatPrice(method.amount, currencyCode)}</span>
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-label text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Saving…' : 'Continue to Payment'}
      </button>
    </form>
  );
}
