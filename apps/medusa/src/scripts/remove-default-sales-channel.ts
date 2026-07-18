import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  deleteSalesChannelsWorkflow,
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * One-off cleanup for databases that were already seeded before `seed.ts` stopped
 * creating/using the framework's auto-created "Default Sales Channel" — detaches it
 * from everything, repoints the store's default to Nepal, then deletes it.
 *
 * Safe to re-run: exits immediately once the channel is gone.
 *
 *   npx medusa exec ./src/scripts/remove-default-sales-channel.ts
 */
export default async function removeDefaultSalesChannel({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const storeService = container.resolve(Modules.STORE)

  const [defaultChannel] = await salesChannelService.listSalesChannels(
    { name: "Default Sales Channel" },
    { take: 1 }
  )
  if (!defaultChannel) {
    logger.info("No 'Default Sales Channel' found — nothing to do.")
    return
  }

  const [nepalChannel] = await salesChannelService.listSalesChannels(
    { name: "Nepal" },
    { take: 1 }
  )
  if (!nepalChannel) {
    throw new Error(
      "Nepal sales channel not found — run the main seed (`npm run seed`) first."
    )
  }

  const [store] = await storeService.listStores({}, { take: 1 })
  if (store.default_sales_channel_id === defaultChannel.id) {
    logger.info("Repointing store default sales channel to Nepal...")
    await storeService.updateStores(store.id, {
      default_sales_channel_id: nepalChannel.id,
    })
  }

  logger.info("Detaching products from the default sales channel...")
  const {
    data: [channelWithProducts],
  } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "products_link.product_id"],
    filters: { id: defaultChannel.id },
  })
  const productIds = (channelWithProducts?.products_link ?? []).map(
    (l: any) => l.product_id
  )
  if (productIds.length > 0) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: { id: defaultChannel.id, remove: productIds },
    })
  }

  logger.info("Detaching stock locations from the default sales channel...")
  const {
    data: [channelWithLocations],
  } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "stock_locations.id"],
    filters: { id: defaultChannel.id },
  })
  const locationIds = (channelWithLocations?.stock_locations ?? []).map(
    (l: any) => l.id
  )
  for (const locationId of locationIds) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: locationId, remove: [defaultChannel.id] },
    })
  }

  logger.info("Detaching API keys from the default sales channel...")
  const {
    data: [channelWithApiKeys],
  } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "api_keys_link.publishable_key_id"],
    filters: { id: defaultChannel.id },
  })
  const apiKeyIds = (channelWithApiKeys?.api_keys_link ?? []).map(
    (l: any) => l.publishable_key_id
  )
  for (const apiKeyId of apiKeyIds) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKeyId, remove: [defaultChannel.id] },
    })
  }

  logger.info("Deleting the default sales channel...")
  await deleteSalesChannelsWorkflow(container).run({
    input: { ids: [defaultChannel.id] },
  })

  logger.info(
    "Default Sales Channel removed. Store now defaults to Nepal; only Nepal and Hong Kong remain."
  )
}
