import Image from 'next/image';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channels';
import type { VendureProduct } from '@/lib/vendure';
import { formatMoney } from '@/lib/money';

export function ProductCard({ channel, product }: { channel: ChannelCode; product: VendureProduct }) {
  const variant = product.variants[0];
  const price = variant ? formatMoney(variant.priceWithTax, variant.currencyCode) : 'Unavailable';

  return (
    <article className="card">
      <Link href={`/${channel}/product/${product.slug}`}>
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
          <div className="product-image" aria-hidden="true" />
        )}
      </Link>
      <div className="card-body">
        <p className="eyebrow">{product.facetValues.find((value) => value.facet.code === 'product-type')?.name || 'Hakeems'}</p>
        <h3>
          <Link href={`/${channel}/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <p>{price}</p>
        <p className="muted">{variant?.stockLevel || 'Stock checked at checkout'}</p>
      </div>
    </article>
  );
}
