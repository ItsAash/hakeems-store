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

async function adminFetch<T>(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
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
    channels: Array<{ id: string; code: string; token: string; defaultCurrencyCode: string }>;
  }>(`query Channels { channels { id code token defaultCurrencyCode } }`);
  const existing = channels.find((channel) => channel.code === input.code);
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
  const categories = await getTaxCategories();
  const category = categories.find((item) => item.name === 'Standard Tax') || categories[0];
  if (!category) throw new Error('No tax category found');

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

async function productExists(slug: string) {
  const { products } = await adminFetch<{ products: { items: Array<{ id: string; slug: string }> } }>(
    `query Products { products(options: { take: 100 }) { items { id slug } } }`,
  );
  return products.items.find((product) => product.slug === slug);
}

async function createDemoProduct(input: {
  name: string;
  slug: string;
  description: string;
  typeValueId: string;
  facetValueIds: string[];
  optionIds: string[];
  price: number;
  currencyCode: 'NPR' | 'HKD';
  channelId: string;
  sku: string;
  stockOnHand: number;
}) {
  const existing = await productExists(input.slug);
  if (existing) return existing;

  const { createProduct } = await adminFetch<{ createProduct: { id: string; slug: string } }>(
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
  );

  await adminFetch(
    `mutation CreateVariants($input: [CreateProductVariantInput!]!) {
      createProductVariants(input: $input) { id sku }
    }`,
    {
      input: [
        {
          productId: createProduct.id,
          sku: input.sku,
          enabled: true,
          optionIds: input.optionIds,
          stockOnHand: input.stockOnHand,
          trackInventory: 'TRUE',
          prices: [{ currencyCode: input.currencyCode, price: input.price }],
          translations: [{ languageCode: 'en', name: input.name }],
        },
      ],
    },
  );

  await adminFetch(
    `mutation AssignProduct($input: AssignProductsToChannelInput!) {
      assignProductsToChannel(input: $input) { id slug }
    }`,
    { input: { channelId: input.channelId, productIds: [createProduct.id] } },
  ).catch(() => undefined);

  return createProduct;
}

async function main() {
  await login();

  const nepalZone = await ensureZone('Nepal Zone', 'NP');
  const hongKongZone = await ensureZone('Hong Kong Zone', 'HK');
  const nepalChannel = await ensureChannel({ code: 'nepal', token: 'nepal', currencyCode: 'NPR', zoneId: nepalZone.id });
  const hongKongChannel = await ensureChannel({ code: 'hongkong', token: 'hongkong', currencyCode: 'HKD', zoneId: hongKongZone.id });

  await ensureStockLocation('Nepal Warehouse', nepalChannel.id);
  await ensureStockLocation('Hong Kong Warehouse', hongKongChannel.id);
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

  await createDemoProduct({
    name: 'Hakeems Box Tee',
    slug: 'hakeems-box-tee',
    description: '<p>Midweight unisex tee for daily wear.</p>',
    typeValueId: typeValue('tops'),
    facetValueIds: facetValues('cotton', 'regular', 'unisex'),
    optionIds: optionIds('m', 'black'),
    price: 250000,
    currencyCode: 'NPR',
    channelId: nepalChannel.id,
    sku: 'HKM-NP-BOX-TEE-BLK-M',
    stockOnHand: 25,
  });
  await createDemoProduct({
    name: 'Harbour Overshirt',
    slug: 'harbour-overshirt',
    description: '<p>Relaxed overshirt for Hong Kong evenings.</p>',
    typeValueId: typeValue('tops'),
    facetValueIds: facetValues('cotton', 'relaxed', 'unisex'),
    optionIds: optionIds('l', 'olive'),
    price: 42000,
    currencyCode: 'HKD',
    channelId: hongKongChannel.id,
    sku: 'HKM-HK-HARBOUR-OVERSHIRT-OLV-L',
    stockOnHand: 18,
  });
  await createDemoProduct({
    name: 'Kathmandu Utility Pant',
    slug: 'kathmandu-utility-pant',
    description: '<p>Durable relaxed bottoms with event-ready pockets.</p>',
    typeValueId: typeValue('bottoms'),
    facetValueIds: facetValues('canvas', 'relaxed', 'unisex'),
    optionIds: optionIds('m', 'black'),
    price: 390000,
    currencyCode: 'NPR',
    channelId: nepalChannel.id,
    sku: 'HKM-NP-UTILITY-PANT-BLK-M',
    stockOnHand: 16,
  });
  await createDemoProduct({
    name: 'Market Tote',
    slug: 'market-tote',
    description: '<p>Canvas tote for pop-ups, markets, and daily carry.</p>',
    typeValueId: typeValue('accessories'),
    facetValueIds: facetValues('canvas', 'regular', 'unisex'),
    optionIds: optionIds('m', 'white'),
    price: 16000,
    currencyCode: 'HKD',
    channelId: hongKongChannel.id,
    sku: 'HKM-HK-MARKET-TOTE-WHT',
    stockOnHand: 40,
  });

  console.log('Hakeems Vendure seed complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
