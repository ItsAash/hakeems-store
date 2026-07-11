import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCartForm } from '@/components/AddToCartForm';
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
  const typeLabel = product.facetValues.find((value) => value.facet.code === 'product-type')?.name || 'Hakeems';
  const enriched = product.customFields?.enrichedDescription || product.description;

  return (
    <main className="container section">
      <p className="breadcrumb">
        <Link href={`/${channel}`}>Home</Link> / {typeLabel}
      </p>
      <div className="pdp">
        <div className="pdp-gallery">
          {product.featuredAsset?.preview ? (
            <Image className="product-image" src={product.featuredAsset.preview} alt={product.name} width={900} height={1125} priority />
          ) : (
            <div className="product-image-placeholder" aria-hidden="true">
              <span>Hakeems</span>
            </div>
          )}
        </div>
        <section className="pdp-info">
          <p className="eyebrow">{typeLabel}</p>
          <h1>{product.name}</h1>
          <p className="pdp-price">{variant ? formatMoney(variant.priceWithTax, variant.currencyCode) : 'Unavailable'}</p>
          <p className="pdp-stock muted">{variant?.stockLevel === 'IN_STOCK' ? 'In stock, ships in 2–4 days' : variant?.stockLevel || 'Stock checked at checkout'}</p>

          {product.variants.length > 0 && <AddToCartForm channel={channel} variants={product.variants} />}

          <div className="accordion" style={{ marginTop: 32 }}>
            <details open>
              <summary>Details</summary>
              <div className="accordion-body" dangerouslySetInnerHTML={{ __html: enriched || '' }} />
            </details>
            <details>
              <summary>Shipping &amp; Returns</summary>
              <div className="accordion-body">
                <p>
                  Shipping is calculated at checkout by district/city. Exchanges are accepted within 14 days of delivery,
                  unworn and in original packaging.
                </p>
              </div>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}
