import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import type { SpotlightProduct } from '@/lib/vendure/spotlight';
import { formatPrice } from '@/lib/format';
import { QuickAddButton } from '@/components/commerce/quick-add-button';

const MAX_VISIBLE_SWATCHES = 4;

export function ProductCard({ product, channelCode }: { product: SpotlightProduct; channelCode: ChannelCode }) {
  const href = `/${channelCode}/products/${product.slug}`;
  const visibleSwatches = product.swatches.slice(0, MAX_VISIBLE_SWATCHES);
  const hiddenSwatchCount = product.swatches.length - visibleSwatches.length;

  return (
    <div className="group/card flex h-full flex-col">
      <div className="relative overflow-hidden bg-[var(--color-hairline)]">
        <Link href={href} className="block aspect-[4/5]" tabIndex={-1}>
          {product.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105"
              loading="lazy"
            />
          )}
        </Link>
        <div className="absolute top-3 right-3">
          <QuickAddButton channelCode={channelCode} variantId={product.defaultVariantId} />
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-1.5">
        <Link href={href} className="truncate text-sm font-medium text-[var(--color-ink)]">
          {product.name}
        </Link>
        <p className="text-sm text-[var(--color-ink-muted)]">{formatPrice(product.price, product.currencyCode)}</p>

        {visibleSwatches.length > 0 && (
          <div className="mt-auto flex items-center gap-1.5 pt-1.5">
            {visibleSwatches.map((swatch) => (
              <span
                key={swatch.code}
                title={swatch.code}
                className="h-3.5 w-3.5 rounded-full border border-[var(--color-hairline)]"
                style={{ backgroundColor: swatch.hex ?? 'transparent' }}
              />
            ))}
            {hiddenSwatchCount > 0 && (
              <span className="text-[11px] text-[var(--color-ink-muted)]">+{hiddenSwatchCount}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
