import { notFound } from 'next/navigation';
import { NOINDEX_METADATA } from '@/lib/seo/metadata';

export const metadata = { ...NOINDEX_METADATA, title: 'Cart' };
import Link from 'next/link';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { fetchCartAction } from '@/lib/medusa/cart-actions';
import { toCartLines, toCartTotals } from '@/lib/medusa/cart-mapper';
import { CONTAINER } from '@/lib/ui';
import { formatPrice } from '@/lib/format';
import { CartLineItem } from '@/components/commerce/cart-line-item';

export default async function CartPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const medusaCart = await fetchCartAction(channel.code);
  const lines = toCartLines(medusaCart);
  const totals = toCartTotals(medusaCart, channel.currencyCode);

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <h1 className="mb-8 font-serif text-3xl text-[var(--color-ink)] md:text-4xl">Cart</h1>

      {lines.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-section-sm">
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
              <span className="text-[var(--color-ink)]">{formatPrice(totals.subtotal, totals.currencyCode)}</span>
            </div>
            {(medusaCart?.promotions ?? []).map((promotion, index) => {
              // StoreCartPromotion carries no single cart-level discount amount — a
              // percentage promotion's actual effect lives on per-line adjustments, not
              // here — so show the code and, for fixed-amount promotions only, the value.
              const method = promotion.application_method;
              const fixedAmount =
                method?.type === 'fixed' && method.value ? Math.round(Number(method.value) * 100) : null;
              return (
                <div key={promotion.id ?? index} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-ink-muted)]">
                    {promotion.code || 'Discount'}
                    {method?.type === 'percentage' && method.value ? ` (${method.value}%)` : ''}
                  </span>
                  {fixedAmount !== null && (
                    <span className="text-[var(--color-sale)]">
                      -{formatPrice(fixedAmount, method?.currency_code ?? totals.currencyCode)}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-ink-muted)]">Shipping</span>
              <span className="text-[var(--color-ink)]">
                {totals.shippingTotal > 0 ? formatPrice(totals.shippingTotal, totals.currencyCode) : 'Calculated at checkout'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t hairline pt-4 text-sm font-medium">
              <span className="text-[var(--color-ink)]">Total</span>
              <span className="text-[var(--color-ink)]">{formatPrice(totals.total, totals.currencyCode)}</span>
            </div>

            <Link
              href={routes.checkout(channel.code)}
              className="mt-4 flex w-full items-center justify-center bg-[var(--color-ink)] py-4 text-sm font-medium tracking-label text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
