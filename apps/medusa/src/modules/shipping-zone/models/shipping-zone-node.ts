import { model } from "@medusajs/framework/utils"

const ShippingZoneNode = model.define("shipping_zone_node", {
  id: model.id().primaryKey(),
  name: model.text(),
  code: model.text(),
  enabled: model.boolean().default(true),
  rate: model.number().nullable(),
  stock_location_id: model.text(),
  parent_id: model.text().nullable(),
})

export default ShippingZoneNode
