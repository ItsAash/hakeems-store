import { PluginCommonModule, VendurePlugin } from '@vendure/core';

/**
 * A Medusa-inspired asset manager for the product detail page. It replaces the
 * native product "Assets" block with a richer experience:
 *   - bulk upload all product images at once
 *   - reorder the gallery and choose the featured (thumbnail) image
 *   - assign images to variants grouped by color, with an "apply to all variants
 *     of this color" action — which is how per-color imagery is modelled (native
 *     ProductVariant.assets / featuredAsset), rather than duplicating images per
 *     Size×Color variant by hand.
 *
 * This is a UI-only plugin: it adds no entities, custom fields or API — everything
 * is driven by native Admin API mutations (createAssets, updateProduct,
 * updateProductVariants).
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  dashboard: './dashboard/index.tsx',
  compatibility: '^3.7.0',
})
export class ProductAssetManagerPlugin {}
