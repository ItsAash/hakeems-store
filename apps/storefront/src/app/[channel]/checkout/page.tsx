import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { CONTAINER } from '@/lib/ui';
import type { CartLine } from '@/components/commerce/cart-line-item';
import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { OrderSummary } from '@/components/checkout/order-summary';

export default async function CheckoutPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const client = getVendureClient(channel.code, sessionCookies);

  const [{ activeOrder }, { availableCountries }, { eligibleShippingMethods }] = await Promise.all([
    client.ActiveOrderFull(),
    client.Countries(),
    client.EligibleShippingMethods(),
  ]);

  if (!activeOrder || activeOrder.lines.length === 0) {
    redirect(`/${channel.code}/cart`);
  }

  const lines: CartLine[] = activeOrder.lines.map((line) => ({
    id: line.id,
    quantity: line.quantity,
    linePriceWithTax: line.linePriceWithTax,
    currencyCode: activeOrder.currencyCode,
    imageUrl: line.featuredAsset?.preview ?? null,
    productName: line.productVariant.name,
    productSlug: line.productVariant.product.slug,
    variantLabel: line.productVariant.options.map((option) => option.name).join(' / ') || null,
  }));

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <h1 className="mb-10 font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Checkout</h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <CheckoutFlow
          channelCode={channel.code}
          orderCode={activeOrder.code}
          orderState={activeOrder.state}
          hasShippingAddress={!!activeOrder.shippingAddress?.streetLine1}
          hasShippingMethod={activeOrder.shippingLines.length > 0}
          countries={availableCountries}
          defaultCountryCode={channel.countryCode}
          shippingMethods={eligibleShippingMethods.map((method) => ({
            id: method.id,
            name: method.name,
            description: method.description,
            priceWithTax: method.priceWithTax,
          }))}
          currencyCode={activeOrder.currencyCode}
        />

        <div className="lg:border-l lg:hairline lg:pl-12">
          <OrderSummary
            lines={lines}
            subTotalWithTax={activeOrder.subTotalWithTax}
            shippingWithTax={activeOrder.shippingWithTax}
            totalWithTax={activeOrder.totalWithTax}
            currencyCode={activeOrder.currencyCode}
          />
        </div>
      </div>
    </main>
  );
}
