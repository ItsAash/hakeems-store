import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';

/**
 * A single node in a shipping-zone tree that belongs to one StockLocation (warehouse) —
 * "what this warehouse ships, and where it ships to". Each stock location has exactly one
 * root node (country level, e.g. "Nepal"), with as many nested children as needed beneath
 * it (province > city > area, or however deep a given branch needs to go).
 *
 * A node can carry its own `rate` (making it a pricing leaf) and/or have children that
 * subdivide it further. Rate resolution walks down as far as it can match, then back up to
 * the nearest ancestor that has a rate set — see ShippingZoneService.resolveRate.
 */
@Entity()
export class ShippingZoneNode extends VendureEntity {
  constructor(input?: DeepPartial<ShippingZoneNode>) {
    super(input);
  }

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'int', nullable: true })
  rate: number | null;

  @Index()
  @EntityId()
  stockLocationId: ID;

  @Index()
  @EntityId({ nullable: true })
  parentId: ID | null;

  @ManyToOne(() => ShippingZoneNode, (node: ShippingZoneNode) => node.children, { onDelete: 'CASCADE', nullable: true })
  parent: ShippingZoneNode | null;

  @OneToMany(() => ShippingZoneNode, (node: ShippingZoneNode) => node.parent)
  children: ShippingZoneNode[];
}
