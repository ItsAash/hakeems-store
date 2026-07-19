'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getWishlist, onWishlistChange } from '@/lib/wishlist';
import { fetchWishlistCardsAction } from '@/lib/medusa/wishlist-actions';
import type { ProductCardModel } from '@/lib/medusa/product-card';
import { ProductCard } from '@/components/commerce/product-card';

type State = 'loading' | 'ready';

/** Client shell of the wishlist page: reads saved handles from localStorage, resolves them
 * to cards via one server action, and live-removes cards as hearts are toggled off. */
export function WishlistGrid({ channelCode }: { channelCode: ChannelCode }) {
  const [state, setState] = useState<State>('loading');
  const [cards, setCards] = useState<ProductCardModel[]>([]);
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    setSlugs(getWishlist());
    return onWishlistChange(() => setSlugs(getWishlist()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (slugs.length === 0) {
      setCards([]);
      setState('ready');
      return;
    }
    // Only fetch for handles we don't already have; removals filter locally.
    setCards((current) => current.filter((card) => slugs.includes(card.slug)));
    const missing = slugs.filter((slug) => !cards.some((card) => card.slug === slug));
    if (missing.length === 0) {
      setState('ready');
      return;
    }
    fetchWishlistCardsAction(channelCode, slugs).then((fetched) => {
      if (cancelled) return;
      setCards(fetched);
      setState('ready');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs, channelCode]);

  if (state === 'loading') {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] skeleton" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 py-16">
        <p className="max-w-md text-[var(--color-ink-muted)]">
          Nothing saved yet. Tap the heart on any piece to keep it here.
        </p>
        <Link
          href={routes.shop(channelCode)}
          className="inline-flex items-center bg-[var(--color-ink)] px-10 py-4 text-2xs font-medium tracking-cta text-[var(--color-paper)] uppercase transition-opacity duration-300 hover:opacity-85"
        >
          Shop All
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <ProductCard key={card.productId} card={card} channelCode={channelCode} showQuickAdd />
      ))}
    </div>
  );
}
