import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { parse } from 'graphql';
import {
  Allow,
  Ctx,
  ID,
  Permission,
  PluginCommonModule,
  RequestContext,
  StockLevelService,
  StockMovementService,
  Transaction,
  VendurePlugin,
} from '@vendure/core';

type TransferStockInput = {
  productVariantId: ID;
  fromLocationId: ID;
  toLocationId: ID;
  quantity: number;
};

@Resolver()
class StockTransferResolver {
  constructor(
    private stockLevelService: StockLevelService,
    private stockMovementService: StockMovementService,
  ) {}

  @Mutation()
  @Transaction()
  @Allow(Permission.UpdateCatalog)
  async transferStock(@Ctx() ctx: RequestContext, @Args('input') input: TransferStockInput) {
    const { productVariantId, fromLocationId, toLocationId, quantity } = input;

    if (String(fromLocationId) === String(toLocationId)) {
      return { success: false, message: 'Source and destination warehouse must be different.' };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than zero.' };
    }

    const fromLevel = await this.stockLevelService.getStockLevel(ctx, productVariantId, fromLocationId);
    const toLevel = await this.stockLevelService.getStockLevel(ctx, productVariantId, toLocationId);
    const availableAtSource = fromLevel.stockOnHand - fromLevel.stockAllocated;

    if (availableAtSource < quantity) {
      return {
        success: false,
        message: `Only ${availableAtSource} unit(s) available to transfer from this location.`,
      };
    }

    await this.stockMovementService.adjustProductVariantStock(ctx, productVariantId, [
      { stockLocationId: fromLocationId, stockOnHand: fromLevel.stockOnHand - quantity },
      { stockLocationId: toLocationId, stockOnHand: toLevel.stockOnHand + quantity },
    ]);

    return { success: true, message: `Transferred ${quantity} unit(s).` };
  }
}

const schemaExtension = parse(`
  input TransferStockInput {
    productVariantId: ID!
    fromLocationId: ID!
    toLocationId: ID!
    quantity: Int!
  }

  type TransferStockResult {
    success: Boolean!
    message: String!
  }

  extend type Mutation {
    "Moves stock for a variant from one warehouse to another as a single audited operation."
    transferStock(input: TransferStockInput!): TransferStockResult!
  }
`);

@VendurePlugin({
  imports: [PluginCommonModule],
  adminApiExtensions: {
    schema: schemaExtension,
    resolvers: [StockTransferResolver],
  },
  dashboard: './dashboard/index.tsx',
  compatibility: '^3.7.0',
})
export class StockManagementPlugin {}
