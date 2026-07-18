import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateCollectionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off: apps/medusa/src/subscribers/collection-sync.ts only fires on
 * product-collection.created/updated/deleted — collections created before the
 * subscriber existed (or untouched since) never pushed to Strapi. "Tops" was found
 * missing from Strapi's collection_pages while bottoms/accessories/sets were present
 * (they'd each been touched at some point). This re-runs a no-op update (touching
 * `updated_at`) on every collection so the subscriber fires for all of them, proving
 * the sync pipeline is healthy end to end rather than hand-writing the Strapi row.
 *
 *   npx medusa exec ./src/scripts/resync-collections.ts
 */
export default async function resyncCollections({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const collectionService = container.resolve(Modules.PRODUCT)

  const collections = await collectionService.listProductCollections({}, { take: 100 })
  logger.info(`Found ${collections.length} collections — re-syncing each to Strapi...`)

  for (const collection of collections) {
    await updateCollectionsWorkflow(container).run({
      input: { selector: { id: collection.id }, update: { metadata: { ...(collection.metadata ?? {}), synced_at: new Date().toISOString() } } },
    })
    logger.info(`Synced: ${collection.title} (${collection.handle})`)
  }

  // The collection-sync subscriber fires fire-and-forget off the Local Event Bus — it
  // isn't awaited by the workflow above, so `medusa exec` can tear the process down
  // mid-flight on whichever collection's HTTP call to Strapi is still in-flight when
  // this function returns (observed: the last collection processed silently never
  // arrived in Strapi despite this script logging success for it). Give the queued
  // subscriber invocations time to actually finish before exiting.
  await new Promise((resolve) => setTimeout(resolve, 5000))

  logger.info("Done.")
}
