import Link from 'next/link';
import { NOINDEX_METADATA } from '@/lib/seo/metadata';

export const metadata = { ...NOINDEX_METADATA, title: 'Order Confirmation' };
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { CONTAINER } from '@/lib/ui';
import { formatPrice } from '@/lib/format';
import { toMinorUnits } from '@/lib/medusa/cart-mapper';
import { fetchOrderAction } from '@/lib/medusa/payment-actions';

export default async function CheckoutConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ order_id?: string }>;
}) {
  const [{ channel: channelParam }, { order_id: orderId }] = await Promise.all([params, searchParams]);
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  if (!orderId) notFound();

  const result = await fetchOrderAction(channel.code, orderId);
  if (!result.success) notFound();
  const { order } = result;

  return (
    <main className={`flex-1 py-section ${CONTAINER}`}>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <p className="eyebrow">Order Confirmed</p>
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Thank you{order.email ? `, ${order.email}` : ''}.</h1>
        <p className="text-[var(--color-ink-muted)]">
          Your order <span className="font-medium text-[var(--color-ink)]">#{order.display_id}</span> has been placed.
        </p>

        <div className="mt-8 w-full border-t hairline pt-8 text-left">
          <div className="flex flex-col gap-3">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink)]">
                  {item.title} × {item.quantity}
                </span>
                <span className="text-[var(--color-ink-muted)]">
                  {formatPrice(toMinorUnits(item.total), order.currency_code)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t hairline pt-4 text-sm font-medium">
            <span className="text-[var(--color-ink)]">Total</span>
            <span className="text-[var(--color-ink)]">{formatPrice(toMinorUnits(order.total), order.currency_code)}</span>
          </div>
        </div>

        {order.shipping_address && (
          <div className="w-full border-t hairline pt-6 text-left text-sm text-[var(--color-ink-muted)]">
            <p className="mb-1 text-xs tracking-[0.1em] text-[var(--color-ink)] uppercase">Shipping To</p>
            <p>
              {order.shipping_address.first_name} {order.shipping_address.last_name}
            </p>
            <p>{order.shipping_address.address_1}</p>
            <p>
              {order.shipping_address.city}, {order.shipping_address.country_code?.toUpperCase()}
            </p>
          </div>
        )}

        <Link
          href={`/${channel.code}`}
          className="mt-8 border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}
