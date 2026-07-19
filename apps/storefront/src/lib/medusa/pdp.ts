import type { MedusaProduct, MedusaProductVariant } from '@/lib/medusa/types';

export type PdpVariantOption = { id: string; code: string; name: string; swatch: string | null };

export type PdpVariant = {
  id: string;
  sku: string;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  inStock: boolean;
  imageUrl: string | null;
  images: string[];
  selections: Record<string, string>;
};

export type PdpVariantMatrix = {
  variants: PdpVariant[];
  optionGroups: Array<{ code: string; name: string; options: PdpVariantOption[] }>;
  variantsBySelectionKey: Map<string, PdpVariant>;
};

function selectionKey(selections: Record<string, string>): string {
  return Object.entries(selections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, option]) => `${group}:${option}`)
    .join('|');
}

function isInStock(variant: MedusaProductVariant): boolean {
  const inventoryQty = variant.inventory_quantity;
  if (inventoryQty === null || inventoryQty === undefined) return true;
  if (variant.allow_backorder) return true;
  if (!variant.manage_inventory) return true;
  return inventoryQty > 0;
}

const LOW_STOCK_THRESHOLD = 5;

export function getStockLevel(variant: MedusaProductVariant): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  const inventoryQty = variant.inventory_quantity;
  if (inventoryQty === null || inventoryQty === undefined) return 'IN_STOCK';
  if (variant.allow_backorder) return 'IN_STOCK';
  if (!variant.manage_inventory) return 'IN_STOCK';
  if (inventoryQty <= 0) return 'OUT_OF_STOCK';
  if (inventoryQty <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function buildVariantMatrix(product: MedusaProduct): PdpVariantMatrix {
  const variants = product.variants ?? [];
  const options = product.options ?? [];

  const optionsByTitle = new Map(
    options.map((o) => [o.title, o]),
  );

  const groupOrder: string[] = [];
  const groupNames = new Map<string, string>();
  const optionsByGroup = new Map<string, Map<string, PdpVariantOption>>();
  const pdpVariants: PdpVariant[] = [];
  const variantsBySelectionKey = new Map<string, PdpVariant>();

  for (const variant of variants) {
    const selections: Record<string, string> = {};

    for (const ov of variant.options ?? []) {
      const groupTitle = ov.option?.title ?? '';
      if (!optionsByGroup.has(groupTitle)) {
        optionsByGroup.set(groupTitle, new Map());
        groupOrder.push(groupTitle);
        groupNames.set(groupTitle, groupTitle);
      }
      const optionDef = optionsByTitle.get(groupTitle);
      const existingOptions = optionsByGroup.get(groupTitle)!;
      if (!existingOptions.has(ov.value)) {
        existingOptions.set(ov.value, {
          id: ov.id,
          code: ov.value,
          name: ov.value,
          swatch: (ov.metadata?.swatch as string) ?? null,
        });
      }
      selections[groupTitle] = ov.value;
    }

    const variantImages = (variant.images ?? []).map((img) => img.url);
    const cp = variant.calculated_price;
    // Medusa stores amounts as-is (major units); formatPrice() everywhere else in this
    // codebase expects integer minor units (Vendure's convention) — normalize here, once,
    // at the boundary rather than teaching every shared component about the source backend.
    const price = Math.round((cp?.calculated_amount ?? 0) * 100);
    const currency = cp?.currency_code ?? 'npr';

    const pdpVariant: PdpVariant = {
      id: variant.id,
      sku: variant.sku ?? '',
      priceWithTax: price,
      currencyCode: currency,
      stockLevel: getStockLevel(variant),
      inStock: isInStock(variant),
      imageUrl: variantImages[0] ?? null,
      images: variantImages,
      selections,
    };

    pdpVariants.push(pdpVariant);
    variantsBySelectionKey.set(selectionKey(selections), pdpVariant);
  }

  const sortedGroups = [...groupOrder].sort((a, b) => {
    if (a === 'Size') return -1;
    if (b === 'Size') return 1;
    return 0;
  });

  return {
    variants: pdpVariants,
    optionGroups: sortedGroups.map((code) => ({
      code,
      name: groupNames.get(code) ?? code,
      options: Array.from(optionsByGroup.get(code)?.values() ?? []),
    })),
    variantsBySelectionKey,
  };
}

export function findVariantForSelection(
  matrix: PdpVariantMatrix,
  selections: Record<string, string>,
): PdpVariant | null {
  return matrix.variantsBySelectionKey.get(selectionKey(selections)) ?? null;
}

/** Curated merchandising categories — real memberships, but not taxonomy: they don't
 * belong in a breadcrumb trail. */
const MERCHANDISING_CATEGORY_HANDLES = new Set(['spotlight', 'new-arrivals']);

export function getProductBreadcrumbs(product: MedusaProduct): Array<{ name: string; slug: string }> {
  const crumbs: Array<{ name: string; slug: string }> = [];
  for (const cat of product.categories ?? []) {
    if (MERCHANDISING_CATEGORY_HANDLES.has(cat.handle)) continue;
    crumbs.push({ name: cat.name, slug: cat.handle });
  }
  return crumbs;
}
