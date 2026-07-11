import Link from 'next/link';
import { assertChannel, CHANNELS, PRODUCT_TYPES, titleCase } from '@/lib/channels';
import { getProducts } from '@/lib/vendure';
import { ProductCard } from '@/components/ProductCard';

export default async function ChannelHome({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  const channel = assertChannel(channelParam);
  const products = await getProducts(channel).catch(() => []);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{CHANNELS[channel].name} Channel</p>
          <h1>Hakeems</h1>
          <p>Community streetwear with separate local inventory, currency, tax, shipping, and payment setup for Nepal and Hong Kong.</p>
          <Link className="button" href={`/${channel}/products/tops`}>
            Shop Tops
          </Link>
        </div>
      </section>
      <main className="container">
        <h2>Shop by Type</h2>
        <div className="grid">
          {PRODUCT_TYPES.map((type) => (
            <Link className="card card-body" key={type} href={`/${channel}/products/${type}`}>
              <p className="eyebrow">Product Type</p>
              <h3>{titleCase(type)}</h3>
              <p className="muted">Browse {titleCase(type).toLowerCase()} in {CHANNELS[channel].currency}.</p>
            </Link>
          ))}
        </div>
        <h2 style={{ marginTop: 42 }}>Latest Products</h2>
        <div className="grid">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} channel={channel} product={product} />
          ))}
        </div>
      </main>
    </>
  );
}
