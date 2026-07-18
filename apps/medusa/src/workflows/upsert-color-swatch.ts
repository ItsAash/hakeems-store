import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { upsertColorSwatchStep } from "./steps/upsert-color-swatch"

type UpsertColorSwatchWorkflowInput = {
  option_value_id: string
  value: string
}

export const upsertColorSwatchWorkflow = createWorkflow(
  "upsert-color-swatch",
  function (input: UpsertColorSwatchWorkflowInput) {
    const swatch = upsertColorSwatchStep(input)

    return new WorkflowResponse({ swatch })
  }
)
