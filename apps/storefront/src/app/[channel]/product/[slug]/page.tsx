import Image from 'next/image';
import { notFound } from 'next/navigation';
import { assertChannel } from '@/lib/channels';
import { formatMoney } from '@/lib/money';
import { getProductBySlug } from '@/lib/vendure';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ channel: string; slug: string }>;
}) {
  const { channel: channelParam, slug } = await params;
  const channel = assertChannel(channelParam);
  const product = await getProductBySlug(channel, slug);

  if (!product) notFound();

  const variant = product.variants[0];
  const enriched = product.customFields?.enrichedDescription || product.description;

  return (
    <main className="container split">
      <div>
        {product.featuredAsset?.preview ? (
          <Image className="product-image" src={product.featuredAsset.preview} alt={product.name} width={900} height={1125} priority />
        ) : (
          <div className="product-image" aria-hidden="true" />
        )}
      </div>
      <section>
        <p className="eyebrow">{product.facetValues.find((value) => value.facet.code === 'product-type')?.name || 'Hakeems'}</p>
        <h1>{product.name}</h1>
        <p>{variant ? formatMoney(variant.priceWithTax, variant.currencyCode) : 'Unavailable'}</p>
        <p className="muted">{variant?.stockLevel || 'Stock checked at checkout'}</p>
        <div className="panel">
          <h2>Options</h2>
          {product.variants.map((item) => (
            <form key={item.id} action="/api/cart" method="post" className="form-grid" style={{ marginBottom: 14 }}>
              <input type="hidden" name="channel" value={channel} />
              <input type="hidden" name="variantId" value={item.id} />
              <input type="hidden" name="quantity" value="1" />
              <p>
                <strong>{item.name}</strong>
                <br />
                <span className="muted">
                  {item.options.map((option) => `${option.group.name}: ${option.name}`).join(', ')}
                </span>
              </p>
              <button type="submit">Add to Cart</button>
            </form>
          ))}
        </div>
        <section style={{ marginTop: 24 }}>
          <h2>Details</h2>
          <div dangerouslySetInnerHTML={{ __html: enriched || '' }} />
        </section>
      </section>
    </main>
  );
}
