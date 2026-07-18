import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off migration for the region created before Stripe/Fonepay were wired up
 * (both regions were seeded with only "pp_system_default"). Repoints each region
 * at its real provider: Nepal -> Fonepay placeholder, Hong Kong -> Stripe (falling
 * back to the system provider if Stripe isn't configured on this machine).
 *
 * Safe to re-run.
 *
 *   npx medusa exec ./src/scripts/setup-payment-providers.ts
 */
export default async function setupPaymentProviders({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionService = container.resolve(Modules.REGION)

  const regions = await regionService.listRegions({}, { take: 100 })

  const providersByRegionName: Record<string, string[]> = {
    Nepal: ["pp_fonepay-placeholder_fonepay-placeholder"],
    "Hong Kong": process.env.STRIPE_SECRET_KEY
      ? ["pp_stripe_stripe"]
      : ["pp_system_default"],
  }

  for (const region of regions) {
    const providers = providersByRegionName[region.name]
    if (!providers) continue

    logger.info(`Setting payment providers for ${region.name}: ${providers.join(", ")}`)
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: providers },
      },
    })
  }

  logger.info("Payment providers updated.")
}
