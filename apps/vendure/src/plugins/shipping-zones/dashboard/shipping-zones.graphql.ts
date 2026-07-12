import { graphql } from '@/gql';

export const stockLocationsDocument = graphql(`
  query ShippingZonesStockLocations {
    stockLocations(options: { take: 100 }) {
      items {
        id
        name
        channels {
          defaultCurrencyCode
        }
      }
    }
  }
`);

export const shippingZoneTreeDocument = graphql(`
  query ShippingZoneTree($stockLocationId: ID!) {
    shippingZoneTree(stockLocationId: $stockLocationId) {
      id
      name
      code
      enabled
      rate
      parentId
      children {
        id
        name
        code
        enabled
        rate
        parentId
        children {
          id
          name
          code
          enabled
          rate
          parentId
          children {
            id
            name
            code
            enabled
            rate
            parentId
            children {
              id
              name
              code
              enabled
              rate
              parentId
            }
          }
        }
      }
    }
  }
`);

export const createShippingZoneNodeDocument = graphql(`
  mutation CreateShippingZoneNode($input: CreateShippingZoneNodeInput!) {
    createShippingZoneNode(input: $input) {
      id
    }
  }
`);

export const updateShippingZoneNodeDocument = graphql(`
  mutation UpdateShippingZoneNode($input: UpdateShippingZoneNodeInput!) {
    updateShippingZoneNode(input: $input) {
      id
    }
  }
`);

export const deleteShippingZoneNodeDocument = graphql(`
  mutation DeleteShippingZoneNode($id: ID!) {
    deleteShippingZoneNode(id: $id) {
      result
      message
    }
  }
`);
