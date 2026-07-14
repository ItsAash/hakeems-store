import { Injectable } from '@nestjs/common';
import {
  ID,
  Order,
  RequestContext,
  StockLocation,
  TransactionalConnection,
  UserInputError,
} from '@vendure/core';
import { ShippingZoneNode } from '../entities/shipping-zone-node.entity';

export type CreateShippingZoneNodeInput = {
  name: string;
  code: string;
  parentId?: ID | null;
  stockLocationId?: ID | null;
  rate?: number | null;
  enabled?: boolean;
};

export type UpdateShippingZoneNodeInput = {
  id: ID;
  name?: string;
  code?: string;
  rate?: number | null;
  enabled?: boolean;
};

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();

@Injectable()
export class ShippingZoneService {
  constructor(private connection: TransactionalConnection) {}

  private get repo() {
    return this.connection.rawConnection.getRepository(ShippingZoneNode);
  }

  /** All nodes belonging to one warehouse, flat (no relations loaded — the tree is built in memory). */
  async getFlatTreeForStockLocation(ctx: RequestContext, stockLocationId: ID): Promise<ShippingZoneNode[]> {
    return this.repo.find({ where: { stockLocationId: stockLocationId as any } });
  }

  /** The warehouse's single root (country) node with `children` recursively populated, or `[]` if not yet configured. */
  async getTreeForStockLocation(ctx: RequestContext, stockLocationId: ID): Promise<ShippingZoneNode[]> {
    const flat = await this.getFlatTreeForStockLocation(ctx, stockLocationId);
    return this.buildTree(flat);
  }

  /**
   * The active channel's zone tree, enabled nodes only (a disabled node's whole subtree is
   * pruned) — this is what the storefront's zone picker reads. Returns `[]` if no warehouse is
   * linked to this channel or nothing has been configured yet.
   */
  async getTreeForActiveChannel(ctx: RequestContext): Promise<ShippingZoneNode[]> {
    const stockLocations = await this.getStockLocationsForChannel(ctx);
    if (stockLocations.length === 0) return [];

    const flat = await this.getFlatTreeForStockLocation(ctx, stockLocations[0].id);
    const enabled = flat.filter(node => node.enabled);
    return this.buildTree(enabled);
  }

  private buildTree(flat: ShippingZoneNode[]): ShippingZoneNode[] {
    const byParent = new Map<string, ShippingZoneNode[]>();
    for (const node of flat) {
      const key = node.parentId ? String(node.parentId) : 'root';
      const siblings = byParent.get(key) ?? [];
      siblings.push(node);
      byParent.set(key, siblings);
    }
    const attachChildren = (node: ShippingZoneNode): ShippingZoneNode => {
      node.children = (byParent.get(String(node.id)) ?? []).map(attachChildren);
      return node;
    };
    return (byParent.get('root') ?? []).map(attachChildren);
  }

  async findOne(ctx: RequestContext, id: ID): Promise<ShippingZoneNode | null> {
    return this.repo.findOne({ where: { id: id as any } });
  }

  async create(ctx: RequestContext, input: CreateShippingZoneNodeInput): Promise<ShippingZoneNode> {
    let stockLocationId: ID;

    if (input.parentId) {
      const parent = await this.findOne(ctx, input.parentId);
      if (!parent) {
        throw new UserInputError('Parent shipping zone not found');
      }
      if (parent.rate != null) {
        throw new UserInputError(
          `"${parent.name}" has its own rate set, so it's priced as a leaf — remove its rate before adding zones beneath it (only leaf zones may carry a rate).`,
        );
      }
      stockLocationId = parent.stockLocationId;
    } else {
      if (!input.stockLocationId) {
        throw new UserInputError('A root (country) zone must specify a stockLocationId');
      }
      const existingRoot = await this.repo.findOne({
        where: { stockLocationId: input.stockLocationId as any, parentId: null as any },
      });
      if (existingRoot) {
        throw new UserInputError(
          `This warehouse already has a root zone ("${existingRoot.name}"). Edit it, or add children beneath it, instead of creating another root.`,
        );
      }
      stockLocationId = input.stockLocationId;
    }

    await this.assertUniqueSibling(stockLocationId, input.code, input.parentId ?? null);
    const node = new ShippingZoneNode({
      name: input.name,
      code: input.code,
      parentId: input.parentId ?? null,
      rate: input.rate ?? null,
      enabled: input.enabled ?? true,
      stockLocationId,
    });
    return this.repo.save(node);
  }

