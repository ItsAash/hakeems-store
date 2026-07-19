import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off data fix: both "Standard Shipping" options (Nepal + Hong Kong) reference a
 * shipping_profile_id that no longer exists in the shipping_profile table — every one of
 * the 20 seeded products uses a different (newer) default profile. src/seed.ts seeds
 * shipping options against "whichever shipping_profile happens to be first in the table
 * at seed time", which is exactly the kind of thing that silently breaks if the default
 * profile is ever recreated afterward (e.g. by a later catalog reseed). Cart.complete()
 * validates that a cart's shipping methods cover its items' shipping profiles, so this
 * orphaned reference failed that check for every single order, on both channels,
 * regardless of payment provider — surfacing to shoppers as "Could not place your order."
 */
export default async function fixShippingOptionProfiles({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  if (profiles.length !== 1) {
    logger.warn(`Expected exactly one shipping_profile, found ${profiles.length} — aborting, fix manually.`)
    return
  }
  const correctProfileId = profiles[0].id

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "shipping_profile_id"],
  })

  const stale = options.filter((o: any) => o.shipping_profile_id !== correctProfileId)
  if (stale.length === 0) {
    logger.info("All shipping options already reference the current shipping profile — nothing to do.")
    return
  }

  await updateShippingOptionsWorkflow(container).run({
    input: stale.map((o: any) => ({ id: o.id, shipping_profile_id: correctProfileId })),
  })

  for (const o of stale) {
    logger.info(`Repointed shipping option "${o.name}" (${o.id}) from ${o.shipping_profile_id} -> ${correctProfileId}`)
  }
}
