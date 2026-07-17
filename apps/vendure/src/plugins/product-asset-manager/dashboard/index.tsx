import { defineDashboardExtension } from '@vendure/dashboard';
import { ProductAssetManagerBlock } from './product-asset-manager-block.js';

export default defineDashboardExtension({
  pageBlocks: [
    {
      id: 'product-asset-manager',
      title: 'Assets',
      location: {
        pageId: 'product-detail',
        // The native assets block lives in the narrow "side" column; a full media
        // manager needs width, so we render in "main" (after the main form) and hide
        // the native side block below.
        column: 'main',
        position: { blockId: 'main-form', order: 'after' },
      },
      component: ({ context }) => <ProductAssetManagerBlock context={context} />,
    },
    {
      // Hides the native side "Assets" block by replacing it with an empty render.
      id: 'product-asset-manager-hide-native',
      location: {
        pageId: 'product-detail',
        column: 'side',
        position: { blockId: 'assets', order: 'replace' },
      },
      component: () => null,
    },
  ],
});
