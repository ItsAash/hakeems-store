import ColorSwatchModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const COLOR_SWATCH_MODULE = "colorSwatch"

export default Module(COLOR_SWATCH_MODULE, {
  service: ColorSwatchModuleService,
})
