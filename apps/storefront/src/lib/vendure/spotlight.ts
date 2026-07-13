import type { SpotlightCollectionQuery } from '@/lib/vendure/generated';

type Variant = NonNullable<SpotlightCollectionQuery['collection']>['productVariants']['items'][number];

export type ProductSwatch = { code: string; hex: string | null };

export type SpotlightProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  currencyCode: string;
  /** The variant added to the cart on quick-add — the first variant returned for this
   * product, since the spotlight rail doesn't offer a size/color picker. */
  defaultVariantId: string;
  swatches: ProductSwatch[];
};

/**
 * Collapses a flat list of ProductVariants (one per size/color combination) into one
 * card per distinct product, merging each product's color options into a de-duplicated
 * swatch row instead of repeating the same product once per color.
 */
export function groupVariantsIntoProducts(variants: Variant[]): SpotlightProduct[] {
  const byProductId = new Map<string, SpotlightProduct>();

  for (const variant of variants) {
    const colorOption = variant.options.find((option) => option.group.code === 'color');
    const product = byProductId.get(variant.product.id);

    if (!product) {
      byProductId.set(variant.product.id, {
        id: variant.product.id,
        slug: variant.product.slug,
        name: variant.product.name,
        imageUrl: variant.product.featuredAsset?.preview ?? null,
        price: variant.priceWithTax,
        currencyCode: variant.currencyCode,
        defaultVariantId: variant.id,
        swatches: colorOption ? [{ code: colorOption.code, hex: colorOption.customFields?.swatch ?? null }] : [],
      });
      continue;
    }

    const alreadyHasColor = colorOption && product.swatches.some((swatch) => swatch.code === colorOption.code);
    if (colorOption && !alreadyHasColor) {
      product.swatches.push({ code: colorOption.code, hex: colorOption.customFields?.swatch ?? null });
    }
  }

  return Array.from(byProductId.values());
}
