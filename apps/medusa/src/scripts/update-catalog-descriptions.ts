import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import fs from "node:fs"
import path from "node:path"

/**
 * One-off alignment pass: set each catalog product's description to the mapping's
 * cleaned FOR-sentence (the FEEL/FAVE segments live in the Strapi PDP panels — the
 * full blob duplicated them in the Details accordion).
 *
 *   npx medusa exec ./src/scripts/update-catalog-descriptions.ts
 */
export default async function updateDescriptions({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModuleService = container.resolve(Modules.PRODUCT)

  const mapping: Array<{ handle: string; description: string }> = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "../../scraped-data/athleta/mapping.json"), "utf8"),
  )
  const byHandle = new Map(mapping.map((p) => [p.handle, p.description]))

  const { data: products } = await query.graph({ entity: "product", fields: ["id", "handle"] })
  let updated = 0
  for (const product of products) {
    const description = byHandle.get(product.handle)
    if (!description) continue
    await productModuleService.updateProducts(product.id, { description })
    updated += 1
  }
  logger.info(`Updated ${updated} product descriptions to the cleaned FOR-sentence`)
}
