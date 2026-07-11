import { cookies } from 'next/headers';
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
      <main className="container">
        <h1>Your cart is empty</h1>
        <Link className="button" href={`/${channel}/products/tops`}>
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="container split">
      <section>
        <h1>Cart</h1>
        {order.lines.map((line) => (
          <div className="line-item" key={line.id}>
            <div className="product-image" />
            <div>
              <h3>
                <Link href={`/${channel}/product/${line.productVariant.product.slug}`}>{line.productVariant.product.name}</Link>
              </h3>
              <p className="muted">
                {line.productVariant.options.map((option) => `${option.group.name}: ${option.name}`).join(', ')}
              </p>
              <p>Qty {line.quantity}</p>
            </div>
            <strong>{formatMoney(line.linePriceWithTax, order.currencyCode)}</strong>
          </div>
        ))}
      </section>
      <aside className="panel">
        <h2>Order Summary</h2>
        <p>Shipping: {order.shippingWithTax ? formatMoney(order.shippingWithTax, order.currencyCode) : 'Calculated at checkout'}</p>
        <h3>Total {formatMoney(order.totalWithTax, order.currencyCode)}</h3>
        <Link className="button" href={`/${channel}/checkout`}>
          Proceed to Checkout
        </Link>
      </aside>
    </main>
  );
}
