import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteCollectionsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import fs from "node:fs"
import path from "node:path"

/**
 * Catalog seeder (Medusa side) — consumes the reviewed mapping.json + the Strapi
 * upload-manifest.json (run `pnpm --filter @hakeems/strapi seed:catalog` FIRST so the
 * image URLs exist). See ENTERPRISE_OVERHAUL_LOG.md Part III.
 *
 * Model decisions (documented there):
 * - 1 scraped style = 1 product; Color/Size options; variants carry their COLORWAY's price.
 * - Membership via CATEGORIES (many-to-many): taxonomy (tops/bottoms/bras/jackets/
 *   accessories) + curated merchandising (spotlight/new-arrivals). Collections mirror the
 *   taxonomy solely as Strapi collection-page anchors; product.collection_id = primary
 *   category's collection (powers the PDP "More from X" rail).
 * - Old demo catalog (7 Unsplash products, sets category/collection) is retired.
 * - Inventory: deterministic per-SKU quantities (a few land <=5 to exercise LOW_STOCK).
 *
 *   npx medusa exec ./src/scripts/seed-catalog.ts        (idempotent: skips existing handles)
 */

const ATHLETA_DIR = path.resolve(process.cwd(), "../../scraped-data/athleta")

type Colorway = {
  name: string
  folder: string
  hex: string
  priceNpr: number
  priceHkd: number
  images: string[]
}
type MappedProduct = {
  handle: string
  title: string
  category: string
  sizes: string[]
  description: string
  fullDescription: string
  skuStyle: string | null
  colorways: Colorway[]
  collections: string[]
}

const TAXONOMY = [
  { name: "Tops", handle: "tops" },
  { name: "Bottoms", handle: "bottoms" },
  { name: "Bras", handle: "bras" },
  { name: "Jackets", handle: "jackets" },
  { name: "Accessories", handle: "accessories" },
]
const MERCH = [
  { name: "Spotlight", handle: "spotlight" },
  { name: "New Arrivals", handle: "new-arrivals" },
]
const RETIRED_COLLECTION_HANDLES = ["sets"]

/** Deterministic pseudo-random stock so re-seeds are stable; ~1 in 8 SKUs lands low. */
function stockFor(sku: string, salt: number): number {
  let h = salt
  for (const ch of sku) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 8 === 0 ? 3 : 8 + (h % 22)
}