  async update(ctx: RequestContext, input: UpdateShippingZoneNodeInput): Promise<ShippingZoneNode> {
    const node = await this.findOne(ctx, input.id);
    if (!node) {
      throw new UserInputError('Shipping zone not found');
    }
    if (input.code !== undefined && normalize(input.code) !== normalize(node.code)) {
      await this.assertUniqueSibling(node.stockLocationId, input.code, node.parentId, node.id);
    }
    if (input.rate != null) {
      const childCount = await this.repo.count({ where: { parentId: node.id as any } });
      if (childCount > 0) {
        throw new UserInputError(
          `"${node.name}" has zones beneath it, so only they can carry a rate — only leaf zones may be priced.`,
        );
      }
    }
    Object.assign(node, {
      name: input.name ?? node.name,
      code: input.code ?? node.code,
      rate: input.rate === undefined ? node.rate : input.rate,
      enabled: input.enabled ?? node.enabled,
    });
    return this.repo.save(node);
  }

  /** Cascades to all descendants (self-referential FK is onDelete: CASCADE). */
  async delete(ctx: RequestContext, id: ID): Promise<void> {
    const node = await this.findOne(ctx, id);
    if (!node) {
      throw new UserInputError('Shipping zone not found');
    }
    await this.repo.remove(node);
  }

  private async assertUniqueSibling(stockLocationId: ID, code: string, parentId: ID | null, excludeId?: ID) {
    const siblings = await this.repo.find({
      where: { stockLocationId: stockLocationId as any, parentId: (parentId ?? null) as any },
    });
    const clash = siblings.find(
      sibling => normalize(sibling.code) === normalize(code) && String(sibling.id) !== String(excludeId),
    );
    if (clash) {
      throw new UserInputError(`A sibling shipping zone with code "${code}" already exists`);
    }
  }

  /** The StockLocation(s) assigned to the active channel — in practice, one warehouse per channel. */
  async getStockLocationsForChannel(ctx: RequestContext): Promise<StockLocation[]> {
    return this.connection
      .getRepository(ctx, StockLocation)
      .createQueryBuilder('stockLocation')
      .leftJoin('stockLocation.channels', 'channel')
      .where('channel.id = :channelId', { channelId: ctx.channelId })
      .getMany();
  }

  /**
   * Resolves the shipping rate for an order's shipping address. First finds which warehouse
   * serves the active channel, then walks that warehouse's zone tree — skipping the country
   * root itself (that's implied by the warehouse/channel) and matching its descendants as deep
   * as the address's free-text fields (province, city, streetLine2) allow — then falls back up
   * to the nearest ancestor with a rate set. Returns `fallbackRate` if no warehouse is linked to
   * this channel, nothing is configured yet, or the address doesn't match anything in the tree.
   */
  async resolveRate(ctx: RequestContext, order: Order, fallbackRate: number): Promise<number> {
    const address = order.shippingAddress;
    if (!address) {
      return fallbackRate;
    }

    const stockLocations = await this.getStockLocationsForChannel(ctx);
    if (stockLocations.length === 0) {
      return fallbackRate;
    }

    const explicitId = (address as { customFields?: { shippingZoneId?: string } }).customFields?.shippingZoneId;

    for (const stockLocation of stockLocations) {
      const flat = await this.getFlatTreeForStockLocation(ctx, stockLocation.id);
      if (flat.length === 0) continue;
      const byId = new Map(flat.map(node => [String(node.id), node]));
      const root = flat.find(node => !node.parentId);

      let matched: ShippingZoneNode | undefined;

      const explicitNode = explicitId ? byId.get(String(explicitId)) : undefined;
      if (explicitNode?.enabled) {
        matched = explicitNode;
      } else if (root) {
        const byParent = new Map<string, ShippingZoneNode[]>();
        for (const node of flat) {
          const key = node.parentId ? String(node.parentId) : 'root';
          const siblings = byParent.get(key) ?? [];
          siblings.push(node);
          byParent.set(key, siblings);
        }
        const signals = [address.province, address.city, address.streetLine2].map(normalize);
        matched = root;
        let candidates = byParent.get(String(root.id)) ?? [];
        for (const signal of signals) {
          if (!signal) break;
          const next = candidates.find(node => node.enabled && normalize(node.name) === signal);
          if (!next) break;
          matched = next;
          candidates = byParent.get(String(next.id)) ?? [];
        }
      }

      let cursor = matched;
      while (cursor) {
        if (cursor.rate != null) {
          return cursor.rate;
        }
        cursor = cursor.parentId ? byId.get(String(cursor.parentId)) : undefined;
      }
    }

    return fallbackRate;
  }
}
