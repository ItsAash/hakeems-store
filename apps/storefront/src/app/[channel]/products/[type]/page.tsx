import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { assertChannel, PRODUCT_TYPES, titleCase, type ProductType } from '@/lib/channels';
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
    <main className="container">
      <p className="eyebrow">Shop {channel}</p>
      <h1>{titleCase(type)}</h1>
      <p className="muted">{filtered.length} products. Use Material, Fit, and Gender as Vendure facets in Admin for filtering.</p>
      <div className="grid">
        {filtered.map((product) => (
          <ProductCard key={product.id} channel={channel} product={product} />
        ))}
      </div>
      {filtered.length === 0 && <p>No products found for this type yet.</p>}
    </main>
  );
}
