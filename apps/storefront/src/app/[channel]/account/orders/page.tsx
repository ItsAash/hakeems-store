import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { fetchCustomerAction } from '@/lib/medusa/auth-actions';
import { getAuthToken } from '@/lib/medusa/auth-cookie';
import { createMedusaClient } from '@/lib/medusa/client';
import { toMinorUnits } from '@/lib/medusa/cart-mapper';
import { formatPrice } from '@/lib/format';

function formatOrderStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AccountOrdersPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const customer = await fetchCustomerAction(channel.code);
  if (!customer) redirect(routes.login(channel.code, routes.account(channel.code, '/orders')));

  const token = await getAuthToken();
  const client = createMedusaClient(channel.code, token ?? undefined);
  const { orders } = await client.store.order.list({ limit: 50 }) as any;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Order History</h2>

      {!orders || orders.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">You haven't placed any orders yet.</p>
      ) : (
        <div className="flex flex-col divide-y hairline border-t hairline border-b">
          {orders.map((order: any) => {
            const itemCount = order.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0;
            return (
              <Link
                key={order.id}
                href={routes.account(channel.code, `/orders/${order.id}`)}
                className="flex items-center justify-between gap-4 py-4 text-sm hover:bg-[var(--color-paper-raised)]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-[var(--color-ink)]">#{order.display_id ?? order.id.slice(0, 8)}</span>
                  <span className="text-[var(--color-ink-muted)]">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'} · {itemCount}{' '}
                    {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[var(--color-ink)]">{formatPrice(toMinorUnits(order.total), order.currency_code)}</span>
                  <span className="text-xs tracking-[0.1em] text-[var(--color-ink-muted)] uppercase">
                    {formatOrderStatus(order.fulfillment_status ?? order.status ?? '')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
