'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import type { ProductCardModel } from '@/lib/medusa/product-card';
import { formatPrice } from '@/lib/format';
import { QuickAddButton } from '@/components/commerce/quick-add-button';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';

const MAX_VISIBLE_SWATCHES = 5;

/**
 * The one product card used across every listing (spotlight rail, collection/shop grid,
 * search). Everything is driven by ProductCardModel — image gallery, colour swatches, sale
 * pricing and badge — with nothing hardcoded.
 *
 * Picking a colour swaps to that colour's gallery; the arrows page through that colour's photos
 * in place (no navigation), and switching colour resets to its first shot. The image and name
 * still link through to the PDP. `showQuickAdd` is opt-in so grids stay clean while the
 * spotlight keeps its quick-add affordance.
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
  /** Set for the first row of an above-the-fold grid so its image isn't lazy-loaded. */
  priority?: boolean;
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(card.colors[0]?.code ?? null);
  const [imageIndex, setImageIndex] = useState(0);

  const selectedColor = card.colors.find((color) => color.code === selectedCode) ?? null;
  const images = selectedColor && selectedColor.images.length > 0
    ? selectedColor.images
    : card.defaultImageUrl
      ? [card.defaultImageUrl]
      : [];
  const currentImage = images[imageIndex] ?? images[0] ?? null;
  const quickAddVariantId = selectedColor?.variantId ?? card.defaultVariantId;
  const href = routes.product(channelCode, card.slug);

  const selectColor = (code: string) => {
    setSelectedCode(code);
    setImageIndex(0);
  };
  const pageImage = (direction: 1 | -1) => (event: React.MouseEvent) => {
    event.preventDefault();
    setImageIndex((current) => Math.min(images.length - 1, Math.max(0, current + direction)));
  };

  const visibleColors = card.colors.slice(0, MAX_VISIBLE_SWATCHES);
  const hiddenColorCount = card.colors.length - visibleColors.length;

  const onSale = card.compareAtPrice != null && card.compareAtPrice > card.price;
  const promoText = [card.discountPercent ? `${card.discountPercent}% Off.` : null, card.promoLabel]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="group/card flex h-full flex-col">
      <div className="group/media relative overflow-hidden bg-[var(--color-hairline)]">
        <Link href={href} className="relative block aspect-[4/5]" tabIndex={-1}>
          {currentImage && (
            <Image
              key={currentImage}
              src={currentImage}
              alt={card.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-105"
            />
          )}
        </Link>

        {card.badge && (
          <span className="absolute bottom-2 left-2 bg-[var(--color-ink)]/85 px-2 py-1 text-[10px] font-medium tracking-[0.08em] text-[var(--color-paper)] uppercase">
            {card.badge}
          </span>
        )}

        {showQuickAdd && quickAddVariantId && (
          <div className="absolute top-3 right-3">
            <QuickAddButton channelCode={channelCode} variantId={quickAddVariantId} />
          </div>
        )}

        {/* Per-colour photo paging — arrows sit over (not inside) the PDP link, so a click
            pages the gallery instead of navigating. Revealed on hover, shown on touch. Both
            arrows stay mounted and disable at the ends so the affordance never shifts. */}
        {images.length > 1 && (
          <>
            <CardArrow direction="prev" onClick={pageImage(-1)} disabled={imageIndex === 0} />
            <CardArrow direction="next" onClick={pageImage(1)} disabled={imageIndex === images.length - 1} />
          </>
        )}
      </div>

      {card.colors.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {visibleColors.map((color) => {
            const isSelected = color.code === selectedCode;
            return (
              <button
                key={color.code}
                type="button"
                onClick={() => selectColor(color.code)}
                aria-label={color.label}
                aria-pressed={isSelected}
                title={color.label}
                className={`relative h-5 w-5 rounded-full border transition-shadow after:absolute after:-inset-1 ${
                  isSelected
                    ? 'border-transparent ring-1 ring-[var(--color-ink)] ring-offset-1 ring-offset-[var(--color-paper)]'
                    : 'border-[var(--color-hairline)]'
                }`}
                style={{ backgroundColor: color.hex ?? 'transparent' }}
              />
            );
          })}
          {hiddenColorCount > 0 && (
            <span className="text-[11px] text-[var(--color-ink-muted)]">+{hiddenColorCount}</span>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-1 flex-col gap-1">
        <Link href={href} className="line-clamp-2 text-sm font-medium text-[var(--color-ink)]">
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

function CardArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next';
  onClick: (event: React.MouseEvent) => void;
  disabled: boolean;
}) {
  const Icon = direction === 'prev' ? ArrowLeftIcon : ArrowRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous image' : 'Next image'}
      className={`absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-paper)]/85 text-[var(--color-ink)] shadow-sm backdrop-blur transition-opacity duration-200 hover:bg-[var(--color-paper)] focus-visible:opacity-100 disabled:cursor-default disabled:opacity-0 md:opacity-0 md:group-hover/media:opacity-100 ${
        direction === 'prev' ? 'left-2' : 'right-2'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
