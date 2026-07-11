import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { assertChannel } from '@/lib/channels';
import { ACTIVE_ORDER_QUERY, vendureFetch } from '@/lib/vendure';
import { formatMoney } from '@/lib/money';

type ActiveOrder = {
  activeOrder: null | {
    id: string;
    totalWithTax: number;
    currencyCode: string;
    shippingWithTax: number;
    lines: Array<{
      id: string;
      quantity: number;
      linePriceWithTax: number;
      productVariant: {
        id: string;
        name: string;
        product: { name: string; slug: string; featuredAsset?: { preview: string } | null };
        options: Array<{ name: string; group: { name: string } }>;
      };
    }>;
  };
};

export default async function CartPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  const channel = assertChannel(channelParam);
  const cookieHeader = (await cookies()).toString();
  const { data } = await vendureFetch<ActiveOrder>(channel, ACTIVE_ORDER_QUERY, {}, cookieHeader).catch(() => ({ data: { activeOrder: null } }));
  const order = data.activeOrder;

  if (!order?.lines.length) {
    return (
      <main className="container empty-state">
        <p className="eyebrow">Your Bag</p>
        <h1>Your bag is empty</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Find something you'll want to wear to the next pop-up.
        </p>
        <Link className="button" href={`/${channel}/products/tops`}>
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="container section">
      <h1 style={{ marginBottom: 28 }}>Your Bag</h1>
      <div className="split">
        <section>
          {order.lines.map((line) => (
            <div className="line-item" key={line.id}>
              {line.productVariant.product.featuredAsset?.preview ? (
                <Image
                  className="product-image"
                  src={line.productVariant.product.featuredAsset.preview}
                  alt={line.productVariant.product.name}
                  width={200}
                  height={250}
                />
              ) : (
                <div className="product-image-placeholder" aria-hidden="true" />
              )}
              <div>
                <p className="card-title">
                  <Link href={`/${channel}/product/${line.productVariant.product.slug}`}>{line.productVariant.product.name}</Link>
                </p>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {line.productVariant.options.map((option) => `${option.group.name}: ${option.name}`).join(', ')}
                </p>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Qty {line.quantity}</p>
              </div>
              <strong>{formatMoney(line.linePriceWithTax, order.currencyCode)}</strong>
            </div>
          ))}
        </section>
        <aside className="panel">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{order.shippingWithTax ? formatMoney(order.shippingWithTax, order.currencyCode) : 'Calculated at checkout'}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatMoney(order.totalWithTax, order.currencyCode)}</span>
          </div>
          <Link className="button full" href={`/${channel}/checkout`} style={{ marginTop: 16 }}>
            Proceed to Checkout
          </Link>
        </aside>
      </div>
    </main>
  );
}
