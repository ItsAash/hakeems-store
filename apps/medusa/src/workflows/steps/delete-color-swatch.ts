import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COLOR_SWATCH_MODULE } from "../../modules/color-swatch"
import type ColorSwatchModuleService from "../../modules/color-swatch/service"

export const deleteColorSwatchStep = createStep(
  "delete-color-swatch",
  async ({ id }: { id: string }, { container }) => {
    const service = container.resolve<ColorSwatchModuleService>(COLOR_SWATCH_MODULE)

    const [existing] = await service.listColorSwatches({ id })
    await service.deleteColorSwatches(id)

    return new StepResponse({ id }, existing ?? null)
  },
  async (swatch: { id: string; option_value_id: string; value: string } | null, { container }) => {
    if (!swatch) return
    const service = container.resolve<ColorSwatchModuleService>(COLOR_SWATCH_MODULE)
    await service.createColorSwatches({
      option_value_id: swatch.option_value_id,
      value: swatch.value,
    })
  }
)
