import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { formatOrderState, formatPrice } from '@/lib/format';

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ channel: string; code: string }>;
}) {
  const { channel: channelParam, code } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const client = getVendureClient(channel.code, sessionCookies);
  const [{ activeCustomer }, { orderByCode: order }] = await Promise.all([client.ActiveCustomer(), client.OrderByCode({ code })]);
  if (!activeCustomer) redirect(routes.login(channel.code, routes.account(channel.code, `/orders/${code}`)));
  if (!order || order.customer?.emailAddress !== activeCustomer.emailAddress) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href={routes.account(channel.code, '/orders')} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
            ← Order History
          </Link>
          <h2 className="mt-2 font-serif text-xl text-[var(--color-ink)]">Order {order.code}</h2>
          {order.orderPlacedAt && (
            <p className="text-sm text-[var(--color-ink-muted)]">Placed {new Date(order.orderPlacedAt).toLocaleDateString()}</p>
          )}
        </div>
        <span className="text-xs tracking-[0.1em] text-[var(--color-ink-muted)] uppercase">{formatOrderState(order.state)}</span>
      </div>

      <div className="flex flex-col gap-4 border-t hairline pt-6">
        {order.lines.map((line) => (
          <div key={line.id} className="flex items-center gap-4">
            <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-[var(--color-hairline)]">
              {line.featuredAsset && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.featuredAsset.preview} alt={line.productVariant.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm text-[var(--color-ink)]">
                {line.productVariant.name} × {line.quantity}
              </span>
            </div>
            <span className="text-sm text-[var(--color-ink)]">{formatPrice(line.linePriceWithTax, order.currencyCode)}</span>
          </div>
        ))}
      </div>

      <div className="flex max-w-xs flex-col gap-2 border-t hairline pt-6 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-ink-muted)]">Subtotal</span>
          <span className="text-[var(--color-ink)]">{formatPrice(order.subTotalWithTax, order.currencyCode)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-ink-muted)]">Shipping</span>
          <span className="text-[var(--color-ink)]">
            {order.shippingWithTax > 0 ? formatPrice(order.shippingWithTax, order.currencyCode) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between border-t hairline pt-2 font-medium">
          <span className="text-[var(--color-ink)]">Total</span>
          <span className="text-[var(--color-ink)]">{formatPrice(order.totalWithTax, order.currencyCode)}</span>
        </div>
      </div>

      {order.shippingAddress && (
        <div className="border-t hairline pt-6 text-sm text-[var(--color-ink-muted)]">
          <p className="mb-1 text-xs tracking-[0.1em] text-[var(--color-ink)] uppercase">Shipping To</p>
          <p>{order.shippingAddress.fullName}</p>
          <p>{order.shippingAddress.streetLine1}</p>
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.countryCode}
          </p>
        </div>
      )}
    </div>
  );
}
