import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, ModuleRegistrationName, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createProductsWorkflow, createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off repair: the 7 catalog products from src/seed.ts's PRODUCTS array were found
 * soft-deleted in this environment (product.deleted_at set on all of them, everything
 * else — channels/regions/stock locations/categories/collections — intact). Rather
 * than re-running the full seed (blocked by its own idempotency guard, and unsafe to
 * bypass since it'd also try to recreate channels/regions/shipping with fresh ids that
 * wouldn't match the ones hardcoded in apps/storefront/src/lib/medusa/config.ts),
 * this recreates just the products, reusing the existing categories/stock
 * locations/sales channels/shipping profile by lookup.
 *
 * Safe to re-run: product.handle's unique index excludes soft-deleted rows, so nothing
 * blocks recreation, but running this twice would create duplicate live products —
 * check `select title, deleted_at from product;` first if unsure.
 *
 *   npx medusa exec ./src/scripts/restore-products.ts
 */

const COLOR_SWATCHES: Record<string, string> = {
  Onyx: "#0F0F0F",
  Chalk: "#F5F0EB",
  "Soft Sage": "#BEC5B0",
  Sandstone: "#C4A882",
  Espresso: "#4A3728",
}

type ProductDef = {
  title: string
  handle: string
  description: string
  category: string
  sizes: string[]
  colors: string[]
  weight: number
  images: { url: string }[]
  nepalPrice: number
  hongKongPrice: number
  nepalStock: number
  hongKongStock: number
}

const PRODUCTS: ProductDef[] = [
  {
    title: "Salutation Stash Tank",
    handle: "salutation-stash-tank",
    description: "Our do-everything studio tank in buttery Powervita knit, with a hidden stash pocket at the back hem and a built-in shelf bra for light support.",
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Onyx", "Chalk", "Soft Sage"],
    weight: 200,
    images: [
      { url: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80" },
    ],
    nepalPrice: 490,
    hongKongPrice: 380,
    nepalStock: 24,
    hongKongStock: 18,
  },
  {
    title: "Renew Studio Tee",
    handle: "renew-studio-tee",
    description: "The softest everyday tee, cut from GOTS-certified organic cotton with a relaxed drape. Garment-dyed for depth of colour.",
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Chalk", "Soft Sage", "Espresso"],
    weight: 180,
    images: [
      { url: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80" },
    ],
    nepalPrice: 390,
    hongKongPrice: 300,
    nepalStock: 26,
    hongKongStock: 20,
  },
  {
    title: "Coaster Luxe Sweatshirt",
    handle: "coaster-luxe-sweatshirt",
    description: "Our beloved Coaster in plush brushed-back fleece with a relaxed, cocooning fit and ribbed trims.",
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Sandstone", "Onyx", "Soft Sage"],
    weight: 400,
    images: [
      { url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80" },
    ],
    nepalPrice: 890,
    hongKongPrice: 690,
    nepalStock: 16,
    hongKongStock: 12,
  },
  {
    title: "Salutation Stash 7/8 Tight",
    handle: "salutation-stash-tight",
    description: "The tight that started it all. Buttery, sculpting Powervita knit with a high, stay-put waistband and dual side stash pockets.",
    category: "Bottoms",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Onyx", "Soft Sage", "Espresso"],
    weight: 250,
    images: [
      { url: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80" },
    ],
    nepalPrice: 990,
    hongKongPrice: 780,
    nepalStock: 22,
    hongKongStock: 18,
  },
  {
    title: "Rainier Fleece Jogger",
    handle: "rainier-jogger",
    description: "The weekend jogger in soft brushed-back fleece with a tapered leg, ribbed cuffs and a tonal drawcord waist.",
    category: "Bottoms",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Sandstone", "Onyx"],
    weight: 350,
    images: [
      { url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80" },
    ],
    nepalPrice: 850,
    hongKongPrice: 660,
    nepalStock: 16,
    hongKongStock: 12,
  },
  {
    title: "All-About Crossbody Bag",
    handle: "all-about-crossbody",
    description: "The grab-and-go crossbody in water-resistant recycled ripstop, with a smooth-glide zip, interior organization and an adjustable strap.",
    category: "Accessories",
    sizes: ["One Size"],
    colors: ["Onyx", "Sandstone"],
    weight: 150,
    images: [
      { url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1606522754091-a3bbf9ad4cb3?w=800&q=80" },
    ],
    nepalPrice: 550,
    hongKongPrice: 430,
    nepalStock: 22,
    hongKongStock: 18,
  },
  {
    title: "Studio Bra + Tight Set",
    handle: "studio-bra-tight-set",
    description: "The matched studio set — a medium-support bra and high-rise 7/8 tight in coordinating Powervita knit.",
    category: "Sets",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Onyx", "Soft Sage"],
    weight: 500,
    images: [
      { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80" },
    ],
    nepalPrice: 1290,
    hongKongPrice: 990,
    nepalStock: 12,
    hongKongStock: 10,
  },
]

export default async function restoreProducts({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
  const productModuleService: any = container.resolve(ModuleRegistrationName.PRODUCT)

  const [alreadyRestored] = await query
    .graph({ entity: "product", fields: ["id"], filters: { handle: PRODUCTS.map((p) => p.handle) } })
    .then((r: any) => r.data)
  if (alreadyRestored) {
    logger.info("A product with a seed handle already exists (not soft-deleted) — skipping to avoid duplicates.")
    return
  }

  logger.info("Looking up existing sales channels, stock locations, categories, shipping profile...")
  const [nepalSalesChannel] = await salesChannelService.listSalesChannels({ name: "Nepal" }, { take: 1 })
  const [hongKongSalesChannel] = await salesChannelService.listSalesChannels({ name: "Hong Kong" }, { take: 1 })
  const [nepalStockLocation] = await stockLocationService.listStockLocations({ name: "Nepal Warehouse" }, { take: 1 })
  const [hongKongStockLocation] = await stockLocationService.listStockLocations({ name: "Hong Kong Warehouse" }, { take: 1 })

  if (!nepalSalesChannel || !hongKongSalesChannel || !nepalStockLocation || !hongKongStockLocation) {
    throw new Error("Expected sales channels / stock locations to already exist — run the full seed first.")
  }

  const { data: categories } = await query.graph({ entity: "product_category", fields: ["id", "name"] })
  const catMap = new Map(categories.map((c: any) => [c.name, c.id]))

  const { data: [shippingProfile] } = await query.graph({ entity: "shipping_profile", fields: ["id"] })

  logger.info("Recreating products...")
  const productsInput = PRODUCTS.map((p) => {
    const variants = p.sizes.flatMap((sizeName) =>
      p.colors.map((colorName) => {
        const sku = `HKM-${p.handle.toUpperCase()}-${colorName.toUpperCase().replace(/\s+/g, "-")}-${sizeName.toUpperCase().replace(/\s+/g, "-")}`
        return {
          title: `${sizeName} / ${colorName}`,
          sku,
          options: { Size: sizeName, Color: colorName },
          prices: [
            { amount: p.nepalPrice, currency_code: "npr" },
            { amount: p.hongKongPrice, currency_code: "hkd" },
          ],
          manage_inventory: true,
          allow_backorder: false,
        }
      })
    )

    return {
      title: p.title,
      handle: p.handle,
      description: p.description,
      category_ids: [catMap.get(p.category)!],
      weight: p.weight,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: p.images,
      options: [
        { title: "Size", values: p.sizes },
        { title: "Color", values: p.colors },
      ],
      variants,
      sales_channels: [{ id: nepalSalesChannel.id }, { id: hongKongSalesChannel.id }],
    }
  })

  const { result: createdProducts } = await createProductsWorkflow(container).run({
    input: { products: productsInput },
  })
  const createdProductIds = createdProducts.map((p: any) => p.id)

  logger.info("Setting color swatches on product option values...")
  const { data: productsWithOptions } = await query.graph({
    entity: "product",
    fields: ["id", "options.title", "options.values.id", "options.values.value"],
    filters: { id: createdProductIds },
  })
  for (const product of productsWithOptions) {
    const colorOption = (product.options ?? []).find((o: any) => /colou?r/i.test(o.title))
    for (const val of colorOption?.values ?? []) {
      const swatch = COLOR_SWATCHES[val.value]
      if (swatch) {
        await productModuleService.updateProductOptionValues(val.id, { metadata: { swatch } })
      }
    }
  }

  logger.info("Seeding inventory levels...")
  const stockByProductId = new Map(
    createdProducts.map((p: any) => {
      const def = PRODUCTS.find((d) => d.handle === p.handle)!
      return [p.id, { nepalStock: def.nepalStock, hongKongStock: def.hongKongStock }]
    })
  )
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "inventory_items.inventory_item_id"],
    filters: { product_id: createdProductIds },
  })
  const inventoryLevels: { location_id: string; stocked_quantity: number; inventory_item_id: string }[] = []
  for (const variant of variants) {
    const stock = stockByProductId.get(variant.product_id) as { nepalStock: number; hongKongStock: number } | undefined
    const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id
    if (!stock || !inventoryItemId) continue
    inventoryLevels.push(
      { location_id: nepalStockLocation.id, stocked_quantity: stock.nepalStock, inventory_item_id: inventoryItemId },
      { location_id: hongKongStockLocation.id, stocked_quantity: stock.hongKongStock, inventory_item_id: inventoryItemId }
    )
  }
  if (inventoryLevels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: inventoryLevels } })
  }

  logger.info(`Restored ${createdProducts.length} products.`)
}
