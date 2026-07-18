'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { CONTAINER } from '@/lib/ui';
import { findVariantForSelection, type PdpVariantMatrix } from '@/lib/medusa/pdp';
import { addItemToCartAction } from '@/lib/medusa/cart-actions';
import { requestCartOpen } from '@/lib/cart-events';
import { formatPrice } from '@/lib/format';
import { ProductGallery } from '@/components/commerce/product-gallery';
import { ProductDetailsTabs, type ProductDetailsTab } from '@/components/commerce/product-details-tabs';
import { WishlistButton } from '@/components/commerce/wishlist-button';
import { Overlay } from '@/components/ui/overlay';
import { CloseIcon } from '@/components/ui/icons';

type Status = 'idle' | 'loading' | 'added' | 'error';

/** CMS-curated colorway galleries keyed by lower-cased color name (see Strapi
 * `product.colorway-gallery`): where present, a color's gallery and swatch hex override
 * what Medusa's variants carry. */
export type CmsColorwayMap = Record<string, { hex: string; images: string[] }>;

/**
 * The interactive PDP shell, structured like an editorial fashion page: imagery leads on
 * the left (a scrolling two-up grid on desktop, a swipe gallery on mobile) while the
 * purchase column on the right stays pinned (`sticky`) as the images scroll. Owns the
 * option selection so gallery, price, stock and add-to-cart react together — picking a
 * colour crossfades the gallery to that colorway's assets (CMS gallery → variant images →
 * product images) and updates the selected variant, with no page reload.
 *
 * On mobile, a sticky buy bar pins the price + add-to-cart to the viewport bottom whenever
 * the primary button has scrolled away (IntersectionObserver). A successful add opens the
 * nav's cart drawer.
 */
