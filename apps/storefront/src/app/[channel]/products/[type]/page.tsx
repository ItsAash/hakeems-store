import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { assertChannel, CHANNELS, PRODUCT_TYPES, titleCase, type ProductType } from '@/lib/channels';
import { getProducts } from '@/lib/vendure';

export default async function ProductListingPage({
  params,
}: {
  params: Promise<{ channel: string; type: string }>;
}) {
  const { channel: channelParam, type } = await params;
  const channel = assertChannel(channelParam);

  if (!PRODUCT_TYPES.includes(type as ProductType)) {
    notFound();
  }

  const products = await getProducts(channel);
  const filtered = products.filter((product) =>
    product.facetValues.some((value) => value.facet.code === 'product-type' && value.code === type),
  );

  return (
    <main className="container section">
      <p className="breadcrumb">
        <Link href={`/${channel}`}>Home</Link> / {titleCase(type)}
      </p>
      <div className="listing-head">
        <div>
          <h1>{titleCase(type)}</h1>
          <p className="muted">
            {filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'} · Priced in {CHANNELS[channel].currency}, tax included
          </p>
        </div>
      </div>
      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} channel={channel} product={product} />
          ))}
        </div>
      ) : (
        <p className="muted">No products found for this type yet.</p>
      )}
    </main>
  );
}
