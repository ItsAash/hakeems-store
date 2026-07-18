import { MedusaService } from "@medusajs/framework/utils"
import ColorSwatch from "./models/color-swatch"

class ColorSwatchModuleService extends MedusaService({
  ColorSwatch,
}) {}

export default ColorSwatchModuleService
