import type { ChannelCode } from '@/lib/channel';
import type { ProductCardModel } from '@/lib/medusa/product-card';
import { ProductCard } from '@/components/commerce/product-card';

const PRIORITY_ROW_COUNT = 4;

/**
 * Collection / shop / search results grid. Each cell is the shared ProductCard, so listings
 * get the same colour swatches, sale pricing and badges as the spotlight rail. Cards are built
 * upstream (see products.ts) from Medusa's product list + enrichment.
 */
export function ProductGrid({ cards, channelCode }: { cards: ProductCardModel[]; channelCode: ChannelCode }) {
  if (cards.length === 0) {
    return (
      <p className="py-section-sm text-center text-sm text-[var(--color-ink-muted)]">
        No products match the current filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {cards.map((card, index) => (
        <ProductCard
          key={card.productId}
          card={card}
          channelCode={channelCode}
          // The first row is above the fold on every breakpoint (up to the 4-col desktop
          // layout), so it shouldn't lazy-load.
          priority={index < PRIORITY_ROW_COUNT}
        />
      ))}
    </div>
  );
}
