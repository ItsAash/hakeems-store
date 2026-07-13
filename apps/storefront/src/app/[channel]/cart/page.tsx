import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { CONTAINER } from '@/lib/ui';
import { formatPrice } from '@/lib/format';
import { CartLineItem, type CartLine } from '@/components/commerce/cart-line-item';

export default async function CartPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const { activeOrder } = await getVendureClient(channel.code, sessionCookies).ActiveOrderFull();

  const lines: CartLine[] =
    activeOrder?.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      linePriceWithTax: line.linePriceWithTax,
      currencyCode: activeOrder.currencyCode,
      imageUrl: line.featuredAsset?.preview ?? null,
      productName: line.productVariant.name,
      productSlug: line.productVariant.product.slug,
      variantLabel: line.productVariant.options.map((option) => option.name).join(' / ') || null,
    })) ?? [];

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <h1 className="mb-8 font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Cart</h1>

      {lines.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-16">
          <p className="text-[var(--color-ink-muted)]">Your cart is empty.</p>
          <Link
            href={`/${channel.code}`}
            className="border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col">
            {lines.map((line) => (
              <CartLineItem key={line.id} line={line} channelCode={channel.code} />
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:border-l lg:hairline lg:pl-12">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-ink-muted)]">Subtotal</span>
              <span className="text-[var(--color-ink)]">
                {formatPrice(activeOrder?.subTotalWithTax ?? 0, activeOrder?.currencyCode ?? 'NPR')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-ink-muted)]">Shipping</span>
              <span className="text-[var(--color-ink)]">
                {activeOrder && activeOrder.shippingWithTax > 0
                  ? formatPrice(activeOrder.shippingWithTax, activeOrder.currencyCode)
                  : 'Calculated at checkout'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t hairline pt-4 text-sm font-medium">
              <span className="text-[var(--color-ink)]">Total</span>
              <span className="text-[var(--color-ink)]">
                {formatPrice(activeOrder?.totalWithTax ?? 0, activeOrder?.currencyCode ?? 'NPR')}
              </span>
            </div>

            <Link
              href={`/${channel.code}/checkout`}
              className="mt-4 flex w-full items-center justify-center bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
