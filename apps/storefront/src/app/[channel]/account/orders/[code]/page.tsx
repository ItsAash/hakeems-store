import Image from 'next/image';
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

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ channel: string; code: string }>;
}) {
  const { channel: channelParam, code } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const customer = await fetchCustomerAction(channel.code);
  if (!customer) redirect(routes.login(channel.code, routes.account(channel.code, `/orders/${code}`)));

  const token = await getAuthToken();
  const client = createMedusaClient(channel.code, token ?? undefined);
  const { order } = await client.store.order.retrieve(code) as any;
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href={routes.account(channel.code, '/orders')} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
            ← Order History
          </Link>
          <h2 className="mt-2 font-serif text-xl text-[var(--color-ink)]">Order #{order.display_id ?? order.id.slice(0, 8)}</h2>
          {order.created_at && (
            <p className="text-sm text-[var(--color-ink-muted)]">Placed {new Date(order.created_at).toLocaleDateString()}</p>
          )}
        </div>
        <span className="text-xs tracking-[0.1em] text-[var(--color-ink-muted)] uppercase">
          {formatOrderStatus(order.fulfillment_status ?? order.status ?? '')}
        </span>
      </div>

      <div className="flex flex-col gap-4 border-t hairline pt-6">
        {(order.items ?? []).map((line: any) => {
          const thumbnail = line.thumbnail ?? line.variant?.product?.thumbnail ?? null;
          const variantName = line.variant?.title ?? line.title ?? 'Item';
          return (
            <div key={line.id} className="flex items-center gap-4">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-[var(--color-hairline)]">
                {thumbnail && (
                  <Image src={thumbnail} alt={variantName} fill sizes="56px" className="object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm text-[var(--color-ink)]">
                  {variantName} × {line.quantity}
                </span>
              </div>
              <span className="text-sm text-[var(--color-ink)]">
                {formatPrice(toMinorUnits(line.total ?? line.unit_price * line.quantity), order.currency_code)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex max-w-xs flex-col gap-2 border-t hairline pt-6 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-ink-muted)]">Subtotal</span>
          <span className="text-[var(--color-ink)]">{formatPrice(toMinorUnits(order.subtotal ?? order.item_total), order.currency_code)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-ink-muted)]">Shipping</span>
          <span className="text-[var(--color-ink)]">
            {order.shipping_total && order.shipping_total > 0 ? formatPrice(toMinorUnits(order.shipping_total), order.currency_code) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between border-t hairline pt-2 font-medium">
          <span className="text-[var(--color-ink)]">Total</span>
          <span className="text-[var(--color-ink)]">{formatPrice(toMinorUnits(order.total), order.currency_code)}</span>
        </div>
      </div>

      {order.shipping_address && (
        <div className="border-t hairline pt-6 text-sm text-[var(--color-ink-muted)]">
          <p className="mb-1 text-xs tracking-[0.1em] text-[var(--color-ink)] uppercase">Shipping To</p>
          <p>{[order.shipping_address.first_name, order.shipping_address.last_name].filter(Boolean).join(' ') || '—'}</p>
          <p>{order.shipping_address.address_1}</p>
          <p>
            {[order.shipping_address.city, order.shipping_address.province, order.shipping_address.country_code].filter(Boolean).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
