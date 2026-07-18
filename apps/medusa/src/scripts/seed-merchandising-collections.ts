import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, ModuleRegistrationName } from "@medusajs/framework/utils"
import { createCollectionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Creates the two merchandising collections the homepage's Strapi-authored sections
 * reference (section.product-rail "Spotlight", section.editorial-banner "New Arrivals")
 * — unlike Tops/Bottoms/Accessories/Sets, these are curated cross-category picks rather
 * than a taxonomy, so they're assembled here by handle rather than in the main seed.
 *
 * Safe to re-run: skips creation if the collection already exists, and always
 * re-applies the product membership list.
 *
 *   npx medusa exec ./src/scripts/seed-merchandising-collections.ts
 */

const SPOTLIGHT_HANDLES = [
  "salutation-stash-tank",
  "coaster-luxe-sweatshirt",
  "salutation-stash-tight",
  "all-about-crossbody",
  "studio-bra-tight-set",
]

// A product can only belong to one collection at a time (collection_id is a single FK,
// not a join table) — no overlap with SPOTLIGHT_HANDLES above.
const NEW_ARRIVALS_HANDLES = ["renew-studio-tee", "rainier-jogger"]

async function ensureCollection(container: MedusaContainer, title: string, handle: string, productHandles: string[]) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "product_collection",
    fields: ["id"],
    filters: { handle },
  })

  let collectionId = existing[0]?.id
  if (!collectionId) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: [{ title, handle }] },
    })
    collectionId = result[0].id
    logger.info(`Created collection: ${title} (${handle})`)
  } else {
    logger.info(`Collection already exists: ${title} (${handle})`)
  }

  // Array-shorthand `filters: { handle: [...] }` intermittently trips a MikroORM
  // criteria-building bug in this environment ("Trying to query by not existing
  // property Product.0") — sidestep it by filtering client-side instead.
  const { data: allProducts } = await query.graph({ entity: "product", fields: ["id", "handle"] })
  const wanted = new Set(productHandles)
  const products = allProducts.filter((p: any) => wanted.has(p.handle))
  if (products.length === 0) {
    logger.warn(`No products matched for "${title}" — check the handle list.`)
    return
  }

  // One-at-a-time rather than a bulk array update — a bulk call here intermittently
  // trips the same MikroORM criteria-building bug noted above.
  const productModuleService: any = container.resolve(ModuleRegistrationName.PRODUCT)
  for (const product of products) {
    await productModuleService.updateProducts(product.id, { collection_id: collectionId })
  }
  logger.info(`Linked ${products.length} products to "${title}".`)
}

export default async function seedMerchandisingCollections({ container }: { container: MedusaContainer }) {
  await ensureCollection(container, "Spotlight", "spotlight", SPOTLIGHT_HANDLES)
  await ensureCollection(container, "New Arrivals", "new-arrivals", NEW_ARRIVALS_HANDLES)
}
