import { model } from "@medusajs/framework/utils"

const ColorSwatch = model.define("color_swatch", {
  id: model.id().primaryKey(),
  option_value_id: model.text(),
  value: model.text(),
})

export default ColorSwatch
