import Link from 'next/link';
import { NOINDEX_METADATA } from '@/lib/seo/metadata';

export const metadata = { ...NOINDEX_METADATA, title: 'Order Confirmation' };
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { CONTAINER } from '@/lib/ui';
import { routes } from '@/lib/routes';
import { fetchOrderAction } from '@/lib/medusa/payment-actions';
import { getSiteSetting } from '@/lib/strapi/queries';
import { SITE_NAME } from '@/lib/seo/site';
import { buildInvoiceData } from '@/lib/invoice/build-invoice-data';
import { Invoice } from '@/components/checkout/invoice';
import { InvoiceActions } from '@/components/checkout/invoice-actions';

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

  const [result, setting] = await Promise.all([fetchOrderAction(channel.code, orderId), getSiteSetting()]);
  if (!result.success) notFound();
  const { order } = result;

  const brandName = setting?.siteName || SITE_NAME;
  const invoice = buildInvoiceData(order, channel.code, brandName);
  // The account holder's name is rarely on the guest customer record — the address
  // they just typed is the far more reliable source for "who is this".
  const customerName = order.shipping_address?.first_name || order.customer?.first_name || null;

  return (
    <main className={`flex-1 py-section ${CONTAINER}`}>
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <p className="eyebrow no-print">Order Confirmed</p>
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">
          Thank you{customerName ? `, ${customerName}` : ''}.
        </h1>
        <p className="no-print text-[var(--color-ink-muted)]">
          Your order <span className="font-medium text-[var(--color-ink)]">#{order.display_id}</span> has been placed.
          Your invoice is below.
        </p>

        <div className="mt-8 w-full text-left">
          <Invoice data={invoice} />
        </div>

        <InvoiceActions downloadHref={routes.checkoutInvoice(channel.code, order.id)} />

        <Link
          href={`/${channel.code}`}
          className="no-print mt-2 border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}
