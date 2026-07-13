import type { PdpProductQuery } from '@/lib/vendure/generated';

type Variant = NonNullable<PdpProductQuery['product']>['variants'][number];

export type VariantOption = { id: string; code: string; name: string; swatch: string | null };

export type PdpVariant = {
  id: string;
  sku: string;
  priceWithTax: number;
  currencyCode: string;
  inStock: boolean;
  imageUrl: string | null;
  /** option group code -> the option code selected for this variant, e.g. `{ size: 'm', color: 'black' }` */
  selections: Record<string, string>;
};

export type PdpVariantMatrix = {
  variants: PdpVariant[];
  /** Option groups in the order they should be presented, e.g. size before color. */
  optionGroups: Array<{ code: string; name: string; options: VariantOption[] }>;
  /** Keyed by `${groupCode}:${optionCode}:${groupCode}:${optionCode}...` (selections
   * sorted by group code) so any combination resolves in one lookup. */
  variantsBySelectionKey: Map<string, PdpVariant>;
};

function selectionKey(selections: Record<string, string>): string {
  return Object.entries(selections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, option]) => `${group}:${option}`)
    .join('|');
}

/**
 * Builds everything the variant selector needs from a product's flat variant list:
 * which option groups/values actually exist *for this product* (not every value ever
 * defined in Vendure's global option groups — a product only using 3 of a group's 6
 * colors shouldn't offer the other 3), and a lookup from a full selection to the
 * matching variant.
 */
export function buildVariantMatrix(variants: Variant[]): PdpVariantMatrix {
  const groupOrder: string[] = [];
  const groupNames = new Map<string, string>();
  const optionsByGroup = new Map<string, Map<string, VariantOption>>();
  const pdpVariants: PdpVariant[] = [];
  const variantsBySelectionKey = new Map<string, PdpVariant>();

  for (const variant of variants) {
    const selections: Record<string, string> = {};

    for (const option of variant.options) {
      const groupCode = option.group.code;
      if (!optionsByGroup.has(groupCode)) {
        optionsByGroup.set(groupCode, new Map());
        groupOrder.push(groupCode);
        groupNames.set(groupCode, option.group.name);
      }
      optionsByGroup.get(groupCode)!.set(option.code, {
        id: option.id,
        code: option.code,
        name: option.name,
        swatch: option.customFields?.swatch ?? null,
      });
      selections[groupCode] = option.code;
    }

    const pdpVariant: PdpVariant = {
      id: variant.id,
      sku: variant.sku,
      priceWithTax: variant.priceWithTax,
      currencyCode: variant.currencyCode,
      inStock: variant.stockLevel === 'IN_STOCK',
      imageUrl: variant.featuredAsset?.preview ?? null,
      selections,
    };

    pdpVariants.push(pdpVariant);
    variantsBySelectionKey.set(selectionKey(selections), pdpVariant);
  }

  // "size" reads before "color" when both exist; anything else keeps discovery order.
  const sortedGroups = [...groupOrder].sort((a, b) => {
    if (a === 'size') return -1;
    if (b === 'size') return 1;
    return 0;
  });

  return {
    variants: pdpVariants,
    optionGroups: sortedGroups.map((code) => ({
      code,
      name: groupNames.get(code) ?? code,
      options: Array.from(optionsByGroup.get(code)!.values()),
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
