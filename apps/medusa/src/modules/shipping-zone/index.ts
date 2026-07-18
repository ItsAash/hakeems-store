import ShippingZoneModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SHIPPING_ZONE_MODULE = "shippingZone"

// Models are registered through the service's `MedusaService({ ShippingZoneNode })`
// definition — `Module()` in v2 only accepts `service`/`loaders`, not `models`.
export default Module(SHIPPING_ZONE_MODULE, {
  service: ShippingZoneModuleService,
})
