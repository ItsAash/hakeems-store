import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createShippingZoneNodeStep } from "./steps/create-shipping-zone-node"

type CreateShippingZoneNodeWorkflowInput = {
  name: string
  code: string
  parent_id?: string | null
  stock_location_id?: string | null
  rate?: number | null
  enabled?: boolean
}

export const createShippingZoneNodeWorkflow = createWorkflow(
  "create-shipping-zone-node",
  function (input: CreateShippingZoneNodeWorkflowInput) {
    const node = createShippingZoneNodeStep(input)

    return new WorkflowResponse({ node })
  }
)
