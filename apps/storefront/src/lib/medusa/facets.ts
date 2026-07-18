import type { MedusaProduct } from '@/lib/medusa/types';

export type FacetFilterOption = {
  facetId: string;
  facetName: string;
  valueId: string;
  valueName: string;
  count: number;
};

/** Groups product-option values (Color, Size, …) across a result set into filter
 * sections — Medusa's equivalent of Vendure's `search.facetValues` aggregation, which
 * has no direct counterpart here since options live per-product rather than as a
 * shared catalog-wide facet table. */
export type FacetFilterGroup = {
  facetId: string;
  facetName: string;
  options: FacetFilterOption[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type ProductValue = { facetId: string; facetName: string; valueId: string; valueName: string };

// Medusa auto-creates a "Default option" / "Default option value" pair for any product
// created without explicit options (e.g. a single-variant product added via the admin
// quick-create) — a synthetic placeholder, not a real merchandising attribute.
const NON_FILTERABLE_OPTION_TITLES = new Set(['default option']);

/** A stable, filterable id for one option value. Not a database id — Medusa option
 * values are scoped per-product (two products' "Onyx" are different rows), so id-based
 * matching would silently miss products; matching on the normalized (option title,
 * value) pair instead works uniformly across the whole catalog. */
function productValues(product: MedusaProduct): ProductValue[] {
  const seen = new Map<string, ProductValue>();
  for (const variant of product.variants ?? []) {
    for (const option of variant.options ?? []) {
      const facetName = option.option?.title;
      if (!facetName || NON_FILTERABLE_OPTION_TITLES.has(facetName.toLowerCase())) continue;
      const facetId = slugify(facetName);
      const valueId = `${facetId}:${slugify(option.value)}`;
      if (!seen.has(valueId)) {
        seen.set(valueId, { facetId, facetName, valueId, valueName: option.value });
      }
    }
  }
  return Array.from(seen.values());
}

/** Facet counts reflect the full unfiltered candidate set for the current category/
 * collection/search scope (i.e. "how many products would match if this filter were
 * cleared"), not a still-active-filters-aware count — a standard, simpler PLP
 * convention than Vendure's per-filter-combination aggregation. */
export function buildFacetGroupsFromProducts(products: MedusaProduct[]): FacetFilterGroup[] {
  const groups = new Map<string, { facetName: string; options: Map<string, FacetFilterOption> }>();

  for (const product of products) {
    // productValues() already dedupes per product, so this is one count per product per value.
    for (const { facetId, facetName, valueId, valueName } of productValues(product)) {
      let group = groups.get(facetId);
      if (!group) {
        group = { facetName, options: new Map() };
        groups.set(facetId, group);
      }
      let entry = group.options.get(valueId);
      if (!entry) {
        entry = { facetId, facetName, valueId, valueName, count: 0 };
        group.options.set(valueId, entry);
      }
      entry.count += 1;
    }
  }

  return Array.from(groups.entries()).map(([facetId, group]) => ({
    facetId,
    facetName: group.facetName,
    options: Array.from(group.options.values()).sort((a, b) => b.count - a.count || a.valueName.localeCompare(b.valueName)),
  }));
}

/** AND across different facet groups, OR within the same group — e.g.
 * "color:onyx,color:sandstone,size:m" matches (Onyx OR Sandstone) AND Size M. */
export function productMatchesActiveFacets(product: MedusaProduct, activeFacetValueIds: string[]): boolean {
  if (activeFacetValueIds.length === 0) return true;

  const byFacet = new Map<string, string[]>();
  for (const id of activeFacetValueIds) {
    const facetId = id.split(':')[0] ?? id;
    const bucket = byFacet.get(facetId);
    if (bucket) bucket.push(id);
    else byFacet.set(facetId, [id]);
  }

  const ids = new Set(productValues(product).map((v) => v.valueId));
  for (const wanted of byFacet.values()) {
    if (!wanted.some((id) => ids.has(id))) return false;
  }
  return true;
}

export function parseActiveFacetValueIds(raw: string | undefined): string[] {
  return (raw ?? '').split(',').filter(Boolean);
}
