import type { NewArrivalsCollectionQuery } from '@/lib/vendure/generated';

type Variant = NonNullable<NewArrivalsCollectionQuery['collection']>['productVariants']['items'][number];

export type ProductSwatch = { code: string; hex: string | null };

/**
 * A single card in the New Arrivals rail. Assembled per-product (not per-variant) from
 * Vendure data — Vendure remains the source of truth for membership, order, price and
 * imagery, so adding/removing/reordering products in the Vendure "new-arrivals" collection
 * changes the rail with no code change.
 */
export type NewArrivalProduct = {
  id: string;
  slug: string;
  name: string;
  /** Athleta-style hover swap: `primaryImage` is shown at rest, `secondaryImage`
   * cross-fades in on hover. `secondaryImage` is null when the product has only one
   * asset (the card then falls back to a subtle zoom). */
  primaryImage: string | null;
  secondaryImage: string | null;
  price: number;
  currencyCode: string;
  inStock: boolean;
  /** Variant added on quick-add — the first variant seen for this product, since the
   * rail card doesn't offer a size/colour picker. */
  defaultVariantId: string;
  swatches: ProductSwatch[];
};

/**
 * Collapses Vendure's flat variant list (one row per size/colour) into one card per
 * distinct product, merging each product's colours into a de-duplicated swatch row and
 * picking a primary + alternate image for the hover swap.
 */
export function groupVariantsIntoNewArrivals(variants: Variant[]): NewArrivalProduct[] {
  const byProductId = new Map<string, NewArrivalProduct>();

  for (const variant of variants) {
    const colorOption = variant.options.find((option) => option.group.code === 'color');
    const existing = byProductId.get(variant.product.id);

    if (!existing) {
      const assets = variant.product.assets ?? [];
      const primaryImage = variant.product.featuredAsset?.preview ?? assets[0]?.preview ?? null;
      const secondaryImage = assets.find((asset) => asset.preview !== primaryImage)?.preview ?? null;

      byProductId.set(variant.product.id, {
        id: variant.product.id,
        slug: variant.product.slug,
        name: variant.product.name,
        primaryImage,
        secondaryImage,
        price: variant.priceWithTax,
        currencyCode: variant.currencyCode,
        inStock: variant.stockLevel !== 'OUT_OF_STOCK',
        defaultVariantId: variant.id,
        swatches: colorOption ? [{ code: colorOption.code, hex: colorOption.customFields?.swatch ?? null }] : [],
      });
      continue;
    }

    const alreadyHasColor = colorOption && existing.swatches.some((swatch) => swatch.code === colorOption.code);
    if (colorOption && !alreadyHasColor) {
      existing.swatches.push({ code: colorOption.code, hex: colorOption.customFields?.swatch ?? null });
    }
  }

  return Array.from(byProductId.values());
}
