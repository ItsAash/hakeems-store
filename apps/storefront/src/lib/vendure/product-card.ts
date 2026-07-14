import type { ProductCardsQuery, SpotlightCollectionQuery } from '@/lib/vendure/generated';
import type { PlpProduct } from '@/lib/vendure/plp';

/** One selectable colour on a card: its swatch hex, the gallery of images to swipe through
 * when picked (lead image first), and the variant to quick-add for that colour. */
export type ProductCardColor = {
  code: string;
  label: string;
  hex: string | null;
  images: string[];
  variantId: string;
};

/**
 * The single, channel-agnostic shape every product card renders from — built from either the
 * PLP `search` + `ProductCards` enrichment or a collection's variants (spotlight). All values
 * come from Vendure; nothing is hardcoded.
 *
 * `price` is the amount actually charged (live `priceWithTax`). `compareAtPrice` is derived
 * from `discountPercent` so the strikethrough is always in the right currency and the "% off"
 * stays consistent with the real price — see `deriveCompareAtPrice`.
 */
export type ProductCardModel = {
  productId: string;
  slug: string;
  name: string;
  currencyCode: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  promoLabel: string | null;
  badge: string | null;
  colors: ProductCardColor[];
  defaultImageUrl: string | null;
  /** First variant — used for quick-add when the card offers it. */
  defaultVariantId: string | null;
};

/** The "was" price implied by a discount percent, in the same currency/units as `price`.
 * `price` is the discounted amount the customer pays; the was-price is grossed back up. */
export function deriveCompareAtPrice(price: number, discountPercent: number | null | undefined): number | null {
  if (!discountPercent || discountPercent <= 0 || discountPercent >= 100) return null;
  // Round to a whole currency unit (minor units are 1/100) so the strikethrough "was" price
  // reads as cleanly as the sale price instead of showing derived cents (e.g. 4,166.67).
  const raw = price / (1 - discountPercent / 100);
  return Math.round(raw / 100) * 100;
}

type VariantLike = {
  id: string;
  featuredAsset?: { preview: string } | null;
  assets?: Array<{ preview: string }> | null;
  options: Array<{ code: string; name: string; group: { code: string }; customFields?: { swatch?: string | null } | null }>;
};

/** This variant's images: featured lead first, then its other assets, de-duplicated. */
function variantImages(variant: VariantLike): string[] {
  const previews = [variant.featuredAsset?.preview, ...(variant.assets ?? []).map((asset) => asset.preview)];
  return Array.from(new Set(previews.filter((preview): preview is string => Boolean(preview))));
}

/** De-duplicated colour list from a product's variants, each with its image gallery + variant. */
function collectColors(variants: VariantLike[]): ProductCardColor[] {
  const colors = new Map<string, ProductCardColor>();
  for (const variant of variants) {
    const colorOption = variant.options.find((option) => option.group.code === 'color');
    if (!colorOption || colors.has(colorOption.code)) continue;
    colors.set(colorOption.code, {
      code: colorOption.code,
      label: colorOption.name,
      hex: colorOption.customFields?.swatch ?? null,
      images: variantImages(variant),
      variantId: variant.id,
    });
  }
  return Array.from(colors.values());
}

type ProductCardData = ProductCardsQuery['products']['items'][number];

/**
 * Builds cards for a PLP/collection grid: `search` provides the ordered, facet-filtered set
 * and the live price; the `ProductCards` query (by id) supplies colours + merchandising
 * custom fields. Products missing from the enrichment still render (price/name only).
 */
export function buildProductCards(searchProducts: PlpProduct[], cardData: ProductCardData[]): ProductCardModel[] {
  const byId = new Map(cardData.map((product) => [product.id, product]));

  return searchProducts.map((product) => {
    const data = byId.get(product.productId);
    const colors = data ? collectColors(data.variants) : [];
    const discountPercent = data?.customFields?.discountPercent ?? null;
    const defaultImageUrl = product.imageUrl ?? data?.featuredAsset?.preview ?? colors[0]?.images[0] ?? null;

    return {
      productId: product.productId,
      slug: product.slug,
      name: product.name,
      currencyCode: product.currencyCode,
      price: product.priceMin,
      compareAtPrice: deriveCompareAtPrice(product.priceMin, discountPercent),
      discountPercent,
      promoLabel: data?.customFields?.promoLabel ?? null,
      badge: data?.customFields?.badge ?? null,
      colors,
      defaultImageUrl,
      defaultVariantId: data?.variants[0]?.id ?? null,
    };
  });
}

type SpotlightVariant = NonNullable<SpotlightCollectionQuery['collection']>['productVariants']['items'][number];

/**
 * Builds cards from a collection's flat variant list (spotlight rail): collapses variants into
 * one card per product, merging colours and reading merchandising fields off the product.
 */
export function buildSpotlightCards(variants: SpotlightVariant[]): ProductCardModel[] {
  const byProductId = new Map<string, SpotlightVariant[]>();
  const order: string[] = [];
  for (const variant of variants) {
    const id = variant.product.id;
    if (!byProductId.has(id)) {
      byProductId.set(id, []);
      order.push(id);
    }
    byProductId.get(id)!.push(variant);
  }

  return order.map((id) => {
    const group = byProductId.get(id)!;
    const first = group[0]!;
    const discountPercent = first.product.customFields?.discountPercent ?? null;
    const colors = collectColors(group);

    return {
      productId: id,
      slug: first.product.slug,
      name: first.product.name,
      currencyCode: first.currencyCode,
      price: first.priceWithTax,
      compareAtPrice: deriveCompareAtPrice(first.priceWithTax, discountPercent),
      discountPercent,
      promoLabel: first.product.customFields?.promoLabel ?? null,
      badge: first.product.customFields?.badge ?? null,
      colors,
      defaultImageUrl: first.product.featuredAsset?.preview ?? colors[0]?.images[0] ?? null,
      defaultVariantId: first.id,
    };
  });
}
