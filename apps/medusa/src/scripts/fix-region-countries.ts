import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off data fix: the live Nepal/Hong Kong regions ended up with no `countries`
 * attached (empty array), even though src/seed.ts has always passed `countries:
 * COUNTRIES.nepal` / `COUNTRIES.hongKong` to createRegionsWorkflow. Cause unknown
 * (likely seeded before that line existed, or a since-reverted admin edit) — this
 * just re-attaches them to match the seed's current intent. Every store.cart.update
 * with a shipping/billing address was failing with "Country with code np/hk is not
 * within region Nepal/Hong Kong" until a region actually has that country.
 */
export default async function fixRegionCountries({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.iso_2"],
  })

  const fixes: Record<string, string> = { Nepal: "np", "Hong Kong": "hk" }

  for (const region of regions) {
    const expected = fixes[region.name]
    if (!expected) continue
    if (region.countries?.some((c: any) => c.iso_2 === expected)) {
      logger.info(`${region.name} already has "${expected}" — skipping.`)
      continue
    }
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: region.id }, update: { countries: [expected] } },
    })
    logger.info(`Attached country "${expected}" to region ${region.name} (${region.id}).`)
  }
}
