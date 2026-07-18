import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { deleteShippingZoneNodeStep } from "./steps/delete-shipping-zone-node"

export const deleteShippingZoneNodeWorkflow = createWorkflow(
  "delete-shipping-zone-node",
  function ({ id }: { id: string }) {
    const result = deleteShippingZoneNodeStep({ id })

    return new WorkflowResponse({ id: result.id })
  }
)
