import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  deleteSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { SHIPPING_ZONE_MODULE } from "./modules/shipping-zone"

// All monetary values below are in major currency units (as-is), matching Medusa's
// pricing convention — e.g. `nepalPrice: 490` means NPR 490, not 49000 paisa.

const COUNTRIES: Record<"nepal" | "hongKong", string[]> = {
  nepal: ["np"],
  hongKong: ["hk"],
}

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

type ZoneNodeDef = {
  name: string
  code: string
  rate: number | null
  children: ZoneNodeDef[]
}

const NEPAL_ZONE_TREE: ZoneNodeDef[] = [
  {
    name: "Nepal", code: "nepal", rate: null,
    children: [
      {
        name: "Bagmati", code: "bagmati", rate: null,
        children: [
          {
            name: "Kathmandu", code: "kathmandu", rate: null,
            children: [
              { name: "Inside Ringroad", code: "inside-ringroad", rate: 150, children: [] },
              { name: "Outside Ringroad", code: "outside-ringroad", rate: 200, children: [] },
            ],
          },
          {
            name: "Lalitpur", code: "lalitpur", rate: null,
            children: [
              { name: "Patan", code: "patan", rate: 180, children: [] },
              { name: "Other Areas", code: "lalitpur-other", rate: 220, children: [] },
            ],
          },
        ],
      },
      {
        name: "Lumbini", code: "lumbini", rate: null,
        children: [
          { name: "Butwal", code: "butwal", rate: 320, children: [] },
        ],
      },
    ],
  },
]

const HONG_KONG_ZONE_TREE: ZoneNodeDef[] = [
  {
    name: "Hong Kong", code: "hong-kong", rate: null,
    children: [
      { name: "Hong Kong Island", code: "hong-kong-island", rate: 30, children: [] },
      {
        name: "Kowloon", code: "kowloon", rate: null,
        children: [
          { name: "Yau Tsim Mong", code: "yau-tsim-mong", rate: 32, children: [] },
          { name: "Kwun Tong", code: "kwun-tong", rate: 36, children: [] },
        ],
      },
      { name: "New Territories", code: "new-territories", rate: 45, children: [] },
    ],
  },
]

async function createZoneNodes(
  container: MedusaContainer,
  stockLocationId: string,
  tree: ZoneNodeDef[],
  parentId: string | null = null
): Promise<void> {
  const shippingZoneService: any = container.resolve(SHIPPING_ZONE_MODULE)

  for (const node of tree) {
    const created = await shippingZoneService.createShippingZoneNodes({
      name: node.name,
      code: node.code,
      rate: node.rate,
      enabled: true,
      stock_location_id: stockLocationId,
      parent_id: parentId,
    })

    if (node.children.length > 0) {
      await createZoneNodes(container, stockLocationId, node.children, created.id)
    }
  }
}

