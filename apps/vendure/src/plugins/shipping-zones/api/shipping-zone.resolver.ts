import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Channel,
  Ctx,
  ID,
  Permission,
  RequestContext,
  StockLocation,
  TransactionalConnection,
} from '@vendure/core';
import { ShippingZoneNode } from '../entities/shipping-zone-node.entity';
import {
  CreateShippingZoneNodeInput,
  ShippingZoneService,
  UpdateShippingZoneNodeInput,
} from '../service/shipping-zone.service';

@Resolver()
export class ShippingZoneResolver {
  constructor(private shippingZoneService: ShippingZoneService) {}

  @Query()
  @Allow(Permission.ReadSettings, Permission.ReadShippingMethod)
  shippingZoneTree(@Ctx() ctx: RequestContext, @Args('stockLocationId') stockLocationId: ID): Promise<ShippingZoneNode[]> {
    return this.shippingZoneService.getTreeForStockLocation(ctx, stockLocationId);
  }

  @Mutation()
  @Allow(Permission.UpdateSettings, Permission.UpdateShippingMethod)
  createShippingZoneNode(
    @Ctx() ctx: RequestContext,
    @Args('input') input: CreateShippingZoneNodeInput,
  ): Promise<ShippingZoneNode> {
    return this.shippingZoneService.create(ctx, input);
  }

  @Mutation()
  @Allow(Permission.UpdateSettings, Permission.UpdateShippingMethod)
  updateShippingZoneNode(
    @Ctx() ctx: RequestContext,
    @Args('input') input: UpdateShippingZoneNodeInput,
  ): Promise<ShippingZoneNode> {
    return this.shippingZoneService.update(ctx, input);
  }

  @Mutation()
  @Allow(Permission.DeleteSettings, Permission.DeleteShippingMethod)
  async deleteShippingZoneNode(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
    await this.shippingZoneService.delete(ctx, id);
    return { result: 'DELETED', message: null };
  }
}

/** Public (no permission gate) — the storefront reads this to build the checkout zone picker. */
@Resolver()
export class ShopShippingZoneResolver {
  constructor(private shippingZoneService: ShippingZoneService) {}

  @Query()
  activeChannelShippingZones(@Ctx() ctx: RequestContext): Promise<ShippingZoneNode[]> {
    return this.shippingZoneService.getTreeForActiveChannel(ctx);
  }
}

/** Exposes `StockLocation.channels` so the dashboard can show each warehouse's currency. */
@Resolver('StockLocation')
export class StockLocationChannelsResolver {
  constructor(private connection: TransactionalConnection) {}

  @ResolveField()
  async channels(@Ctx() ctx: RequestContext, @Parent() stockLocation: StockLocation): Promise<Channel[]> {
    const withChannels = await this.connection
      .getRepository(ctx, StockLocation)
      .findOne({ where: { id: stockLocation.id }, relations: { channels: true } });
    return withChannels?.channels ?? [];
  }
}
