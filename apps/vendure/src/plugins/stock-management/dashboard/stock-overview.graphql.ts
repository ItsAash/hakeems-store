import { graphql } from '@/gql';

export const stockOverviewListDocument = graphql(`
  query StockOverviewList($options: ProductVariantListOptions) {
    productVariants(options: $options) {
      items {
        id
        sku
        name
        trackInventory
        product {
          id
          name
        }
        stockLevels {
          id
          stockOnHand
          stockAllocated
          stockLocation {
            id
            name
          }
        }
      }
      totalItems
    }
  }
`);

export const stockLocationsForTransferDocument = graphql(`
  query StockLocationsForTransfer {
    stockLocations(options: { take: 100 }) {
      items {
        id
        name
      }
    }
  }
`);

export const adjustVariantStockDocument = graphql(`
  mutation AdjustVariantStock($input: [UpdateProductVariantInput!]!) {
    updateProductVariants(input: $input) {
      id
      stockLevels {
        id
        stockOnHand
        stockAllocated
        stockLocation {
          id
          name
        }
      }
    }
  }
`);

export const transferVariantStockDocument = graphql(`
  mutation TransferVariantStock($input: TransferStockInput!) {
    transferStock(input: $input) {
      success
      message
    }
  }
`);
