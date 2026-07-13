import type { CartLine } from '@/components/commerce/cart-line-item';
import { formatPrice } from '@/lib/format';

export function OrderSummary({
  lines,
  subTotalWithTax,
  shippingWithTax,
  totalWithTax,
  currencyCode,
}: {
  lines: CartLine[];
  subTotalWithTax: number;
  shippingWithTax: number;
  totalWithTax: number;
  currencyCode: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Order Summary</h2>

      <div className="flex flex-col gap-4 border-b hairline pb-5">
        {lines.map((line) => (
          <div key={line.id} className="flex gap-3">
            <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-[var(--color-hairline)]">
              {line.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={line.imageUrl} alt={line.productName} className="h-full w-full object-cover" />
              )}
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-[10px] text-[var(--color-paper)]">
                {line.quantity}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <p className="text-sm text-[var(--color-ink)]">{line.productName}</p>
              {line.variantLabel && <p className="text-xs text-[var(--color-ink-muted)]">{line.variantLabel}</p>}
            </div>
            <p className="text-sm text-[var(--color-ink)]">{formatPrice(line.linePriceWithTax, currencyCode)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-ink-muted)]">Subtotal</span>
          <span className="text-[var(--color-ink)]">{formatPrice(subTotalWithTax, currencyCode)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-ink-muted)]">Shipping</span>
          <span className="text-[var(--color-ink)]">
            {shippingWithTax > 0 ? formatPrice(shippingWithTax, currencyCode) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between border-t hairline pt-3 font-medium">
          <span className="text-[var(--color-ink)]">Total</span>
          <span className="text-[var(--color-ink)]">{formatPrice(totalWithTax, currencyCode)}</span>
        </div>
      </div>
    </div>
  );
}
