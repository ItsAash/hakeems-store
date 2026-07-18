import { defineMiddlewares } from "@medusajs/framework/http"
import { adminShippingZoneMiddlewares } from "./admin/shipping-zones/middlewares"

export default defineMiddlewares({
  routes: [...adminShippingZoneMiddlewares],
})
