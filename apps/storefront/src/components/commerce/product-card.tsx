'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import type { ProductCardModel } from '@/lib/medusa/product-card';
import { formatPrice } from '@/lib/format';
import { QuickAddButton } from '@/components/commerce/quick-add-button';
import { WishlistButton } from '@/components/commerce/wishlist-button';

const MAX_VISIBLE_SWATCHES = 5;
const HOVER_CYCLE_INTERVAL = 1800;

/**
 * The product card, rebuilt around the image (Athleta discipline, Prada restraint):
 * a tall 3:4 photograph with almost no chrome — a single text badge, a wishlist heart and
 * a slide-up Quick Add that only exist on hover/focus — then swatches, name and price in a
 * quiet stack below. Selecting a swatch crossfades the image to that colorway's gallery
 * (CMS-curated when the merchandiser has authored one, variant imagery otherwise); hovering
 * pages through the active colorway. No arrows, no boxes, no competing pills.
 */
export function ProductCard({
  card,
  channelCode,
  showQuickAdd = false,
  priority = false,
}: {
  card: ProductCardModel;
  channelCode: ChannelCode;
  showQuickAdd?: boolean;
  priority?: boolean;
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(card.colors[0]?.code ?? null);
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedColor = card.colors.find((color) => color.code === selectedCode) ?? null;
  const images = selectedColor && selectedColor.images.length > 0
    ? selectedColor.images
    : card.defaultImageUrl
      ? [card.defaultImageUrl]
      : [];
  const currentImage = images[imageIndex] ?? images[0] ?? null;
  const quickAddSizeVariants =
    selectedColor?.sizeVariants ??
    (card.defaultVariantId ? [{ size: '', variantId: card.defaultVariantId, inStock: true }] : []);
  const href = routes.product(channelCode, card.slug);

  const selectColor = (code: string) => {
    setSelectedCode(code);
    setImageIndex(0);
  };

  const startCycle = useCallback(() => {
    if (images.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    intervalRef.current = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % images.length);
    }, HOVER_CYCLE_INTERVAL);
  }, [images.length]);

  const stopCycle = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isHovered) {
      startCycle();
    } else {
      stopCycle();
      setImageIndex(0);
    }
    return stopCycle;
  }, [isHovered, startCycle, stopCycle]);

  const visibleColors = card.colors.slice(0, MAX_VISIBLE_SWATCHES);
  const hiddenColorCount = card.colors.length - visibleColors.length;

  const onSale = card.compareAtPrice != null && card.compareAtPrice > card.price;
  const promoText = [card.discountPercent ? `${card.discountPercent}% Off.` : null, card.promoLabel]
    .filter(Boolean)
    .join(' ');

  const currentStockLevel = selectedColor?.stockLevel ?? card.stockLevel;
  // Badges are deliberate: explicit merchandising metadata or a genuine stock signal.
  // (No time-based auto-"New" — a freshly seeded catalog would stamp every card.)
  const badgeText = currentStockLevel === 'LOW_STOCK' ? 'Low Stock' : card.badge;

  return (
    <div
      className="group/card flex h-full flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden bg-[var(--color-hairline)]">
        <Link href={href} className="relative block aspect-[3/4]" tabIndex={-1}>
          {currentImage && (
            /* Keyed on src → remount re-triggers the crossfade, so color/hover swaps read
               as a soft dissolve instead of a hard cut. */
            <Image
              key={currentImage}
              src={currentImage}
              alt={card.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="animate-fade-in object-cover transition-transform duration-700 ease-luxe group-hover/card:scale-[1.04]"
            />
          )}
          {currentStockLevel === 'OUT_OF_STOCK' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-paper)]/55">
              <span className="border border-[var(--color-ink)] px-3 py-1.5 text-3xs font-medium tracking-label text-[var(--color-ink)] uppercase">
                Sold Out
              </span>
            </div>
          )}
        </Link>

        {/* One quiet text badge, top-left — never a stack of pills. */}
        {badgeText && (
          <span className="absolute top-3 left-3 bg-[var(--color-paper)]/90 px-2.5 py-1 text-3xs font-medium tracking-label text-[var(--color-ink)] uppercase backdrop-blur">
            {badgeText}
          </span>
        )}

        {/* Hover chrome: heart top-right, Quick Add sliding up from the image's bottom edge.
            Both stay reachable by keyboard (focus-within) and are simply always-visible on
            touch devices via the md: gating. */}
        <div className="absolute top-3 right-3 transition-opacity duration-200 md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100">
          <WishlistButton slug={card.slug} productName={card.name} />
        </div>

        {showQuickAdd && quickAddSizeVariants.length > 0 && currentStockLevel !== 'OUT_OF_STOCK' && (
          <div className="absolute inset-x-0 bottom-0 translate-y-0 transition-transform duration-300 ease-out md:translate-y-full md:group-hover/card:translate-y-0 md:group-focus-within/card:translate-y-0">
            <QuickAddButton channelCode={channelCode} sizeVariants={quickAddSizeVariants} />
          </div>
        )}
      </div>

      {card.colors.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          {visibleColors.map((color) => {
            const isSelected = color.code === selectedCode;
            return (
              <button
                key={color.code}
                type="button"
                onClick={() => selectColor(color.code)}
                aria-label={`View in ${color.label}`}
                aria-pressed={isSelected}
                title={color.label}
                className={`relative h-4 w-4 rounded-full border transition-shadow duration-200 after:absolute after:-inset-1.5 ${
                  isSelected
                    ? 'border-transparent ring-1 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-paper)]'
                    : 'border-[var(--color-hairline)] hover:ring-1 hover:ring-[var(--color-ink-muted)] hover:ring-offset-2 hover:ring-offset-[var(--color-paper)]'
                }`}
                style={{ backgroundColor: color.hex ?? 'transparent' }}
              />
            );
          })}
          {hiddenColorCount > 0 && (
            <span className="text-2xs text-[var(--color-ink-muted)]">+{hiddenColorCount}</span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex flex-1 flex-col gap-1">
        <Link href={href} className="line-clamp-2 text-sm text-[var(--color-ink)]">
          {card.name}
        </Link>

        <div className="flex items-center gap-2 text-sm">
          {onSale && (
            <span className="text-[var(--color-ink-muted)] line-through">
              {formatPrice(card.compareAtPrice!, card.currencyCode)}
            </span>
          )}
          <span className={onSale ? 'font-medium text-[var(--color-sale)]' : 'text-[var(--color-ink-muted)]'}>
            {formatPrice(card.price, card.currencyCode)}
          </span>
        </div>

        {promoText && <p className="text-xs text-[var(--color-ink-muted)]">{promoText}</p>}
      </div>
    </div>
  );
}
