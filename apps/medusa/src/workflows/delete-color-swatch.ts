import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { deleteColorSwatchStep } from "./steps/delete-color-swatch"

export const deleteColorSwatchWorkflow = createWorkflow(
  "delete-color-swatch",
  function ({ id }: { id: string }) {
    const result = deleteColorSwatchStep({ id })

    return new WorkflowResponse({ id: result.id })
  }
)
