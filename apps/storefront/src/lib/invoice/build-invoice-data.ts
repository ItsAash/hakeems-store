import type { ChannelCode } from '@/lib/channel';
import { getChannel } from '@/lib/channel';
import type { MedusaOrder } from '@/lib/medusa/payment-actions';

export type InvoiceAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  cityLine: string;
  country: string;
  phone?: string | null;
};

export type InvoiceLineItem = {
  id: string;
  title: string;
  variantLabel?: string | null;
  sku?: string | null;
  quantity: number;
  /** Minor units, matching every other price in the app. */
  unitPrice: number;
  total: number;
};

export type InvoiceData = {
  brandName: string;
  channelCountry: string;
  invoiceNumber: string;
  orderId: string;
  date: Date;
  currencyCode: string;
  email: string;
  billingAddress: InvoiceAddress | null;
  shippingAddress: InvoiceAddress | null;
  billingSameAsShipping: boolean;
  items: InvoiceLineItem[];
  shippingMethodName: string | null;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  paymentMethodLabel: string | null;
  paymentStatusLabel: string;
  fulfillmentStatusLabel: string;
};

/** Humanizes Medusa's snake_case status enums ("not_fulfilled" -> "Not Fulfilled"). */
function humanizeStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Maps a Medusa payment provider id to the customer-facing label shown on the invoice —
 * mirrors the two providers this storefront actually registers (see apps/medusa's
 * medusa-config.ts / seed.ts). Falls back to a humanized version of the raw id for any
 * future provider so the invoice never shows an internal id verbatim. */
function paymentMethodLabel(providerId: string | null | undefined): string | null {
  if (!providerId) return null;
  if (providerId === 'pp_stripe_stripe') return 'Card (Stripe)';
  if (providerId === 'pp_fonepay-placeholder_fonepay-placeholder') return 'Cash / Mobile on Delivery';
  return humanizeStatus(providerId.replace(/^pp_/, ''));
}

function toMinorUnits(amount: number | null | undefined): number {
  return Math.round((amount ?? 0) * 100);
}

type OrderAddress = NonNullable<MedusaOrder['shipping_address']>;

function mapAddress(address: OrderAddress | null | undefined, countryName: string): InvoiceAddress | null {
  if (!address) return null;
  const name = [address.first_name, address.last_name].filter(Boolean).join(' ').trim();
  const cityLine = [address.city, address.province].filter(Boolean).join(', ');
  return {
    name: name || '—',
    line1: address.address_1 ?? '',
    line2: address.address_2,
    cityLine: [cityLine, address.postal_code].filter(Boolean).join(' ').trim(),
    country: countryName,
    phone: address.phone,
  };
}

function addressesMatch(a: OrderAddress | null | undefined, b: OrderAddress | null | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    a.address_1 === b.address_1 &&
    a.address_2 === b.address_2 &&
    a.city === b.city &&
    a.postal_code === b.postal_code &&
    a.first_name === b.first_name &&
    a.last_name === b.last_name
  );
}

/** Shapes a raw Medusa order into the flat, presentation-agnostic data both the on-page
 * HTML invoice and the downloadable PDF render from — one source of truth for what an
 * invoice contains, even though the two have separate rendering code (HTML/Tailwind vs.
 * @react-pdf/renderer's own primitives can't share markup). */
export function buildInvoiceData(order: MedusaOrder, channelCode: ChannelCode, brandName: string): InvoiceData {
  const channel = getChannel(channelCode);
  const payment = order.payment_collections?.[0]?.payments?.[0];

  return {
    brandName,
    channelCountry: channel.countryName,
    invoiceNumber: String(order.display_id ?? order.id),
    orderId: order.id,
    date: new Date(order.created_at),
    currencyCode: order.currency_code,
    email: order.email ?? '',
    billingAddress: mapAddress(order.billing_address, channel.countryName),
    shippingAddress: mapAddress(order.shipping_address, channel.countryName),
    billingSameAsShipping: addressesMatch(order.billing_address, order.shipping_address),
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      title: item.product_title ?? item.title,
      variantLabel: item.variant_title,
      sku: item.variant_sku,
      quantity: item.quantity,
      unitPrice: toMinorUnits(item.unit_price),
      total: toMinorUnits(item.total),
    })),
    shippingMethodName: order.shipping_methods?.[0]?.name ?? null,
    subtotal: toMinorUnits(order.item_subtotal ?? order.subtotal),
    shippingTotal: toMinorUnits(order.shipping_total),
    taxTotal: toMinorUnits(order.tax_total),
    discountTotal: toMinorUnits(order.discount_total),
    total: toMinorUnits(order.total),
    paymentMethodLabel: paymentMethodLabel(payment?.provider_id),
    paymentStatusLabel: humanizeStatus(order.payment_status),
    fulfillmentStatusLabel: humanizeStatus(order.fulfillment_status),
  };
}
