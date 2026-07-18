import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { SHIPPING_ZONE_MODULE } from "../../modules/shipping-zone"
import type ShippingZoneModuleService from "../../modules/shipping-zone/service"

type CreateShippingZoneNodeStepInput = {
  name: string
  code: string
  parent_id?: string | null
  stock_location_id?: string | null
  rate?: number | null
  enabled?: boolean
}

export const createShippingZoneNodeStep = createStep(
  "create-shipping-zone-node",
  async (input: CreateShippingZoneNodeStepInput, { container }) => {
    const service = container.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)

    if (input.parent_id) {
      const parent = await service.retrieveShippingZoneNode(input.parent_id)
      if (parent.rate !== null) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cannot create a child node under a node that has a rate"
        )
      }
      input.stock_location_id = parent.stock_location_id
    } else if (!input.stock_location_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "stock_location_id is required for root nodes"
      )
    }

    const existing = await service.listShippingZoneNodes({
      stock_location_id: input.stock_location_id,
      code: input.code,
      parent_id: input.parent_id ?? null,
    } as any)

    if (existing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `A sibling with code "${input.code}" already exists`
      )
    }

    if (!input.parent_id) {
      const roots = await service.listShippingZoneNodes({
        stock_location_id: input.stock_location_id,
        parent_id: null,
      } as any)
      if (roots.length > 0) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          "A root node already exists for this stock location"
        )
      }
    }

    const node = await service.createShippingZoneNodes({
      name: input.name,
      code: input.code,
      enabled: input.enabled ?? true,
      rate: input.rate ?? null,
      stock_location_id: input.stock_location_id!,
      parent_id: input.parent_id ?? null,
    } as any)

    const createdNode = Array.isArray(node) ? node[0] : node

    return new StepResponse(createdNode, createdNode.id)
  },
  async (id: string, { container }) => {
    const service = container.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)
    await service.deleteShippingZoneNodes(id)
  }
)
