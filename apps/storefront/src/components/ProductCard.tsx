import Image from 'next/image';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channels';
import type { VendureProduct } from '@/lib/vendure';
import { formatMoney } from '@/lib/money';

export function ProductCard({ channel, product }: { channel: ChannelCode; product: VendureProduct }) {
  const variant = product.variants[0];
  const price = variant ? formatMoney(variant.priceWithTax, variant.currencyCode) : 'Unavailable';
  const typeLabel = product.facetValues.find((value) => value.facet.code === 'product-type')?.name || 'Hakeems';

  return (
    <article className="card">
      <Link href={`/${channel}/product/${product.slug}`}>
        <div className="card-media">
          {product.featuredAsset?.preview ? (
            <Image
              className="product-image"
              src={product.featuredAsset.preview}
              alt={product.name}
              width={600}
              height={750}
              loading="lazy"
            />
          ) : (
            <div className="product-image-placeholder" aria-hidden="true">
              <span>Hakeems</span>
            </div>
          )}
        </div>
      </Link>
      <div className="card-body">
        <p className="eyebrow">{typeLabel}</p>
        <p className="card-title">
          <Link href={`/${channel}/product/${product.slug}`}>{product.name}</Link>
        </p>
        <p className="card-price">{price}</p>
        <p className="card-stock muted">{variant?.stockLevel === 'IN_STOCK' ? 'In stock' : variant?.stockLevel || 'Stock checked at checkout'}</p>
      </div>
    </article>
  );
}
