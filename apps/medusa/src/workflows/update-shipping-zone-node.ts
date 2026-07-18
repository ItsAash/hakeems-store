import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { updateShippingZoneNodeStep } from "./steps/update-shipping-zone-node"

type UpdateShippingZoneNodeWorkflowInput = {
  id: string
  name?: string
  code?: string
  rate?: number | null
  enabled?: boolean
}

export const updateShippingZoneNodeWorkflow = createWorkflow(
  "update-shipping-zone-node",
  function (input: UpdateShippingZoneNodeWorkflowInput) {
    const node = updateShippingZoneNodeStep(input)

    return new WorkflowResponse({ node })
  }
)
