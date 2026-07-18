import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHIPPING_ZONE_MODULE } from "../../../modules/shipping-zone"
import type ShippingZoneModuleService from "../../../modules/shipping-zone/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { stock_location_id } = req.query

  if (!stock_location_id) {
    return res.json({ shipping_zones: [] })
  }

  const service = req.scope.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)
  const flat = await service.listShippingZoneNodes({
    stock_location_id: stock_location_id as string,
    enabled: true,
  })

  const tree = service.buildTree(flat as any)

  return res.json({ shipping_zones: tree })
}
