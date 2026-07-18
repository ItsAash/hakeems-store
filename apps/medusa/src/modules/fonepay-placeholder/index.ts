import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import FonepayPlaceholderProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [FonepayPlaceholderProviderService],
})
