import { parse } from 'graphql';
import { LanguageCode, PluginCommonModule, RuntimeVendureConfig, VendurePlugin } from '@vendure/core';
import { ShippingZoneNode } from './entities/shipping-zone-node.entity';
import { ShippingZoneService } from './service/shipping-zone.service';
import {
  ShippingZoneResolver,
  ShopShippingZoneResolver,
  StockLocationChannelsResolver,
} from './api/shipping-zone.resolver';

// Admin and Shop are separate GraphQL schemas — a type used on both sides has to be declared in
// both extension SDLs below, so it's factored out once here.
const shippingZoneNodeType = `
  type ShippingZoneNode implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    code: String!
    enabled: Boolean!
    rate: Int
    parentId: ID
    stockLocationId: ID!
    children: [ShippingZoneNode!]!
  }
`;

const adminSchemaExtension = parse(`
  ${shippingZoneNodeType}

  input CreateShippingZoneNodeInput {
    name: String!
    code: String!
    parentId: ID
    "Required when creating a root (country) zone — the warehouse this zone tree belongs to. Ignored for child zones, which inherit it from their parent."
    stockLocationId: ID
    rate: Int
    enabled: Boolean
  }

  input UpdateShippingZoneNodeInput {
    id: ID!
    name: String
    code: String
    rate: Int
    enabled: Boolean
  }

  extend type Query {
    "One warehouse's shipping zone tree: a single root (country) node with children nested, or an empty array if not yet configured."
    shippingZoneTree(stockLocationId: ID!): [ShippingZoneNode!]!
  }

  extend type Mutation {
    createShippingZoneNode(input: CreateShippingZoneNodeInput!): ShippingZoneNode!
    updateShippingZoneNode(input: UpdateShippingZoneNodeInput!): ShippingZoneNode!
    deleteShippingZoneNode(id: ID!): DeletionResponse!
  }

  extend type StockLocation {
    channels: [Channel!]!
  }
`);

const shopSchemaExtension = parse(`
  ${shippingZoneNodeType}

  extend type Query {
    "This channel's shipping-zone tree (enabled nodes only), from its assigned warehouse — a single root (country) node with children nested, or an empty array if none is configured."
    activeChannelShippingZones: [ShippingZoneNode!]!
  }
`);

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [ShippingZoneNode],
  providers: [ShippingZoneService],
  adminApiExtensions: {
    schema: adminSchemaExtension,
    resolvers: [ShippingZoneResolver, StockLocationChannelsResolver],
  },
  shopApiExtensions: {
    schema: shopSchemaExtension,
    resolvers: [ShopShippingZoneResolver],
  },
  dashboard: './dashboard/index.tsx',
  compatibility: '^3.7.0',
  configuration: (config: RuntimeVendureConfig) => {
    config.customFields.Address = [
      ...(config.customFields.Address ?? []),
      {
        name: 'shippingZoneId',
        type: 'string',
        nullable: true,
        public: true,
        label: [{ languageCode: LanguageCode.en, value: 'Shipping zone (set by a zone picker, optional)' }],
      },
    ];
    return config;
  },
})
export class ShippingZonesPlugin {}
