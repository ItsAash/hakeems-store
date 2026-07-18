import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COLOR_SWATCH_MODULE } from "../../modules/color-swatch"
import type ColorSwatchModuleService from "../../modules/color-swatch/service"

type UpsertColorSwatchStepInput = {
  option_value_id: string
  value: string
}

type UpsertColorSwatchCompensation = {
  id: string
  // The previous hex value if this was an update, or null if we created a new row
  // (in which case compensation deletes it instead of restoring a value).
  previousValue: string | null
}

export const upsertColorSwatchStep = createStep(
  "upsert-color-swatch",
  async (input: UpsertColorSwatchStepInput, { container }) => {
    const service = container.resolve<ColorSwatchModuleService>(COLOR_SWATCH_MODULE)

    const existing = await service.listColorSwatches({
      option_value_id: input.option_value_id,
    })

    if (existing.length > 0) {
      const swatch = await service.updateColorSwatches({
        id: existing[0].id,
        value: input.value,
      })
      return new StepResponse(swatch, {
        id: existing[0].id,
        previousValue: existing[0].value,
      })
    }

    const swatch = await service.createColorSwatches({
      option_value_id: input.option_value_id,
      value: input.value,
    })
    return new StepResponse(swatch, { id: swatch.id, previousValue: null })
  },
  async (compensation: UpsertColorSwatchCompensation | undefined, { container }) => {
    if (!compensation) return
    const service = container.resolve<ColorSwatchModuleService>(COLOR_SWATCH_MODULE)

    if (compensation.previousValue === null) {
      await service.deleteColorSwatches(compensation.id)
    } else {
      await service.updateColorSwatches({
        id: compensation.id,
        value: compensation.previousValue,
      })
    }
  }
)