export function ProductDetail({
  matrix,
  channelCode,
  productName,
  productSlug,
  productImages,
  detailTabs,
  cmsColorways = {},
  collectionLabel,
}: {
  matrix: PdpVariantMatrix;
  channelCode: ChannelCode;
  productName: string;
  productSlug: string;
  /** Product-level images — the fallback when the selected variant has no dedicated gallery. */
  productImages: string[];
  detailTabs: ProductDetailsTab[];
  /** Strapi colorway galleries; empty when the product has no CMS entry. */
  cmsColorways?: CmsColorwayMap;
  /** Quiet eyebrow above the title (e.g. the collection name). */
  collectionLabel?: string | null;
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>(() => matrix.variants[0]?.selections ?? {});
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buyButtonVisible, setBuyButtonVisible] = useState(true);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const buyButtonRef = useRef<HTMLButtonElement>(null);

  const selectedVariant = useMemo(() => findVariantForSelection(matrix, selections), [matrix, selections]);

  const colorGroup = matrix.optionGroups.find((g) => g.code.toLowerCase() === 'color');
  const colorGroupCode = colorGroup?.code ?? '';
  const selectedColorCode = selections[colorGroupCode] ?? '';
  const selectedColorName = colorGroup?.options.find((option) => option.code === selectedColorCode)?.name;

  // Colorway isolation chain — selecting a swatch shows ONLY that color family's assets:
  // CMS-curated colorway gallery (Strapi) → the variant's own images (Medusa) → the
  // product-level images as a last resort.
  const cmsColorway = selectedColorCode ? cmsColorways[selectedColorCode.toLowerCase()] : undefined;
  const galleryImages =
    cmsColorway && cmsColorway.images.length > 0
      ? cmsColorway.images
      : selectedVariant && selectedVariant.images.length > 0
        ? selectedVariant.images
        : productImages;

  // The size-guide affordance next to the size selector opens the matching CMS panel.
  const sizeGuideTab = detailTabs.find((tab) => /size\s*guide/i.test(tab.label));

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
    const result = await addItemToCartAction(channelCode, selectedVariant.id, 1);
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
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_26.5rem] lg:gap-20">
      {/* Keyed by colour so the gallery resets to the new colorway's first image. */}
      <ProductGallery key={selectedColorCode || 'default'} images={galleryImages} alt={productName} />

      {/* Purchase column — pinned on desktop while the image column scrolls. */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            {collectionLabel && <p className="eyebrow">{collectionLabel}</p>}
            <h1 className="font-serif text-display-lg text-[var(--color-ink)]">{productName}</h1>
            <p className="text-lg text-[var(--color-ink)]" aria-live="polite">
              {selectedVariant ? formatPrice(selectedVariant.priceWithTax, selectedVariant.currencyCode) : '—'}
            </p>
          </div>

          {matrix.optionGroups.map((group) => {
            const isColor = colorGroupCode && group.code === colorGroupCode;
            const isSize = group.code.toLowerCase() === 'size';
            return (
              <div key={group.code}>
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-2xs font-medium tracking-label text-[var(--color-ink)] uppercase">
                    {group.name}
                    {isColor && selectedColorName && (
                      <span className="ml-2 font-normal text-[var(--color-ink-muted)] normal-case">
                        {selectedColorName}
                      </span>
                    )}
                  </p>
                  {isSize && sizeGuideTab && (
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="border-b border-[var(--color-ink-muted)] pb-px text-xs text-[var(--color-ink-muted)] transition-colors duration-200 hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                    >
                      Size Guide
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) =>
                    isColor ? (
                      <ColorSwatchButton
                        key={option.id}
                        name={option.name}
                        // CMS colorHex wins over the Medusa option-value metadata swatch.
                        swatch={cmsColorways[option.code.toLowerCase()]?.hex ?? option.swatch}
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
            );
          })}

          {selectedVariant?.stockLevel === 'LOW_STOCK' && (
            <p className="flex items-center gap-2 text-sm text-[var(--color-accent)]" role="status">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              Low stock — only a few left
            </p>
          )}

          <div className="flex gap-3">
            <button
              ref={buyButtonRef}
              type="button"
              onClick={handleAddToCart}
              disabled={buttonDisabled}
              className="min-w-0 flex-1 bg-[var(--color-ink)] py-4 text-2xs font-medium tracking-cta text-[var(--color-paper)] uppercase transition-opacity duration-300 hover:opacity-85 disabled:opacity-40"
            >
              {buttonLabel}
            </button>
            <WishlistButton slug={productSlug} productName={productName} size="pdp" className="shrink-0" />
          </div>

          <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
            Dispatched in 1–2 business days · 14-day returns · Shipping calculated at checkout
          </p>

          {status === 'error' && errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

          <ProductDetailsTabs tabs={detailTabs} />
        </div>
      </div>

      {/* Size guide overlay — the CMS panel content in a right-hand sheet. */}
      {sizeGuideTab && (
        <Overlay
          open={sizeGuideOpen}
          onClose={() => setSizeGuideOpen(false)}
          label="Size guide"
          panelClassName="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[var(--color-paper-raised)] shadow-overlay"
          panelClosedClassName="translate-x-full"
          panelOpenClassName="translate-x-0"
        >
          <div className="flex items-center justify-between border-b hairline px-6 py-5">
            <p className="text-2xs font-medium tracking-label text-[var(--color-ink)] uppercase">Size Guide</p>
            <button
              type="button"
              onClick={() => setSizeGuideOpen(false)}
              aria-label="Close size guide"
              className="relative after:absolute after:-inset-3"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 text-sm text-[var(--color-ink-muted)]">
            {sizeGuideTab.content}
          </div>
        </Overlay>
      )}

      {/* Mobile sticky buy bar — mounted only while the primary button is off screen so
          screen readers never see two identical buttons at once. */}
      {showStickyBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t hairline bg-[var(--color-paper-raised)] px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-sticky lg:hidden">
          <div className={`${CONTAINER} flex items-center gap-4`}>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-xs text-[var(--color-ink-muted)]">{productName}</p>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {selectedVariant ? formatPrice(selectedVariant.priceWithTax, selectedVariant.currencyCode) : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={buttonDisabled}
              className="shrink-0 bg-[var(--color-ink)] px-6 py-3.5 text-2xs font-medium tracking-cta text-[var(--color-paper)] uppercase transition-opacity duration-300 hover:opacity-85 disabled:opacity-40"
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
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200 ${
        isSelected ? 'border-[var(--color-ink)]' : 'border-transparent hover:border-[var(--color-hairline)]'
      }`}
    >
      <span
        className="block h-7 w-7 rounded-full border border-[var(--color-hairline)]"
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
      className={`min-w-12 border px-4 py-3 text-sm transition-colors duration-200 ${
        isSelected
          ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
          : 'border-[var(--color-hairline)] text-[var(--color-ink)] hover:border-[var(--color-ink)]'
      }`}
    >
      {name}
    </button>
  );
}