export default async function seedCatalog({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  const mapping: MappedProduct[] = JSON.parse(fs.readFileSync(path.join(ATHLETA_DIR, "mapping.json"), "utf8"))
  const manifest: Record<string, { id: number; url: string }> = JSON.parse(
    fs.readFileSync(path.join(ATHLETA_DIR, "upload-manifest.json"), "utf8"),
  )
  const urlOf = (rel: string) => {
    const entry = manifest[rel]
    if (!entry) throw new Error(`No uploaded media for ${rel} — run the Strapi seed:catalog first`)
    return entry.url
  }

  // --- 1. Retire products that aren't in the mapping (old demo catalog) ---
  const keep = new Set(mapping.map((p) => p.handle))
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const staleIds = existingProducts.filter((p: any) => !keep.has(p.handle)).map((p: any) => p.id)
  if (staleIds.length > 0) {
    await deleteProductsWorkflow(container).run({ input: { ids: staleIds } })
    logger.info(`Retired ${staleIds.length} products not in the scraped catalog`)
  }

  // --- 2. Categories: taxonomy + merchandising (many-to-many membership driver) ---
  const { data: existingCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name"],
  })
  const catByHandle = new Map(existingCats.map((c: any) => [c.handle, c.id]))
  const missingCats = [...TAXONOMY, ...MERCH].filter((c) => !catByHandle.has(c.handle))
  if (missingCats.length > 0) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingCats.map((c) => ({ name: c.name, handle: c.handle, is_active: true })) },
    })
    for (const created of result as any[]) catByHandle.set(created.handle, created.id)
    logger.info(`Created categories: ${missingCats.map((c) => c.handle).join(", ")}`)
  }

  // --- 3. Collections: mirror taxonomy + keep merch anchors; retire "sets" ---
  const { data: existingCols } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  })
  const colByHandle = new Map(existingCols.map((c: any) => [c.handle, c.id]))
  const missingCols = [...TAXONOMY, ...MERCH].filter((c) => !colByHandle.has(c.handle))
  if (missingCols.length > 0) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: missingCols.map((c) => ({ title: c.name, handle: c.handle })) },
    })
    for (const created of result as any[]) colByHandle.set(created.handle, created.id)
    logger.info(`Created collections: ${missingCols.map((c) => c.handle).join(", ")}`)
  }
  const retiredColIds = RETIRED_COLLECTION_HANDLES.map((h) => colByHandle.get(h)).filter(Boolean) as string[]
  if (retiredColIds.length > 0) {
    await deleteCollectionsWorkflow(container).run({ input: { ids: retiredColIds } })
    logger.info(`Retired collections: ${RETIRED_COLLECTION_HANDLES.join(", ")}`)
  }

  // --- 4. Channels / shipping profile / stock locations ---
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id", "name"] })
  const channelIds = channels
    .filter((c: any) => ["Nepal", "Hong Kong"].includes(c.name))
    .map((c: any) => ({ id: c.id }))
  const [shippingProfile] = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  const { data: stockLocations } = await query.graph({ entity: "stock_location", fields: ["id", "name"] })
  const nepalLocation = stockLocations.find((l: any) => /nepal/i.test(l.name))
  const hkLocation = stockLocations.find((l: any) => /hong\s*kong/i.test(l.name))
  if (!nepalLocation || !hkLocation) throw new Error("Stock locations missing — run the base seed first")

  // --- 5. Create products (skip handles that already exist → idempotent) ---
  const { data: currentProducts } = await query.graph({ entity: "product", fields: ["handle"] })
  const already = new Set(currentProducts.map((p: any) => p.handle))
  const toCreate = mapping.filter((p) => !already.has(p.handle))

  const productsInput = toCreate.map((p) => {
    const colorNames = p.colorways.map((c) => c.name)
    const variants = p.colorways.flatMap((colorway) =>
      p.sizes.map((sizeName) => ({
        title: `${sizeName} / ${colorway.name}`,
        sku: `ATH-${p.skuStyle ?? p.handle.toUpperCase()}-${colorway.folder}-${sizeName.replace(/\s+/g, "").toUpperCase()}`,
        options: { Size: sizeName, Color: colorway.name },
        prices: [
          { amount: colorway.priceNpr, currency_code: "npr" },
          { amount: colorway.priceHkd, currency_code: "hkd" },
        ],
        manage_inventory: true,
        allow_backorder: false,
      })),
    )

    // Product-level fallback imagery: the opening image of each colorway (CMS colorway
    // galleries are the primary presentation source).
    const images = p.colorways.slice(0, 6).map((c) => ({ url: urlOf(c.images[0]) }))

    return {
      title: p.title,
      handle: p.handle,
      // The cleaned FOR-sentence only — the FEEL/FAVE segments live in the Strapi
      // panels; using the full blob here would duplicate them in the Details accordion.
      description: p.description,
      category_ids: p.collections.map((h) => catByHandle.get(h)).filter(Boolean) as string[],
      collection_id: colByHandle.get(p.category) ?? undefined,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      thumbnail: urlOf(p.colorways[0].images[0]),
      images,
      weight: 300,
      options: [
        { title: "Size", values: p.sizes },
        { title: "Color", values: colorNames },
      ],
      variants,
      sales_channels: channelIds,
    }
  })

  let createdIds: string[] = []
  if (productsInput.length > 0) {
    const { result: created } = await createProductsWorkflow(container).run({ input: { products: productsInput } })
    createdIds = created.map((p: any) => p.id)
    logger.info(`Created ${createdIds.length} products from the scraped catalog`)
  } else {
    logger.info("All catalog products already exist — nothing to create")
  }

  if (createdIds.length > 0) {
    // --- 6. Swatch metadata on Color option values (pixel-derived hex; CMS hex still wins) ---
    const hexByProductColor = new Map(
      mapping.flatMap((p) => p.colorways.map((c) => [`${p.handle}::${c.name}`, c.hex] as const)),
    )
    const { data: productsWithOptions } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "options.title", "options.values.id", "options.values.value"],
      filters: { id: createdIds },
    })
    for (const product of productsWithOptions) {
      const colorOption = (product.options ?? []).find((o: any) => /colou?r/i.test(o.title))
      for (const val of colorOption?.values ?? []) {
        const swatch = hexByProductColor.get(`${product.handle}::${val.value}`)
        if (swatch) await productModuleService.updateProductOptionValues(val.id, { metadata: { swatch } })
      }
    }
    logger.info("Applied pixel-derived swatch hexes to option values")

    // --- 7. Inventory levels (deterministic; some SKUs low-stock by design) ---
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "inventory_items.inventory_item_id"],
      filters: { product_id: createdIds },
    })
    const inventoryLevels: { location_id: string; stocked_quantity: number; inventory_item_id: string }[] = []
    for (const variant of variants) {
      const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id
      if (!inventoryItemId) continue
      inventoryLevels.push(
        { location_id: nepalLocation.id, stocked_quantity: stockFor(variant.sku ?? variant.id, 7), inventory_item_id: inventoryItemId },
        { location_id: hkLocation.id, stocked_quantity: stockFor(variant.sku ?? variant.id, 13), inventory_item_id: inventoryItemId },
      )
    }
    if (inventoryLevels.length > 0) {
      await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: inventoryLevels } })
      logger.info(`Set inventory for ${inventoryLevels.length / 2} variants at both locations`)
    }
  }

  // Collection create/delete events sync to Strapi on the in-memory bus — give the
  // fire-and-forget subscriber a moment before the process exits.
  await new Promise((resolve) => setTimeout(resolve, 5000))
  logger.info("Catalog seed complete")
}
