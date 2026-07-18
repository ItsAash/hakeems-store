import type {
  MedusaProduct as StoreProduct,
  MedusaProductVariant as StoreProductVariant,
} from '@/lib/medusa/types';

const LOW_STOCK_THRESHOLD = 5;

function variantStockLevel(variant: StoreProductVariant): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  const qty = variant.inventory_quantity;
  if (qty === null || qty === undefined) return 'IN_STOCK';
  if (variant.allow_backorder) return 'IN_STOCK';
  if (!variant.manage_inventory) return 'IN_STOCK';
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export type MedusaProductCardColor = {
  code: string;
  label: string;
  hex: string | null;
  images: string[];
  variantId: string;
  stockLevel: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
};

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
  colors: MedusaProductCardColor[];
  defaultImageUrl: string | null;
  defaultVariantId: string | null;
  stockLevel: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  isNew: boolean;
};

export function deriveCompareAtPrice(price: number, discountPercent: number | null | undefined): number | null {
  if (!discountPercent || discountPercent <= 0 || discountPercent >= 100) return null;
  const raw = price / (1 - discountPercent / 100);
  return Math.round(raw / 100) * 100;
}

function variantImages(variant: StoreProductVariant): string[] {
  const urls = (variant.images ?? []).map((img) => img.url);
  return Array.from(new Set(urls.filter(Boolean)));
}

/** Medusa stores amounts as-is (major units); normalize to integer minor units here so
 * every downstream consumer of ProductCardModel.price (formatPrice, deriveCompareAtPrice)
 * keeps working unchanged regardless of which backend produced the card. */
function variantPrice(variant: StoreProductVariant): number | null {
  const amount = variant.calculated_price?.calculated_amount;
  return amount == null ? null : Math.round(amount * 100);
}

function variantCurrency(variant: StoreProductVariant): string | null {
  return variant.calculated_price?.currency_code ?? null;
}

function collectColors(variants: StoreProductVariant[], optionTitle: string): MedusaProductCardColor[] {
  const colors = new Map<string, MedusaProductCardColor>();
  for (const variant of variants) {
    const colorValue = variant.options?.find(
      (ov) => ov.option?.title?.toLowerCase() === optionTitle.toLowerCase(),
    );
    if (!colorValue || colors.has(colorValue.value)) continue;
    colors.set(colorValue.value, {
      code: colorValue.value,
      label: colorValue.value,
      hex: (colorValue.metadata?.swatch as string) ?? null,
      images: variantImages(variant),
      variantId: variant.id,
      stockLevel: variantStockLevel(variant),
    });
  }
  return Array.from(colors.values());
}

export function getOptionTitle(product: StoreProduct): string | null {
  const colorOption = product.options?.find(
    (o) => o.title?.toLowerCase() === 'color' || o.title?.toLowerCase() === 'colour',
  );
  return colorOption?.title ?? product.options?.[0]?.title ?? null;
}

export function buildProductCard(product: StoreProduct): ProductCardModel {
  const variants = product.variants ?? [];
  const firstVariant = variants[0];
  const fallbackCurrency = firstVariant ? variantCurrency(firstVariant) : null;
  const firstPrice = firstVariant ? variantPrice(firstVariant) : null;
  const colorOptionTitle = getOptionTitle(product);
  const colors = colorOptionTitle ? collectColors(variants, colorOptionTitle) : [];

  let defaultImageUrl: string | null = null;
  if (product.thumbnail) {
    defaultImageUrl = product.thumbnail;
  } else if (product.images?.length) {
    defaultImageUrl = product.images[0]!.url;
  } else if (colors[0]?.images[0]) {
    defaultImageUrl = colors[0].images[0];
  }

  let minPrice: number | null = null;
  let currencyCode = fallbackCurrency ?? 'npr';
  for (const v of variants) {
    const p = variantPrice(v);
    if (p !== null && (minPrice === null || p < minPrice)) {
      minPrice = p;
      const c = variantCurrency(v);
      if (c) currencyCode = c;
    }
  }

  const promoLabel = (product.metadata?.promo_label as string) ?? null;
  const badge = (product.metadata?.badge as string) ?? null;
  const discountPercent = (product.metadata?.discount_percent as number) ?? null;

  let stockLevel: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
  for (const v of variants) {
    const level = variantStockLevel(v);
    if (level === 'OUT_OF_STOCK') { stockLevel = 'OUT_OF_STOCK'; break; }
    if (level === 'LOW_STOCK') stockLevel = 'LOW_STOCK';
  }

  const isNew = product.created_at
    ? Date.now() - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
    : false;

  return {
    productId: product.id,
    slug: product.handle,
    name: product.title,
    currencyCode,
    price: minPrice ?? firstPrice ?? 0,
    compareAtPrice: deriveCompareAtPrice(minPrice ?? firstPrice ?? 0, discountPercent),
    discountPercent,
    promoLabel,
    badge,
    colors,
    defaultImageUrl,
    defaultVariantId: firstVariant?.id ?? null,
    stockLevel,
    isNew,
  };
}

export function buildProductCards(products: StoreProduct[]): ProductCardModel[] {
  return products.map(buildProductCard);
}
