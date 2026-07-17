import { defineDashboardExtension } from '@vendure/dashboard';
import { VariantGridBlock } from './variant-grid-block.js';

export default defineDashboardExtension({
  pageBlocks: [
    {
      id: 'product-variant-grid',
      title: 'Variants',
      location: {
        // The variants block lives on the product "Variants" sub-page, in the main column.
        pageId: 'manage-product-variants',
        column: 'main',
        position: { blockId: 'product-variants', order: 'replace' },
      },
      component: ({ context }) => <VariantGridBlock context={context} />,
    },
    {
      // Hide the native "Option Groups" block — the grid block manages options itself,
      // so keeping the native one would duplicate the UI.
      id: 'product-variant-grid-hide-option-groups',
      location: {
        pageId: 'manage-product-variants',
        column: 'main',
        position: { blockId: 'option-groups', order: 'replace' },
      },
      component: () => null,
    },
  ],
});
