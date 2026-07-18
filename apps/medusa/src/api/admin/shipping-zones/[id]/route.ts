import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateShippingZoneNodeWorkflow } from "../../../../workflows/update-shipping-zone-node"
import { deleteShippingZoneNodeWorkflow } from "../../../../workflows/delete-shipping-zone-node"
import { UpdateShippingZoneSchema } from "../middlewares"

export async function POST(
  req: AuthenticatedMedusaRequest<UpdateShippingZoneSchema>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await updateShippingZoneNodeWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  })

  return res.json({ shipping_zone: result.node })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  await deleteShippingZoneNodeWorkflow(req.scope).run({
    input: { id },
  })

  return res.json({ id, deleted: true })
}
