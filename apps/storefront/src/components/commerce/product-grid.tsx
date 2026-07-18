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
    // Fashion-grid rhythm: tight horizontal gutters, tall vertical breathing room.
    <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-16">
      {cards.map((card, index) => (
        <ProductCard
          key={card.productId}
          card={card}
          channelCode={channelCode}
          priority={index < PRIORITY_ROW_COUNT}
        />
      ))}
    </div>
  );
}
