import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import type { PlpProduct } from '@/lib/vendure/plp';
import { formatPriceRange } from '@/lib/format';

/**
 * PLP cards are deliberately simpler than the spotlight's ProductCard — no swatches,
 * no quick-add. `search()` (the query backing this grid) only returns facetValueIds,
 * not full variant/option data, so per-color swatches aren't available without an
 * extra round-trip per product; that detail belongs on the PDP anyway.
 */
export function ProductGrid({ products, channelCode }: { products: PlpProduct[]; channelCode: ChannelCode }) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--color-ink-muted)]">
        No products match the current filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {products.map((product) => (
        <Link key={product.productId} href={`/${channelCode}/products/${product.slug}`} className="group block">
          <div className="aspect-[4/5] overflow-hidden bg-[var(--color-hairline)]">
            {product.imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
            )}
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <h3 className="truncate text-sm font-medium text-[var(--color-ink)]">{product.name}</h3>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {formatPriceRange(product.priceMin, product.priceMax, product.currencyCode)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
