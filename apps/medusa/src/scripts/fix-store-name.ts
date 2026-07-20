import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * One-off data fix: the Hakeems -> Lopho rename (see ENTERPRISE_OVERHAUL_LOG.md Part V)
 * updated src/seed.ts's `storeService.updateStores(..., { name: "Lopho Store" })` call,
 * but seed.ts bails out early whenever the Nepal sales channel already exists — so
 * re-running the seed (or just pulling the new code) never actually applies it. The
 * store's name was still "Hakeems Store" in the database.
 */
export default async function fixStoreName({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeService = container.resolve(Modules.STORE)

  const [store] = await storeService.listStores({}, { take: 1 })
  if (!store) {
    logger.warn("No store found — nothing to fix.")
    return
  }
  if (store.name === "Lopho Store") {
    logger.info('Store name already "Lopho Store" — skipping.')
    return
  }

  await storeService.updateStores(store.id, { name: "Lopho Store" })
  logger.info(`Renamed store ${store.id}: "${store.name}" -> "Lopho Store"`)
}
