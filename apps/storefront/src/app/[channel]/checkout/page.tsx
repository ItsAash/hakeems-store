import { notFound, redirect } from 'next/navigation';
import { NOINDEX_METADATA } from '@/lib/seo/metadata';

export const metadata = { ...NOINDEX_METADATA, title: 'Checkout' };
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { fetchCartAction } from '@/lib/medusa/cart-actions';
import { fetchCustomerAction } from '@/lib/medusa/auth-actions';
import { toCartLines, toCartTotals } from '@/lib/medusa/cart-mapper';
import { listShippingOptionsAction, fetchShippingZoneTreeAction } from '@/lib/medusa/checkout-actions';
import { CONTAINER } from '@/lib/ui';
import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { OrderSummary } from '@/components/checkout/order-summary';

export default async function CheckoutPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const cart = await fetchCartAction(channel.code);
  if (!cart || (cart.items?.length ?? 0) === 0) {
    redirect(routes.cart(channel.code));
  }

  const customer = await fetchCustomerAction(channel.code);

  const hasShippingAddress = !!cart.shipping_address?.address_1;
  const hasShippingMethod = (cart.shipping_methods?.length ?? 0) > 0;

  // The zone tree only matters for the address step; shipping options only resolve
  // once an address is set (the fulfillment provider needs it to calculate a price).
  const [shippingZones, shippingOptionsResult] = await Promise.all([
    !hasShippingAddress ? fetchShippingZoneTreeAction(channel.code) : Promise.resolve([]),
    hasShippingAddress && !hasShippingMethod ? listShippingOptionsAction(channel.code) : Promise.resolve(null),
  ]);
  const shippingMethods = shippingOptionsResult?.success ? shippingOptionsResult.options : [];

  const lines = toCartLines(cart);
  const totals = toCartTotals(cart, channel.currencyCode);

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <h1 className="mb-10 font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Checkout</h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <CheckoutFlow
          channelCode={channel.code}
          hasShippingAddress={hasShippingAddress}
          hasShippingMethod={hasShippingMethod}
          defaultEmail={customer?.email ?? cart.email ?? undefined}
          defaultFirstName={customer?.first_name ?? undefined}
          defaultLastName={customer?.last_name ?? undefined}
          defaultPhone={customer?.phone ?? undefined}
          shippingZones={shippingZones}
          shippingMethods={shippingMethods}
          currencyCode={totals.currencyCode}
        />

        <div className="lg:border-l lg:hairline lg:pl-12">
          <OrderSummary
            lines={lines}
            subTotalWithTax={totals.subtotal}
            shippingWithTax={totals.shippingTotal}
            totalWithTax={totals.total}
            currencyCode={totals.currencyCode}
            channelCode={channel.code}
            promotions={cart.promotions}
          />
        </div>
      </div>
    </main>
  );
}
