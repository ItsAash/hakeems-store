import { PluginCommonModule, VendurePlugin } from '@vendure/core';

/**
 * A Medusa-inspired variant editor for the product "Variants" page. It replaces
 * the native variants block with a spreadsheet-style grid:
 *   - manage the option groups/values (e.g. Color, Size) inline
 *   - see every option combination as a row
 *   - fill in SKU / price / stock / enabled with Excel-like fill-down and paste
 *   - save creates the missing variants and updates the changed ones in bulk
 *
 * UI-only plugin: no entities/fields/API. Everything runs on native Admin API
 * mutations (createProductOptionGroup, addOptionGroupToProduct,
 * createProductOption, createProductVariants, updateProductVariants).
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  dashboard: './dashboard/index.tsx',
  compatibility: '^3.7.0',
})
export class ProductVariantEditorPlugin {}
