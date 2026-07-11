import 'dotenv/config';

const ADMIN_API_URL = process.env.VENDURE_ADMIN_API_URL || 'http://localhost:3000/admin-api';
const USERNAME = process.env.SUPERADMIN_USERNAME || 'superadmin';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin';

type GraphQLResult<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

let authToken = '';
let sessionCookie = '';

async function adminFetch<T>(query: string, variables?: Record<string, unknown>, channelToken?: string) {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      ...(channelToken ? { 'vendure-token': channelToken } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const token = response.headers.get('vendure-auth-token');
  const setCookie = response.headers.get('set-cookie');
  if (token) authToken = token;
  if (setCookie) sessionCookie = setCookie;

  const json = (await response.json()) as GraphQLResult<T>;
  if (!response.ok || json.errors?.length) {
    throw new Error(json.errors?.map((error) => error.message).join('; ') || `Admin API failed: ${response.status}`);
  }

  return json.data as T;
}

async function login() {
  await adminFetch(
    `mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password, rememberMe: true) {
        ... on CurrentUser { id identifier }
        ... on ErrorResult { errorCode message }
      }
    }`,
    { username: USERNAME, password: PASSWORD },
  );
}

async function getCountries() {
  const { countries } = await adminFetch<{
    countries: { items: Array<{ id: string; code: string; name: string }> };
  }>(`query Countries { countries(options: { take: 300 }) { items { id code name } } }`);
  return countries.items;
}

async function ensureCountry(code: string, name: string) {
  const countries = await getCountries();
  const existing = countries.find((item) => item.code === code);
  if (existing) return existing;

  const { createCountry } = await adminFetch<{ createCountry: { id: string; code: string; name: string } }>(
    `mutation CreateCountry($input: CreateCountryInput!) {
      createCountry(input: $input) { id code name }
    }`,
    {
      input: {
        code,
        enabled: true,
        translations: [{ languageCode: 'en', name }],
      },
    },
  );

  return createCountry;
}

async function getTaxCategories() {
  const { taxCategories } = await adminFetch<{
    taxCategories: { items: Array<{ id: string; name: string }> };
  }>(`query TaxCategories { taxCategories(options: { take: 50 }) { items { id name } } }`);
  return taxCategories.items;
}

async function ensureZone(name: string, countryCode: string) {
  const country = await ensureCountry(countryCode, countryCode === 'NP' ? 'Nepal' : 'Hong Kong');

  const { zones } = await adminFetch<{ zones: { items: Array<{ id: string; name: string }> } }>(
    `query Zones { zones { items { id name } } }`,
  );
  const existing = zones.items.find((zone) => zone.name === name);
  if (existing) return existing;

  const { createZone } = await adminFetch<{ createZone: { id: string; name: string } }>(
    `mutation CreateZone($input: CreateZoneInput!) { createZone(input: $input) { id name } }`,
    { input: { name, memberIds: [country.id] } },
  );
  return createZone;
}

async function ensureChannel(input: {
  code: string;
  token: string;
  currencyCode: 'NPR' | 'HKD';
  zoneId: string;
}) {
  const { channels } = await adminFetch<{
    channels: { items: Array<{ id: string; code: string; token: string; defaultCurrencyCode: string }> };
  }>(`query Channels { channels { items { id code token defaultCurrencyCode } } }`);
  const existing = channels.items.find((channel) => channel.code === input.code);
  if (existing) return existing;

  const { createChannel } = await adminFetch<{ createChannel: { id: string; code: string; token: string } }>(
    `mutation CreateChannel($input: CreateChannelInput!) {
      createChannel(input: $input) {
        ... on Channel { id code token }
        ... on LanguageNotAvailableError { errorCode message }
      }
    }`,
    {
      input: {
        code: input.code,
        token: input.token,
        defaultLanguageCode: 'en',
        availableLanguageCodes: ['en'],
        defaultCurrencyCode: input.currencyCode,
        availableCurrencyCodes: [input.currencyCode],
        defaultTaxZoneId: input.zoneId,
        defaultShippingZoneId: input.zoneId,
        pricesIncludeTax: true,
        trackInventory: true,
      },
    },
  );
  return createChannel;
}

async function ensureStockLocation(name: string, channelId: string) {
  const { stockLocations } = await adminFetch<{
    stockLocations: { items: Array<{ id: string; name: string }> };
  }>(`query StockLocations { stockLocations(options: { take: 50 }) { items { id name } } }`);
  const existing = stockLocations.items.find((location) => location.name === name);
  const location =
    existing ||
    (
      await adminFetch<{ createStockLocation: { id: string; name: string } }>(
        `mutation CreateStockLocation($input: CreateStockLocationInput!) {
          createStockLocation(input: $input) { id name }
        }`,
        { input: { name, description: `${name} warehouse` } },
      )
    ).createStockLocation;

  await adminFetch(
    `mutation AssignStock($input: AssignStockLocationsToChannelInput!) {
      assignStockLocationsToChannel(input: $input) { id name }
    }`,
    { input: { channelId, stockLocationIds: [location.id] } },
  ).catch(() => undefined);

  return location;
}

async function ensureTaxRate(name: string, zoneId: string, value: number) {
  let categories = await getTaxCategories();
  let category = categories.find((item) => item.name === 'Standard Tax') || categories[0];

  if (!category) {
    const { createTaxCategory } = await adminFetch<{ createTaxCategory: { id: string; name: string } }>(
      `mutation CreateTaxCategory($input: CreateTaxCategoryInput!) {
        createTaxCategory(input: $input) { id name }
      }`,
      { input: { name: 'Standard Tax' } },
    );
    category = createTaxCategory;
  }

  const { taxRates } = await adminFetch<{ taxRates: { items: Array<{ id: string; name: string }> } }>(
    `query TaxRates { taxRates(options: { take: 50 }) { items { id name } } }`,
  );
  const existing = taxRates.items.find((rate) => rate.name === name);
  if (existing) return existing;

  const { createTaxRate } = await adminFetch<{ createTaxRate: { id: string; name: string } }>(
    `mutation CreateTaxRate($input: CreateTaxRateInput!) {
      createTaxRate(input: $input) { id name }
    }`,
    { input: { name, enabled: true, value, zoneId, categoryId: category.id } },
  );
  return createTaxRate;
}

async function ensureFacet(code: string, name: string, values: Array<{ code: string; name: string }>) {
  const { facets } = await adminFetch<{
    facets: { items: Array<{ id: string; code: string; values: Array<{ id: string; code: string; name: string }> }> };
  }>(`query Facets { facets(options: { take: 100 }) { items { id code values { id code name } } } }`);
  const existing = facets.items.find((facet) => facet.code === code);
  if (existing) return existing;

  const { createFacet } = await adminFetch<{
    createFacet: { id: string; code: string; values: Array<{ id: string; code: string; name: string }> };
  }>(
    `mutation CreateFacet($input: CreateFacetInput!) {
      createFacet(input: $input) { id code values { id code name } }
    }`,
    {
      input: {
        code,
        isPrivate: false,
        translations: [{ languageCode: 'en', name }],
        values: values.map((value) => ({
          code: value.code,
          translations: [{ languageCode: 'en', name: value.name }],
        })),
      },
    },
  );
  return createFacet;
}

async function ensureOptionGroup(code: string, name: string, values: string[]) {
  const { productOptionGroups } = await adminFetch<{
    productOptionGroups: { items: Array<{ id: string; code: string; options: Array<{ id: string; code: string; name: string }> }> };
  }>(`query OptionGroups { productOptionGroups(options: { take: 50 }) { items { id code options { id code name } } } }`);
  const existing = productOptionGroups.items.find((group) => group.code === code);
  if (existing) return existing;

  const { createProductOptionGroup } = await adminFetch<{
    createProductOptionGroup: { id: string; code: string; options: Array<{ id: string; code: string; name: string }> };
  }>(
    `mutation CreateOptionGroup($input: CreateProductOptionGroupInput!) {
      createProductOptionGroup(input: $input) { id code options { id code name } }
    }`,
    {
      input: {
        code,
        translations: [{ languageCode: 'en', name }],
        options: values.map((value) => ({
          code: value.toLowerCase().replace(/\s+/g, '-'),
          translations: [{ languageCode: 'en', name: value }],
        })),
      },
    },
  );
  return createProductOptionGroup;
}

async function assignOptionGroupsToChannels(optionGroupIds: string[], channelIds: string[]) {
  for (const channelId of channelIds) {
    await adminFetch(
      `mutation AssignOptionGroups($input: AssignProductOptionGroupsToChannelInput!) {
        assignProductOptionGroupsToChannel(input: $input) { id code }
      }`,
      { input: { channelId, productOptionGroupIds: optionGroupIds } },
    ).catch(() => undefined);
  }
}

async function ensureShippingMethod(input: {
  code: string;
  channelId: string;
  name: string;
  rates: Record<string, number>;
  fallbackRate: number;
}) {
  const { shippingMethods } = await adminFetch<{
    shippingMethods: { items: Array<{ id: string; code: string }> };
  }>(`query ShippingMethods { shippingMethods(options: { take: 50 }) { items { id code } } }`);
  const existing = shippingMethods.items.find((method) => method.code === input.code);
  const method =
    existing ||
    (
      await adminFetch<{ createShippingMethod: { id: string; code: string } }>(
        `mutation CreateShipping($input: CreateShippingMethodInput!) {
          createShippingMethod(input: $input) { id code }
        }`,
        {
          input: {
            code: input.code,
            fulfillmentHandler: 'manual-fulfillment',
            checker: { code: 'hakeems-district-eligibility-checker', arguments: [] },
            calculator: {
              code: 'hakeems-district-shipping-calculator',
              arguments: [
                { name: 'ratesJson', value: JSON.stringify(input.rates) },
                { name: 'fallbackRate', value: String(input.fallbackRate) },
                { name: 'taxRate', value: '0' },
              ],
            },
            translations: [{ languageCode: 'en', name: input.name, description: `${input.name} district shipping` }],
          },
        },
      )
    ).createShippingMethod;

  await adminFetch(
    `mutation AssignShipping($input: AssignShippingMethodsToChannelInput!) {
      assignShippingMethodsToChannel(input: $input) { id code }
    }`,
    { input: { channelId: input.channelId, shippingMethodIds: [method.id] } },
  ).catch(() => undefined);

  return method;
}

async function ensurePaymentMethod(input: {
  code: string;
  channelId: string;
  name: string;
  handlerCode: string;
  args: Array<{ name: string; value: string }>;
}) {
  const { paymentMethods } = await adminFetch<{
    paymentMethods: { items: Array<{ id: string; code: string }> };
  }>(`query PaymentMethods { paymentMethods(options: { take: 50 }) { items { id code } } }`);
  const existing = paymentMethods.items.find((method) => method.code === input.code);
  const method =
    existing ||
    (
      await adminFetch<{ createPaymentMethod: { id: string; code: string } }>(
        `mutation CreatePayment($input: CreatePaymentMethodInput!) {
          createPaymentMethod(input: $input) { id code }
        }`,
        {
          input: {
            code: input.code,
            enabled: true,
            handler: { code: input.handlerCode, arguments: input.args },
            translations: [{ languageCode: 'en', name: input.name, description: input.name }],
          },
        },
      )
    ).createPaymentMethod;

  await adminFetch(
    `mutation AssignPayment($input: AssignPaymentMethodsToChannelInput!) {
      assignPaymentMethodsToChannel(input: $input) { id code }
    }`,
    { input: { channelId: input.channelId, paymentMethodIds: [method.id] } },
  ).catch(() => undefined);

  return method;
}

async function ensureDefaultChannelZone(zoneId: string) {
  const { channels } = await adminFetch<{
    channels: { items: Array<{ id: string; code: string; defaultTaxZone: { id: string } | null; defaultShippingZone: { id: string } | null }> };
  }>(`query Channels { channels { items { id code defaultTaxZone { id } defaultShippingZone { id } } } }`);
  const defaultChannel = channels.items.find((channel) => channel.code === '__default_channel__');
  if (!defaultChannel || (defaultChannel.defaultTaxZone && defaultChannel.defaultShippingZone)) return;

  await adminFetch(
    `mutation UpdateDefaultChannel($input: UpdateChannelInput!) {
      updateChannel(input: $input) {
        ... on Channel { id code }
        ... on ErrorResult { errorCode message }
      }
    }`,
    { input: { id: defaultChannel.id, defaultTaxZoneId: zoneId, defaultShippingZoneId: zoneId } },
  );
}

async function productExists(slug: string) {
  const { products } = await adminFetch<{ products: { items: Array<{ id: string; slug: string }> } }>(
    `query Products { products(options: { take: 100 }) { items { id slug } } }`,
  );
  return products.items.find((product) => product.slug === slug);
}

/**
 * Creates a product sold in BOTH channels: one variant with a price per currency
 * (NPR for nepal, HKD for hongkong) and a stock level per warehouse. Vendure's
 * MultiChannelStockLocationStrategy (the default since v3.1, unmodified here) then
 * shows/allocates only the stock location that belongs to the active channel, so the
 * Nepal storefront only ever sees Nepal Warehouse stock and vice versa.
 */
async function createSharedProduct(input: {
  name: string;
  slug: string;
  description: string;
  typeValueId: string;
  facetValueIds: string[];
  optionIds: string[];
  optionGroupIds: string[];
  sku: string;
  nepalPrice: number;
  hongKongPrice: number;
  nepalStock: number;
  hongKongStock: number;
  nepalChannelId: string;
  hongKongChannelId: string;
  nepalChannelToken: string;
  hongKongChannelToken: string;
  nepalStockLocationId: string;
  hongKongStockLocationId: string;
  staleStockLocationIds?: string[];
}) {
  const existing = await productExists(input.slug);

  const productId =
    existing?.id ??
    (
      await adminFetch<{ createProduct: { id: string; slug: string } }>(
        `mutation CreateProduct($input: CreateProductInput!) {
          createProduct(input: $input) { id slug }
        }`,
        {
          input: {
            enabled: true,
            facetValueIds: [input.typeValueId, ...input.facetValueIds],
            translations: [
              {
                languageCode: 'en',
                name: input.name,
                slug: input.slug,
                description: input.description,
              },
            ],
          },
        },
      )
    ).createProduct.id;

  // Ensure the product is assigned to both markets, whether newly created or repaired.
  await adminFetch(
    `mutation AssignProduct($input: AssignProductsToChannelInput!) {
      assignProductsToChannel(input: $input) { id slug }
    }`,
    { input: { channelId: input.nepalChannelId, productIds: [productId] } },
    input.nepalChannelToken,
  ).catch(() => undefined);
  await adminFetch(
    `mutation AssignProduct($input: AssignProductsToChannelInput!) {
      assignProductsToChannel(input: $input) { id slug }
    }`,
    { input: { channelId: input.hongKongChannelId, productIds: [productId] } },
    input.hongKongChannelToken,
  ).catch(() => undefined);

  // Idempotent regardless of prior state — safe to call even if already attached.
  for (const optionGroupId of input.optionGroupIds) {
    await adminFetch(
      `mutation AddOptionGroupToProduct($productId: ID!, $optionGroupId: ID!) {
        addOptionGroupToProduct(productId: $productId, optionGroupId: $optionGroupId) { id }
      }`,
      { productId, optionGroupId },
      input.nepalChannelToken,
    ).catch(() => undefined);
  }

  const { product } = await adminFetch<{ product: { variants: Array<{ id: string }> } | null }>(
    `query ProductVariants($id: ID!) { product(id: $id) { variants { id } } }`,
    { id: productId },
    input.nepalChannelToken,
  );

  let variantId = product?.variants?.[0]?.id;

  if (!variantId) {
    const { createProductVariants } = await adminFetch<{ createProductVariants: Array<{ id: string }> }>(
      `mutation CreateVariants($input: [CreateProductVariantInput!]!) {
        createProductVariants(input: $input) { id }
      }`,
      {
        input: [
          {
            productId,
            sku: input.sku,
            enabled: true,
            optionIds: input.optionIds,
            trackInventory: 'TRUE',
            translations: [{ languageCode: 'en', name: input.name }],
          },
        ],
      },
      input.nepalChannelToken,
    );
    variantId = createProductVariants[0].id;
  }

  // A variant is only assigned to the channel it was created in (or, for older seed
  // runs, whichever single channel existed at the time) — ensure it's in both so its
  // per-currency price and per-warehouse stock can be set below.
  await adminFetch(
    `mutation AssignVariantToChannel($input: AssignProductVariantsToChannelInput!) {
      assignProductVariantsToChannel(input: $input) { id }
    }`,
    { input: { productVariantIds: [variantId], channelId: input.nepalChannelId } },
    input.nepalChannelToken,
  ).catch(() => undefined);
  await adminFetch(
    `mutation AssignVariantToChannel($input: AssignProductVariantsToChannelInput!) {
      assignProductVariantsToChannel(input: $input) { id }
    }`,
    { input: { productVariantIds: [variantId], channelId: input.hongKongChannelId } },
    input.nepalChannelToken,
  ).catch(() => undefined);

  // Ensure the NPR price and both warehouses' stock, scoped to the Nepal channel.
  await adminFetch(
    `mutation UpdateVariant($input: [UpdateProductVariantInput!]!) {
      updateProductVariants(input: $input) { id }
    }`,
    {
      input: [
        {
          id: variantId,
          prices: [{ currencyCode: 'NPR', price: input.nepalPrice }],
          stockLevels: [
            { stockLocationId: input.nepalStockLocationId, stockOnHand: input.nepalStock },
            { stockLocationId: input.hongKongStockLocationId, stockOnHand: input.hongKongStock },
            // Zero out stock at any other (e.g. Vendure's auto-created "Default Stock
            // Location") that older seed runs may have written to via the deprecated
            // flat stockOnHand field — it belongs to no channel here and was just
            // confusing leftover clutter in the Dashboard's stock editor.
            ...(input.staleStockLocationIds ?? []).map((stockLocationId) => ({ stockLocationId, stockOnHand: 0 })),
          ],
        },
      ],
    },
    input.nepalChannelToken,
  );

  // Ensure the Hong Kong channel's HKD price for the same variant.
  await adminFetch(
    `mutation UpdateVariantPrice($input: [UpdateProductVariantInput!]!) {
      updateProductVariants(input: $input) { id }
    }`,
    { input: [{ id: variantId, prices: [{ currencyCode: 'HKD', price: input.hongKongPrice }] }] },
    input.hongKongChannelToken,
  );

  return { id: productId, slug: input.slug };
}

async function main() {
  await login();

  const nepalZone = await ensureZone('Nepal Zone', 'NP');
  const hongKongZone = await ensureZone('Hong Kong Zone', 'HK');
  const nepalChannel = await ensureChannel({ code: 'nepal', token: 'nepal', currencyCode: 'NPR', zoneId: nepalZone.id });
  const hongKongChannel = await ensureChannel({ code: 'hongkong', token: 'hongkong', currencyCode: 'HKD', zoneId: hongKongZone.id });

  // Vendure's built-in Default Channel has no tax/shipping zone out of the box, which
  // causes "error.no-active-tax-zone" if a product/variant is created while the Dashboard
  // is scoped to it instead of Nepal/Hong Kong. Give it a safe fallback zone.
  await ensureDefaultChannelZone(nepalZone.id);

  const nepalWarehouse = await ensureStockLocation('Nepal Warehouse', nepalChannel.id);
  const hongKongWarehouse = await ensureStockLocation('Hong Kong Warehouse', hongKongChannel.id);
  await ensureTaxRate('Nepal VAT', nepalZone.id, 13);
  await ensureTaxRate('Hong Kong Tax', hongKongZone.id, 0);

  const productType = await ensureFacet('product-type', 'Product Type', [
    { code: 'tops', name: 'Tops' },
    { code: 'bottoms', name: 'Bottoms' },
    { code: 'accessories', name: 'Accessories' },
  ]);
  const material = await ensureFacet('material', 'Material', [
    { code: 'cotton', name: 'Cotton' },
    { code: 'fleece', name: 'Fleece' },
    { code: 'canvas', name: 'Canvas' },
  ]);
  const fit = await ensureFacet('fit', 'Fit', [
    { code: 'regular', name: 'Regular' },
    { code: 'relaxed', name: 'Relaxed' },
    { code: 'oversized', name: 'Oversized' },
  ]);
  const gender = await ensureFacet('gender', 'Gender', [
    { code: 'unisex', name: 'Unisex' },
    { code: 'mens', name: 'Mens' },
    { code: 'womens', name: 'Womens' },
  ]);

  const size = await ensureOptionGroup('size', 'Size', ['S', 'M', 'L']);
  const color = await ensureOptionGroup('color', 'Color', ['Black', 'White', 'Olive']);

  await assignOptionGroupsToChannels([size.id, color.id], [nepalChannel.id, hongKongChannel.id]);

  await ensureShippingMethod({
    code: 'nepal-district-shipping',
    channelId: nepalChannel.id,
    name: 'Nepal District Shipping',
    rates: { kathmandu: 25000, lalitpur: 28000, pokhara: 32000 },
    fallbackRate: 35000,
  });
  await ensureShippingMethod({
    code: 'hongkong-city-shipping',
    channelId: hongKongChannel.id,
    name: 'Hong Kong City Shipping',
    rates: { 'hong kong island': 3000, kowloon: 3500, 'new territories': 4500 },
    fallbackRate: 5000,
  });

  await ensurePaymentMethod({
    code: 'nepal-fonepay-placeholder',
    channelId: nepalChannel.id,
    name: 'Fonepay Placeholder',
    handlerCode: 'fonepay-placeholder',
    args: [{ name: 'enabledNote', value: 'Placeholder only. Implement Fonepay API before production.' }],
  });
  await ensurePaymentMethod({
    code: 'hongkong-stripe',
    channelId: hongKongChannel.id,
    name: 'Stripe',
    handlerCode: 'stripe',
    args: [
      { name: 'apiKey', value: process.env.STRIPE_SECRET_KEY || 'sk_test_replace_me' },
      { name: 'webhookSecret', value: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_replace_me' },
    ],
  });

  const typeValue = (code: string) => productType.values.find((value) => value.code === code)!.id;
  const facetValues = (...codes: string[]) => [...material.values, ...fit.values, ...gender.values].filter((value) => codes.includes(value.code)).map((value) => value.id);
  const optionIds = (sizeCode: string, colorCode: string) => [
    size.options.find((option) => option.code === sizeCode)!.id,
    color.options.find((option) => option.code === colorCode)!.id,
  ];
  const optionGroupIds = [size.id, color.id];

  const { stockLocations: allStockLocations } = await adminFetch<{
    stockLocations: { items: Array<{ id: string; name: string }> };
  }>(`query AllStockLocations { stockLocations(options: { take: 100 }) { items { id name } } }`);
  const staleStockLocationIds = allStockLocations.items
    .filter((location) => location.id !== nepalWarehouse.id && location.id !== hongKongWarehouse.id)
    .map((location) => location.id);

  const sharedChannelFields = {
    nepalChannelId: nepalChannel.id,
    hongKongChannelId: hongKongChannel.id,
    nepalChannelToken: 'nepal',
    hongKongChannelToken: 'hongkong',
    nepalStockLocationId: nepalWarehouse.id,
    hongKongStockLocationId: hongKongWarehouse.id,
    staleStockLocationIds,
  };

  // Every product below sells in both markets, with its own price per currency and
  // its own stock count per warehouse — e.g. the Box Tee has 10 units in Nepal and
  // 15 in Hong Kong, tracked and allocated independently.
  await createSharedProduct({
    name: 'Hakeems Box Tee',
    slug: 'hakeems-box-tee',
    description: '<p>Midweight unisex tee for daily wear.</p>',
    typeValueId: typeValue('tops'),
    facetValueIds: facetValues('cotton', 'regular', 'unisex'),
    optionIds: optionIds('m', 'black'),
    optionGroupIds,
    sku: 'HKM-BOX-TEE-BLK-M',
    nepalPrice: 250000,
    hongKongPrice: 16800,
    nepalStock: 10,
    hongKongStock: 15,
    ...sharedChannelFields,
  });
  await createSharedProduct({
    name: 'Harbour Overshirt',
    slug: 'harbour-overshirt',
    description: '<p>Relaxed overshirt for cooler evenings.</p>',
    typeValueId: typeValue('tops'),
    facetValueIds: facetValues('cotton', 'relaxed', 'unisex'),
    optionIds: optionIds('l', 'olive'),
    optionGroupIds,
    sku: 'HKM-HARBOUR-OVERSHIRT-OLV-L',
    nepalPrice: 715000,
    hongKongPrice: 42000,
    nepalStock: 8,
    hongKongStock: 20,
    ...sharedChannelFields,
  });
  await createSharedProduct({
    name: 'Kathmandu Utility Pant',
    slug: 'kathmandu-utility-pant',
    description: '<p>Durable relaxed bottoms with event-ready pockets.</p>',
    typeValueId: typeValue('bottoms'),
    facetValueIds: facetValues('canvas', 'relaxed', 'unisex'),
    optionIds: optionIds('m', 'black'),
    optionGroupIds,
    sku: 'HKM-UTILITY-PANT-BLK-M',
    nepalPrice: 390000,
    hongKongPrice: 22800,
    nepalStock: 14,
    hongKongStock: 6,
    ...sharedChannelFields,
  });
  await createSharedProduct({
    name: 'Market Tote',
    slug: 'market-tote',
    description: '<p>Canvas tote for pop-ups, markets, and daily carry.</p>',
    typeValueId: typeValue('accessories'),
    facetValueIds: facetValues('canvas', 'regular', 'unisex'),
    optionIds: optionIds('m', 'white'),
    optionGroupIds,
    sku: 'HKM-MARKET-TOTE-WHT',
    nepalPrice: 270000,
    hongKongPrice: 16000,
    nepalStock: 30,
    hongKongStock: 25,
    ...sharedChannelFields,
  });

  console.log('Hakeems Vendure seed complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
