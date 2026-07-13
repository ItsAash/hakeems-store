import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { CONTAINER } from '@/lib/ui';
import { formatPrice } from '@/lib/format';

export default async function CheckoutConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const [{ channel: channelParam }, { code }] = await Promise.all([params, searchParams]);
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  if (!code) notFound();

  const sessionCookies = await getVendureSessionCookies();
  const { orderByCode: order } = await getVendureClient(channel.code, sessionCookies).OrderByCode({ code });

  if (!order) notFound();

  return (
    <main className={`flex-1 py-section ${CONTAINER}`}>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <p className="eyebrow">Order Confirmed</p>
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Thank you{order.customer ? `, ${order.customer.emailAddress}` : ''}.</h1>
        <p className="text-[var(--color-ink-muted)]">
          Your order <span className="font-medium text-[var(--color-ink)]">{order.code}</span> has been placed.
        </p>

        <div className="mt-8 w-full border-t hairline pt-8 text-left">
          <div className="flex flex-col gap-3">
            {order.lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-ink)]">
                  {line.productVariant.name} × {line.quantity}
                </span>
                <span className="text-[var(--color-ink-muted)]">{formatPrice(line.linePriceWithTax, order.currencyCode)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t hairline pt-4 text-sm font-medium">
            <span className="text-[var(--color-ink)]">Total</span>
            <span className="text-[var(--color-ink)]">{formatPrice(order.totalWithTax, order.currencyCode)}</span>
          </div>
        </div>

        {order.shippingAddress && (
          <div className="w-full border-t hairline pt-6 text-left text-sm text-[var(--color-ink-muted)]">
            <p className="mb-1 text-xs tracking-[0.1em] text-[var(--color-ink)] uppercase">Shipping To</p>
            <p>{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.streetLine1}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.countryCode}
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
