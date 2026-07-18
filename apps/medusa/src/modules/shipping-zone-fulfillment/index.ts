import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ShippingZoneFulfillmentProviderService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShippingZoneFulfillmentProviderService],
})
