'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { findVariantForSelection, type PdpVariantMatrix } from '@/lib/vendure/pdp';
import { addItemToOrderAction } from '@/lib/vendure/actions';
import { requestCartOpen } from '@/lib/cart-events';
import { formatPrice } from '@/lib/format';
import { ProductGallery } from '@/components/commerce/product-gallery';
import { ProductDetailsTabs, type ProductDetailsTab } from '@/components/commerce/product-details-tabs';

type Status = 'idle' | 'loading' | 'added' | 'error';

/**
 * The interactive PDP shell. Owns the option selection so the gallery, price, stock, and
 * add-to-cart all react to it in one place — picking a colour instantly swaps the gallery to
 * that colour's images and updates the selected variant (price/stock), with no page reload.
 *
 * Everything is data-driven from the Vendure variant matrix: option groups, swatches, and
 * per-colour imagery all come from the variants, so adding a colour variant in Vendure makes
 * it appear here automatically — nothing is hardcoded.
 *
 * On mobile, a sticky buy bar pins the price + add-to-cart to the viewport bottom whenever
 * the primary button has scrolled away (IntersectionObserver), so the purchase action is
 * never more than a thumb-reach away. A successful add opens the nav's cart drawer.
 */
export function ProductDetail({
  matrix,
  channelCode,
  productName,
  productImages,
  detailTabs,
}: {
  matrix: PdpVariantMatrix;
  channelCode: ChannelCode;
  productName: string;
  /** Product-level images — the fallback when the selected variant has no dedicated gallery. */
  productImages: string[];
  detailTabs: ProductDetailsTab[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>(() => matrix.variants[0]?.selections ?? {});
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buyButtonVisible, setBuyButtonVisible] = useState(true);
  const buyButtonRef = useRef<HTMLButtonElement>(null);

  const selectedVariant = useMemo(() => findVariantForSelection(matrix, selections), [matrix, selections]);

  // The gallery follows the selected variant's imagery (colours differ; sizes share), falling
  // back to product-level images when a variant has none.
  const galleryImages = selectedVariant && selectedVariant.images.length > 0 ? selectedVariant.images : productImages;
  const selectedColorCode = selections['color'] ?? '';
  const selectedColorName = matrix.optionGroups
    .find((group) => group.code === 'color')
    ?.options.find((option) => option.code === selectedColorCode)?.name;

  // Drive the mobile sticky bar from the primary button's viewport visibility.
  useEffect(() => {
    const button = buyButtonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(([entry]) => setBuyButtonVisible(entry?.isIntersecting ?? true), {
      rootMargin: '0px 0px -10% 0px',
    });
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  const selectOption = (groupCode: string, optionCode: string) => {
    setSelections((current) => ({ ...current, [groupCode]: optionCode }));
    setStatus('idle');
    setErrorMessage(null);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setStatus('loading');
    const result = await addItemToOrderAction(channelCode, selectedVariant.id, 1);
    if (result.success) {
      setStatus('added');
      router.refresh();
      requestCartOpen();
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
      setErrorMessage(result.message);
    }
  };

  const buttonLabel = !selectedVariant
    ? 'Select options'
    : !selectedVariant.inStock
      ? 'Out of Stock'
      : status === 'loading'
        ? 'Adding…'
        : status === 'added'
          ? 'Added to Cart'
          : 'Add to Cart';

  const buttonDisabled = !selectedVariant || !selectedVariant.inStock || status === 'loading';
  const showStickyBar = !buyButtonVisible && !!selectedVariant;

  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Keyed by colour so the active thumbnail resets to the new colour's first image. */}
      <ProductGallery key={selectedColorCode || 'default'} images={galleryImages} alt={productName} />

      <div className="flex flex-col gap-6 lg:max-w-md lg:py-4">
        <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">{productName}</h1>

        <p className="text-2xl text-[var(--color-ink)]">
          {selectedVariant ? formatPrice(selectedVariant.priceWithTax, selectedVariant.currencyCode) : '—'}
        </p>

        {matrix.optionGroups.map((group) => (
          <div key={group.code}>
            <p className="mb-2.5 text-xs font-semibold tracking-[0.1em] text-[var(--color-ink)] uppercase">
              {group.name}
              {group.code === 'color' && selectedColorName && (
                <span className="ml-2 font-normal text-[var(--color-ink-muted)] normal-case">· {selectedColorName}</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) =>
                group.code === 'color' ? (
                  <ColorSwatchButton
                    key={option.id}
                    name={option.name}
                    swatch={option.swatch}
                    isSelected={selections[group.code] === option.code}
                    onClick={() => selectOption(group.code, option.code)}
                  />
                ) : (
                  <SizeButton
                    key={option.id}
                    name={option.name}
                    isSelected={selections[group.code] === option.code}
                    onClick={() => selectOption(group.code, option.code)}
                  />
                ),
              )}
            </div>
          </div>
        ))}

        {selectedVariant?.stockLevel === 'LOW_STOCK' && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-accent)]" role="status">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Low stock — only a few left
          </p>
        )}

        <button
          ref={buyButtonRef}
          type="button"
          onClick={handleAddToCart}
          disabled={buttonDisabled}
          className="mt-2 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.15em] text-[var(--color-paper)] uppercase transition-opacity duration-300 hover:opacity-90 disabled:opacity-40"
        >
          {buttonLabel}
        </button>

        {status === 'error' && errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

        <ProductDetailsTabs tabs={detailTabs} />
      </div>

      {/* Mobile sticky buy bar — mounted only while the primary button is off screen so
          screen readers never see two identical buttons at once. */}
      {showStickyBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t hairline bg-[var(--color-paper-raised)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(20,18,15,0.08)] lg:hidden">
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-xs text-[var(--color-ink-muted)]">{productName}</p>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {selectedVariant ? formatPrice(selectedVariant.priceWithTax, selectedVariant.currencyCode) : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={buttonDisabled}
              className="flex-1 bg-[var(--color-ink)] py-3.5 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorSwatchButton({
  name,
  swatch,
  isSelected,
  onClick,
}: {
  name: string;
  swatch: string | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-label={name}
      aria-pressed={isSelected}
      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
        isSelected ? 'border-[var(--color-ink)]' : 'border-transparent hover:border-[var(--color-hairline)]'
      }`}
    >
      <span
        className="block h-full w-full rounded-full border border-[var(--color-hairline)]"
        style={{ backgroundColor: swatch ?? 'transparent' }}
      />
    </button>
  );
}

function SizeButton({ name, isSelected, onClick }: { name: string; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`min-w-11 border px-3.5 py-2.5 text-sm transition-colors duration-200 ${
        isSelected
          ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
          : 'border-[var(--color-hairline)] text-[var(--color-ink)] hover:border-[var(--color-ink)]'
      }`}
    >
      {name}
    </button>
  );
}
