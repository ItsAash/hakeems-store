import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SHIPPING_ZONE_MODULE } from "../../modules/shipping-zone"
import type ShippingZoneModuleService from "../../modules/shipping-zone/service"

export const deleteShippingZoneNodeStep = createStep(
  "delete-shipping-zone-node",
  async ({ id }: { id: string }, { container }) => {
    const service = container.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)

    const node = await service.retrieveShippingZoneNode(id)
    await service.deleteShippingZoneNodes(id)

    return new StepResponse({ id }, node)
  },
  async (node: any, { container }) => {
    if (!node) return
    const service = container.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)
    await service.createShippingZoneNodes(node)
  }
)
