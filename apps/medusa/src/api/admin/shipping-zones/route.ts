import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SHIPPING_ZONE_MODULE } from "../../../modules/shipping-zone"
import type ShippingZoneModuleService from "../../../modules/shipping-zone/service"
import { createShippingZoneNodeWorkflow } from "../../../workflows/create-shipping-zone-node"
import { CreateShippingZoneSchema } from "./middlewares"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { stock_location_id } = req.query

  if (!stock_location_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "stock_location_id query parameter is required"
    )
  }

  const service = req.scope.resolve<ShippingZoneModuleService>(SHIPPING_ZONE_MODULE)
  const tree = await service.getTreeForStockLocation(stock_location_id as string)

  return res.json({ shipping_zones: tree })
}

export async function POST(
  req: AuthenticatedMedusaRequest<CreateShippingZoneSchema>,
  res: MedusaResponse
) {
  const { result } = await createShippingZoneNodeWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  return res.json({ shipping_zone: result.node })
}