export default async function seed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const storeService = container.resolve(Modules.STORE)
  const productModuleService: any = container.resolve(ModuleRegistrationName.PRODUCT)

  // Idempotency guard: if our sales channels already exist the seed has run, so a
  // second invocation would duplicate channels/regions/zones/products. Bail early.
  const [alreadySeeded] = await salesChannelService.listSalesChannels(
    { name: "Nepal" },
    { take: 1 }
  )
  if (alreadySeeded) {
    logger.info("Seed already applied (Nepal sales channel exists) — skipping.")
    return
  }

  logger.info("Resolving existing defaults...")
  // The framework auto-creates a "Default Sales Channel" the first time the store
  // boots (to satisfy Store.default_sales_channel_id). We don't want it — the store
  // only ever sells through Nepal/Hong Kong — so it gets deleted below once Nepal
  // exists to take over as the store default.
  const [defaultSalesChannel] = await salesChannelService.listSalesChannels(
    { name: "Default Sales Channel" },
    { take: 1 }
  )

  const [defaultPublishableApiKey] = await query.graph({
    entity: "api_key",
    fields: ["id", "title"],
    filters: { type: "publishable" },
  }).then((r: any) => r.data)

  const [existingStore] = await storeService.listStores({}, { take: 1 })

  logger.info("Creating sales channels...")
  const [nepalSalesChannel] = await salesChannelService.createSalesChannels([
    { name: "Nepal", description: "Nepal sales channel", is_disabled: false },
  ])
  const [hongKongSalesChannel] = await salesChannelService.createSalesChannels([
    { name: "Hong Kong", description: "Hong Kong sales channel", is_disabled: false },
  ])

  logger.info("Updating store with NPR/HKD currencies...")
  const supportedCurrencies = [
    ...(existingStore.supported_currencies?.filter(
      (c: any) => c.currency_code !== "npr" && c.currency_code !== "hkd"
    ) ?? []),
    { currency_code: "npr", is_default: true },
    { currency_code: "hkd", is_default: false },
  ]
  await storeService.updateStores(existingStore.id, {
    name: "Hakeems Store",
    supported_currencies: supportedCurrencies,
    default_sales_channel_id: nepalSalesChannel.id,
  })

  if (defaultSalesChannel) {
    // Nothing has been linked to it yet at this point in a fresh seed run (products,
    // stock locations and the publishable key are all wired up further below), so it
    // can be deleted outright — no detach step needed.
    logger.info("Removing the auto-created Default Sales Channel...")
    await deleteSalesChannelsWorkflow(container).run({
      input: { ids: [defaultSalesChannel.id] },
    })
  }

  if (defaultPublishableApiKey) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: defaultPublishableApiKey.id, add: [nepalSalesChannel.id, hongKongSalesChannel.id] },
    })
  }

  logger.info("Seeding region data...")
  // Nepal always gets the Fonepay placeholder (no external dependency). Hong Kong
  // gets Stripe when it's actually registered (STRIPE_SECRET_KEY set — see
  // medusa-config.ts); otherwise fall back to the system provider so the region
  // isn't left without any way to pay.
  const nepalPaymentProviders = ["pp_fonepay-placeholder_fonepay-placeholder"]
  const hongKongPaymentProviders = process.env.STRIPE_SECRET_KEY
    ? ["pp_stripe_stripe"]
    : ["pp_system_default"]

  await createRegionsWorkflow(container).run({
    input: {
      regions: [{
        name: "Nepal",
        currency_code: "npr",
        countries: COUNTRIES.nepal,
        payment_providers: nepalPaymentProviders,
      }],
    },
  })

  await createRegionsWorkflow(container).run({
    input: {
      regions: [{
        name: "Hong Kong",
        currency_code: "hkd",
        countries: COUNTRIES.hongKong,
        payment_providers: hongKongPaymentProviders,
      }],
    },
  })

  logger.info("Seeding tax regions...")
  await createTaxRegionsWorkflow(container).run({
    input: [
      { country_code: "np", provider_id: "tp_system" },
      { country_code: "hk", provider_id: "tp_system" },
    ],
  })

  logger.info("Seeding stock locations...")
  const { result: [nepalStockLocation] } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [{
        name: "Nepal Warehouse",
        address: {
          address_1: "Kathmandu",
          country_code: "NP",
          city: "Kathmandu",
        },
      }],
    },
  })

  const { result: [hongKongStockLocation] } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [{
        name: "Hong Kong Warehouse",
        address: {
          address_1: "Hong Kong",
          country_code: "HK",
          city: "Hong Kong",
        },
      }],
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: nepalStockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: nepalStockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "shipping-zone-fulfillment_shipping-zone-fulfillment" },
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: hongKongStockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: hongKongStockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "shipping-zone-fulfillment_shipping-zone-fulfillment" },
  })

  logger.info("Seeding fulfillment sets and shipping options...")
  const { data: [shippingProfile] } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })

  const nepalFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Nepal Warehouse delivery",
    type: "shipping",
    service_zones: [{
      name: "Nepal",
      geo_zones: [{ country_code: "np", type: "country" }],
    }],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: nepalStockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: nepalFulfillmentSet.id },
  })

  const hongKongFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Hong Kong Warehouse delivery",
    type: "shipping",
    service_zones: [{
      name: "Hong Kong",
      geo_zones: [{ country_code: "hk", type: "country" }],
    }],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: hongKongStockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: hongKongFulfillmentSet.id },
  })

  const shippingOptionRule = {
    attribute: "enabled_in_store",
    value: "true",
    operator: "eq",
  } as const

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "calculated",
        provider_id: "shipping-zone-fulfillment_shipping-zone-fulfillment",
        service_zone_id: nepalFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "Zone-based shipping pricing", code: "standard" },
        rules: [shippingOptionRule],
      },
      {
        name: "Manual Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: nepalFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Manual", description: "Flat rate shipping", code: "manual" },
        prices: [{ currency_code: "npr", amount: 100 }],
        rules: [shippingOptionRule],
      },
      {
        name: "Standard Shipping",
        price_type: "calculated",
        provider_id: "shipping-zone-fulfillment_shipping-zone-fulfillment",
        service_zone_id: hongKongFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "Zone-based shipping pricing", code: "standard" },
        rules: [shippingOptionRule],
      },
      {
        name: "Manual Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: hongKongFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Manual", description: "Flat rate shipping", code: "manual" },
        prices: [{ currency_code: "hkd", amount: 80 }],
        rules: [shippingOptionRule],
      },
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: nepalStockLocation.id, add: [nepalSalesChannel.id, hongKongSalesChannel.id] },
  })
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: hongKongStockLocation.id, add: [nepalSalesChannel.id, hongKongSalesChannel.id] },
  })

  logger.info("Seeding shipping zone nodes...")
  await createZoneNodes(container, nepalStockLocation.id, NEPAL_ZONE_TREE)
  await createZoneNodes(container, hongKongStockLocation.id, HONG_KONG_ZONE_TREE)
  logger.info("Shipping zone nodes created")

  logger.info("Seeding product categories...")
  const { result: categoryResult } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        { name: "Tops", is_active: true },
        { name: "Bottoms", is_active: true },
        { name: "Accessories", is_active: true },
        { name: "Sets", is_active: true },
      ],
    },
  })
  const catMap = new Map(categoryResult.map((c: any) => [c.name, c.id]))

  logger.info("Seeding products...")
  // Options are defined inline per product (Medusa scopes options to their product),
  // and variants reference option values by the option title.
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
      sales_channels: [
        { id: nepalSalesChannel.id },
        { id: hongKongSalesChannel.id },
      ],
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
    const colorOption = (product.options ?? []).find(
      (o: any) => /colou?r/i.test(o.title)
    )
    for (const val of colorOption?.values ?? []) {
      const swatch = COLOR_SWATCHES[val.value]
      if (swatch) {
        await productModuleService.updateProductOptionValues(val.id, {
          metadata: { swatch },
        })
      }
    }
  }

  logger.info("Seeding inventory levels...")
  // Map each variant to its inventory item via the link (not by array index), so
  // stock lands on the correct variant regardless of creation/query ordering.
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

  const inventoryLevels: {
    location_id: string
    stocked_quantity: number
    inventory_item_id: string
  }[] = []
  for (const variant of variants) {
    const stock = stockByProductId.get(variant.product_id)
    const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id
    if (!stock || !inventoryItemId) {
      continue
    }
    inventoryLevels.push(
      { location_id: nepalStockLocation.id, stocked_quantity: stock.nepalStock, inventory_item_id: inventoryItemId },
      { location_id: hongKongStockLocation.id, stocked_quantity: stock.hongKongStock, inventory_item_id: inventoryItemId }
    )
  }

  if (inventoryLevels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    })
  }

  logger.info("Seeding collections...")
  await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        { title: "Tops", handle: "tops" },
        { title: "Bottoms", handle: "bottoms" },
        { title: "Accessories", handle: "accessories" },
        { title: "Sets", handle: "sets" },
      ],
    },
  })

  logger.info("Hakeems Medusa seed complete!")
}
