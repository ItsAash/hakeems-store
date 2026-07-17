import { graphql } from '@/gql';

export const variantEditorProductDocument = graphql(`
  query VariantEditorProduct($id: ID!) {
    product(id: $id) {
      id
      name
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
        sku
        price
        enabled
        stockLevels {
          stockOnHand
        }
        options {
          id
        }
      }
    }
  }
`);

export const createVariantsDocument = graphql(`
  mutation VariantEditorCreateVariants($input: [CreateProductVariantInput!]!) {
    createProductVariants(input: $input) {
      id
      sku
    }
  }
`);

export const updateVariantsDocument = graphql(`
  mutation VariantEditorUpdateVariants($input: [UpdateProductVariantInput!]!) {
    updateProductVariants(input: $input) {
      id
      sku
      price
      enabled
    }
  }
`);

export const createOptionGroupDocument = graphql(`
  mutation VariantEditorCreateOptionGroup($input: CreateProductOptionGroupInput!) {
    createProductOptionGroup(input: $input) {
      id
      code
      options {
        id
        name
        code
      }
    }
  }
`);

export const addOptionGroupToProductDocument = graphql(`
  mutation VariantEditorAddOptionGroup($productId: ID!, $optionGroupId: ID!) {
    addOptionGroupToProduct(productId: $productId, optionGroupId: $optionGroupId) {
      id
    }
  }
`);

export const createOptionDocument = graphql(`
  mutation VariantEditorCreateOption($input: CreateProductOptionInput!) {
    createProductOption(input: $input) {
      id
      name
      code
    }
  }
`);
