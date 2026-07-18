import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * One-way sync: whenever a collection is created, renamed, or deleted in Medusa,
 * pushes {medusaCollectionId, name, slug} to Strapi's `POST /api/collection-pages/sync`
 * (apps/strapi/src/api/collection-page). Medusa is the source of truth for which
 * collections exist; Strapi only owns presentation (banner, tagline, featured).
 *
 * There is no reverse sync: nothing in Strapi ever needs to be written back into Medusa.
 */
export default async function collectionSyncHandler({
  event: { name: eventName, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const url = process.env.STRAPI_SYNC_URL
  const secret = process.env.HAKEEMS_SYNC_SECRET
  if (!url || !secret) return

  let payload: {
    action: "upsert" | "delete"
    collections: { medusaCollectionId: string; name?: string; slug?: string }[]
  }

  if (eventName === "product-collection.deleted") {
    // The row is already gone by the time this fires — only the id survives in the
    // event payload, which is all Strapi's delete branch needs to look the record up.
    payload = { action: "delete", collections: [{ medusaCollectionId: data.id }] }
  } else {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: collections } = await query.graph({
      entity: "product_collection",
      fields: ["id", "title", "handle"],
      filters: { id: data.id },
    })
    const collection = collections[0]
    if (!collection) return

    payload = {
      action: "upsert",
      collections: [{ medusaCollectionId: collection.id, name: collection.title, slug: collection.handle }],
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hakeems-Sync-Secret": secret,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      logger.warn(`Strapi sync failed for collection ${data.id}: ${response.status} ${await response.text()}`)
    }
  } catch (error: any) {
    logger.warn(`Strapi sync failed: ${error?.message || error}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product-collection.created", "product-collection.updated", "product-collection.deleted"],
}
