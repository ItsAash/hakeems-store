import type { createMedusaClient } from '@/lib/medusa/client';
import type { CartLine } from '@/components/commerce/cart-line-item';

// Derived straight from the SDK client's own method signature — always matches whatever
// @medusajs/js-sdk version is installed, with no direct dependency on @medusajs/types
// (which isn't a direct dependency of this app and doesn't resolve from here).
type MedusaClient = ReturnType<typeof createMedusaClient>;
export type MedusaCart = Awaited<ReturnType<MedusaClient['store']['cart']['retrieve']>>['cart'];
export type MedusaCartLineItem = NonNullable<MedusaCart['items']>[number];
export type MedusaCartPromotion = NonNullable<MedusaCart['promotions']>[number];

/** Medusa stores amounts as-is (major units, e.g. 490 = NPR 490); every shared UI
 * component (formatPrice, CartLine, cart totals) expects integer minor units, matching
 * Vendure's convention. Normalize once, here, so nothing downstream needs to know or
 * care which backend produced the number. */
export const toMinorUnits = (amount: number | null | undefined): number => Math.round((amount ?? 0) * 100);

export function toCartLines(cart: MedusaCart | null | undefined): CartLine[] {
  return (cart?.items ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    // `item.total` is the line's actual charged total (post discount, matches Vendure's
    // linePriceWithTax); unlike unit_price * quantity it accounts for per-line promotions.
    linePriceWithTax: toMinorUnits(item.total),
    currencyCode: cart?.currency_code ?? '',
    // Flat snapshot fields captured on the line item itself at add-to-cart time — more
    // reliable than reaching through item.variant?.product, which depends on that
    // relation being expanded in the cart-retrieve query.
    imageUrl: item.thumbnail ?? null,
    productName: item.product_title ?? '',
    productSlug: item.product_handle ?? '',
    variantLabel: item.variant_title ?? null,
  }));
}

export function cartItemCount(cart: MedusaCart | null | undefined): number {
  return (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
}

export type CartTotals = {
  subtotal: number;
  shippingTotal: number;
  total: number;
  currencyCode: string;
};

export function toCartTotals(cart: MedusaCart | null | undefined, fallbackCurrencyCode: string): CartTotals {
  return {
    subtotal: toMinorUnits(cart?.subtotal),
    shippingTotal: toMinorUnits(cart?.shipping_total),
    total: toMinorUnits(cart?.total),
    currencyCode: cart?.currency_code ?? fallbackCurrencyCode,
  };
}
