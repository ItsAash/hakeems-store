import { graphql } from '@/gql';

export const productAssetManagerDocument = graphql(`
  query ProductAssetManager($id: ID!) {
    product(id: $id) {
      id
      featuredAsset {
        id
      }
      assets {
        id
        name
        preview
        source
      }
      optionGroups {
        id
        name
        code
        options {
          id
          name
          code
        }
      }
      variants {
        id
        name
        sku
        featuredAsset {
          id
        }
        assets {
          id
        }
        options {
          id
          name
          code
          group {
            id
          }
        }
      }
    }
  }
`);

export const createProductAssetsDocument = graphql(`
  mutation CreateProductAssets($input: [CreateAssetInput!]!) {
    createAssets(input: $input) {
      ... on Asset {
        id
        name
        preview
        source
      }
      ... on MimeTypeError {
        message
      }
    }
  }
`);

export const updateProductAssetPoolDocument = graphql(`
  mutation UpdateProductAssetPool($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      id
      featuredAsset {
        id
      }
      assets {
        id
      }
    }
  }
`);

export const updateVariantAssetsDocument = graphql(`
  mutation UpdateVariantAssets($input: [UpdateProductVariantInput!]!) {
    updateProductVariants(input: $input) {
      id
      featuredAsset {
        id
      }
      assets {
        id
      }
    }
  }
`);
