import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { formatOrderState, formatPrice } from '@/lib/format';

export default async function AccountOrdersPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const { activeCustomer } = await getVendureClient(channel.code, sessionCookies).CustomerOrders({ take: 50, skip: 0 });
  if (!activeCustomer) redirect(`/${channel.code}/login?next=/${channel.code}/account/orders`);

  // Excludes carts that were never placed (AddingItems/ArrangingPayment abandoned mid-checkout) —
  // those have no orderPlacedAt and aren't "orders" from the customer's point of view.
  const orders = activeCustomer.orders.items.filter((order) => order.orderPlacedAt);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Order History</h2>

      {orders.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">You haven't placed any orders yet.</p>
      ) : (
        <div className="flex flex-col divide-y hairline border-t hairline border-b">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/${channel.code}/account/orders/${order.code}`}
              className="flex items-center justify-between gap-4 py-4 text-sm hover:bg-[var(--color-paper-raised)]"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-[var(--color-ink)]">{order.code}</span>
                <span className="text-[var(--color-ink-muted)]">
                  {order.orderPlacedAt ? new Date(order.orderPlacedAt).toLocaleDateString() : '—'} · {order.totalQuantity}{' '}
                  {order.totalQuantity === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[var(--color-ink)]">{formatPrice(order.totalWithTax, order.currencyCode)}</span>
                <span className="text-xs tracking-[0.1em] text-[var(--color-ink-muted)] uppercase">{formatOrderState(order.state)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
