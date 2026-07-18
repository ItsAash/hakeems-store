import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { SHIPPING_ZONE_MODULE } from "../../modules/shipping-zone"
import type ShippingZoneModuleService from "../../modules/shipping-zone/service"

type UpdateShippingZoneNodeStepInput = {
  id: string
  name?: string
  code?: string
  rate?: number | null
  enabled?: boolean
}

export const updateShippingZoneNodeStep = createStep(
  "update-shipping-zone-node",
  async (input: UpdateShippingZoneNodeStepInput, { container }) => {
    const service = container.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)

    const existing = await service.retrieveShippingZoneNode(input.id)

    if (input.code && input.code !== existing.code) {
      const siblings = await service.listShippingZoneNodes({
        stock_location_id: existing.stock_location_id,
        code: input.code,
        parent_id: existing.parent_id,
      } as any)
      if (siblings.length > 0) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `A sibling with code "${input.code}" already exists`
        )
      }
    }

    if (input.rate !== undefined && input.rate !== null) {
      const children = await service.listShippingZoneNodes({
        parent_id: input.id,
      } as any)
      if (children.length > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cannot set a rate on a node that has children"
        )
      }
    }

    const node = await service.updateShippingZoneNodes({
      selector: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.code !== undefined && { code: input.code }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.rate !== undefined && { rate: input.rate }),
      },
    })

    const updatedNode = Array.isArray(node) ? node[0] : node

    return new StepResponse(updatedNode, existing)
  },
  async (original: any, { container }) => {
    if (!original) return
    const service = container.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)
    await service.updateShippingZoneNodes({
      selector: { id: original.id },
      data: {
        name: original.name,
        code: original.code,
        enabled: original.enabled,
        rate: original.rate,
      },
    })
  }
)
