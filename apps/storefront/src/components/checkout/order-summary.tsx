import Image from 'next/image';
import type { CartLine } from '@/components/commerce/cart-line-item';
import type { ChannelCode } from '@/lib/channel';
import { formatPrice } from '@/lib/format';
import { PromoCodeForm } from '@/components/checkout/promo-code-form';

export type OrderDiscount = { description: string; amountWithTax: number };

/**
 * A single line in the order summary: fixed-ratio thumbnail with a quantity badge, the
 * product name + variant, and the line total. All data is passed in from the order
 * (mapped from Vendure in the checkout page) — nothing is hardcoded here.
 */
function OrderSummaryLine({ line, currencyCode }: { line: CartLine; currencyCode: string }) {
  return (
    <li className="flex items-start gap-4">
      {/* Outer wrapper is NOT clipped, so the badge can sit on the thumbnail's corner.
          The inner wrapper clips the image to a consistent 4:5 product ratio. */}
      <div className="relative shrink-0">
        <div className="relative aspect-[4/5] w-16 overflow-hidden rounded-md bg-[var(--color-hairline)]">
          {line.imageUrl && (
            <Image src={line.imageUrl} alt={line.productName} fill sizes="64px" className="object-cover" />
          )}
        </div>
        <span
          aria-label={`Quantity: ${line.quantity}`}
          className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-ink)] px-1 text-[11px] font-medium text-[var(--color-paper)] ring-2 ring-[var(--color-paper)]"
        >
          ×{line.quantity}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <p className="text-sm leading-snug text-[var(--color-ink)]">{line.productName}</p>
        {line.variantLabel && <p className="text-xs text-[var(--color-ink-muted)]">{line.variantLabel}</p>}
      </div>

      <p className="shrink-0 pt-0.5 text-sm whitespace-nowrap text-[var(--color-ink)]">
        {formatPrice(line.linePriceWithTax, currencyCode)}
      </p>
    </li>
  );
}

export function OrderSummary({
  lines,
  subTotalWithTax,
  shippingWithTax,
  totalWithTax,
  currencyCode,
  channelCode,
  discounts = [],
  appliedCouponCodes = [],
}: {
  lines: CartLine[];
  subTotalWithTax: number;
  shippingWithTax: number;
  totalWithTax: number;
  currencyCode: string;
  channelCode?: ChannelCode;
  /** Vendure order-level discounts (promotions + coupons); rendered as negative lines. */
  discounts?: OrderDiscount[];
  appliedCouponCodes?: string[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Order Summary</h2>

      <ul className="flex flex-col gap-5 border-b hairline pb-5">
        {lines.map((line) => (
          <OrderSummaryLine key={line.id} line={line} currencyCode={currencyCode} />
        ))}
      </ul>

      {channelCode && (
        <div className="border-b hairline pb-5">
          <PromoCodeForm channelCode={channelCode} appliedCouponCodes={appliedCouponCodes} />
        </div>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-ink-muted)]">Subtotal</span>
          <span className="text-[var(--color-ink)]">{formatPrice(subTotalWithTax, currencyCode)}</span>
        </div>
        {discounts.map((discount, index) => (
          <div key={`${discount.description}-${index}`} className="flex items-center justify-between">
            <span className="text-[var(--color-ink-muted)]">{discount.description || 'Discount'}</span>
            <span className="text-[var(--color-sale)]">{formatPrice(discount.amountWithTax, currencyCode)}</span>
          </div>
        ))}
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
