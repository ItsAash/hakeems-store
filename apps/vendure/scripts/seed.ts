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
  let facet = facets.items.find((item) => item.code === code);

  if (!facet) {
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

  // Facet already exists: add any values the catalog needs that it doesn't have yet.
  const missing = values.filter((value) => !facet!.values.some((existing) => existing.code === value.code));
  if (missing.length) {
    const { createFacetValues } = await adminFetch<{ createFacetValues: Array<{ id: string; code: string; name: string }> }>(
      `mutation CreateFacetValues($input: [CreateFacetValueInput!]!) {
        createFacetValues(input: $input) { id code name }
      }`,
      {
        input: missing.map((value) => ({
          facetId: facet!.id,
          code: value.code,
          translations: [{ languageCode: 'en', name: value.name }],
        })),
      },
    );
    facet = { ...facet, values: [...facet.values, ...createFacetValues] };
  }
  return facet;
}

async function ensureOptionGroup(code: string, name: string, values: string[]) {
  const { productOptionGroups } = await adminFetch<{
    productOptionGroups: { items: Array<{ id: string; code: string; options: Array<{ id: string; code: string; name: string }> }> };
  }>(`query OptionGroups { productOptionGroups(options: { take: 50 }) { items { id code options { id code name } } } }`);
  let group = productOptionGroups.items.find((item) => item.code === code);

  if (!group) {
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
            code: optionCode(value),
            translations: [{ languageCode: 'en', name: value }],
          })),
        },
      },
    );
    return createProductOptionGroup;
  }

  // Group already exists: add any options the catalog needs that it doesn't have yet.
  const missing = values.filter((value) => !group!.options.some((option) => option.code === optionCode(value)));
  for (const value of missing) {
    const result: { createProductOption: { id: string; code: string; name: string } } = await adminFetch(
      `mutation CreateProductOption($input: CreateProductOptionInput!) {
        createProductOption(input: $input) { id code name }
      }`,
      {
        input: {
          productOptionGroupId: group!.id,
          code: optionCode(value),
          translations: [{ languageCode: 'en', name: value }],
        },
      },
    );
    group = { ...group, options: [...group.options, result.createProductOption] };
  }
  return group;
}

function optionCode(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
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

type ShippingZoneTreeNode = {
  id: string;
  code: string;
  children: ShippingZoneTreeNode[];
};

function findZoneNode(nodes: ShippingZoneTreeNode[], id: string): ShippingZoneTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findZoneNode(node.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

async function ensureShippingZoneNode(
  stockLocationId: string,
  parentId: string | null,
  name: string,
  code: string,
  rate: number | null,
): Promise<ShippingZoneTreeNode> {
  const { shippingZoneTree } = await adminFetch<{ shippingZoneTree: ShippingZoneTreeNode[] }>(
    `query Tree($stockLocationId: ID!) {
      shippingZoneTree(stockLocationId: $stockLocationId) {
        id code
        children { id code children { id code children { id code children { id code } } } }
      }
    }`,
    { stockLocationId },
  );

  const siblings = parentId ? (findZoneNode(shippingZoneTree, parentId)?.children ?? []) : shippingZoneTree;
  const existing = siblings.find((node) => node.code === code);
  if (existing) return existing;

  const { createShippingZoneNode } = await adminFetch<{ createShippingZoneNode: { id: string } }>(
    `mutation Create($input: CreateShippingZoneNodeInput!) {
      createShippingZoneNode(input: $input) { id }
    }`,
    { input: { name, code, parentId, stockLocationId: parentId ? undefined : stockLocationId, rate } },
  );
  return { id: createShippingZoneNode.id, code, children: [] };
}

async function ensureShippingMethod(input: {
  code: string;
  channelIds: string[];
  name: string;
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
            checker: { code: 'hakeems-zone-eligibility-checker', arguments: [] },
            calculator: {
              code: 'hakeems-zone-shipping-calculator',
              arguments: [{ name: 'fallbackRate', value: String(input.fallbackRate) }],
            },
            translations: [{ languageCode: 'en', name: input.name, description: `${input.name} zone-based shipping` }],
          },
        },
      )
    ).createShippingMethod;

  for (const channelId of input.channelIds) {
    await adminFetch(
      `mutation AssignShipping($input: AssignShippingMethodsToChannelInput!) {
        assignShippingMethodsToChannel(input: $input) { id code }
      }`,
      { input: { channelId, shippingMethodIds: [method.id] } },
    ).catch(() => undefined);
  }

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


/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */

async function findAssetByName(name: string) {
  const { assets } = await adminFetch<{ assets: { items: Array<{ id: string; name: string }> } }>(
    `query Assets($name: String!) {
      assets(options: { filter: { name: { eq: $name } }, take: 1 }) { items { id name } }
    }`,
    { name },
  );
  return assets.items[0];
}

/**
 * Downloads an image (Unsplash) once and uploads it to Vendure's asset server via
 * the multipart GraphQL upload spec. Idempotent: keyed by the asset's file name.
 */
async function ensureAsset(fileName: string, url: string, channelIds: string[]) {
  let asset = await findAssetByName(fileName);

  if (!asset) {
    const download = await fetch(url);
    if (!download.ok) throw new Error(`Failed to download ${url}: ${download.status}`);
    const buffer = await download.arrayBuffer();

    const form = new FormData();
    form.append(
      'operations',
      JSON.stringify({
        query: `mutation CreateAssets($input: [CreateAssetInput!]!) {
          createAssets(input: $input) {
            ... on Asset { id name }
            ... on MimeTypeError { message }
          }
        }`,
        variables: { input: [{ file: null }] },
      }),
    );
    form.append('map', JSON.stringify({ '0': ['variables.input.0.file'] }));
    form.append('0', new Blob([buffer], { type: 'image/jpeg' }), fileName);

    const response = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
        'Apollo-Require-Preflight': 'true',
      },
      body: form,
    });
    const json = (await response.json()) as GraphQLResult<{ createAssets: Array<{ id?: string; name?: string; message?: string }> }>;
    if (!response.ok || json.errors?.length) {
      throw new Error(json.errors?.map((error) => error.message).join('; ') || `Asset upload failed: ${response.status}`);
    }
    const created = json.data!.createAssets[0];
    if (!created.id) throw new Error(`Asset upload rejected: ${created.message}`);
    asset = { id: created.id, name: created.name! };
  }

  for (const channelId of channelIds) {
    await adminFetch(
      `mutation AssignAssets($input: AssignAssetsToChannelInput!) {
        assignAssetsToChannel(input: $input) { id }
      }`,
      { input: { assetIds: [asset.id], channelId } },
    ).catch(() => undefined);
  }

  return asset;
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

async function ensureCollection(input: {
  slug: string;
  name: string;
  description: string;
  facetValueIds: string[];
  channelIds: string[];
  featuredAssetId?: string;
}) {
  const { collections } = await adminFetch<{ collections: { items: Array<{ id: string; slug: string }> } }>(
    `query Collections($slug: String!) {
      collections(options: { filter: { slug: { eq: $slug } }, take: 1 }) { items { id slug } }
    }`,
    { slug: input.slug },
  );
  let collection = collections.items[0];

  if (!collection) {
    const { createCollection } = await adminFetch<{ createCollection: { id: string; slug: string } }>(
      `mutation CreateCollection($input: CreateCollectionInput!) {
        createCollection(input: $input) { id slug }
      }`,
      {
        input: {
          isPrivate: false,
          featuredAssetId: input.featuredAssetId,
          translations: [{ languageCode: 'en', name: input.name, slug: input.slug, description: input.description }],
          filters: [
            {
              code: 'facet-value-filter',
              arguments: [
                { name: 'facetValueIds', value: JSON.stringify(input.facetValueIds) },
                { name: 'containsAny', value: 'true' },
              ],
            },
          ],
        },
      },
    );
    collection = createCollection;
  }

  for (const channelId of input.channelIds) {
    await adminFetch(
      `mutation AssignCollections($input: AssignCollectionsToChannelInput!) {
        assignCollectionsToChannel(input: $input) { id }
      }`,
      { input: { collectionIds: [collection.id], channelId } },
    ).catch(() => undefined);
  }

  return collection;
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

async function productExists(slug: string) {
  const { products } = await adminFetch<{ products: { items: Array<{ id: string; slug: string }> } }>(
    `query Products { products(options: { take: 100 }) { items { id slug } } }`,
  );
  return products.items.find((product) => product.slug === slug);
}

type SeedContext = {
  nepalChannelId: string;
  hongKongChannelId: string;
  nepalStockLocationId: string;
  hongKongStockLocationId: string;
  staleStockLocationIds: string[];
  sizeGroup: { id: string; options: Array<{ id: string; code: string }> };
  colorGroup: { id: string; options: Array<{ id: string; code: string }> };
};

type CatalogProduct = {
  name: string;
  slug: string;
  skuCode: string;
  description: string;
  facetValueIds: string[];
  sizes: string[];
  colors: string[];
  images: Array<{ fileName: string; url: string }>;
  nepalPrice: number;
  hongKongPrice: number;
  nepalStock: number;
  hongKongStock: number;
};

/**
 * Creates (or repairs) a product sold in BOTH channels with a full size x color
 * variant matrix: one NPR price + Nepal Warehouse stock and one HKD price +
 * Hong Kong Warehouse stock per variant. Existing variants are adopted by
 * matching option codes so re-runs never duplicate them.
 */
async function ensureProduct(ctx: SeedContext, input: CatalogProduct) {
  const existing = await productExists(input.slug);

  const productId =
    existing?.id ??
    (
      await adminFetch<{ createProduct: { id: string } }>(
        `mutation CreateProduct($input: CreateProductInput!) {
          createProduct(input: $input) { id slug }
        }`,
        {
          input: {
            enabled: true,
            facetValueIds: input.facetValueIds,
            translations: [{ languageCode: 'en', name: input.name, slug: input.slug, description: input.description }],
          },
        },
      )
    ).createProduct.id;

  // Assign to both markets (no-op when already assigned).
  for (const channelId of [ctx.nepalChannelId, ctx.hongKongChannelId]) {
    await adminFetch(
      `mutation AssignProduct($input: AssignProductsToChannelInput!) {
        assignProductsToChannel(input: $input) { id }
      }`,
      { input: { channelId, productIds: [productId] } },
      'nepal',
    ).catch(() => undefined);
  }

  // Merge facet values on existing products instead of clobbering manual edits.
  if (existing) {
    const { product } = await adminFetch<{ product: { facetValues: Array<{ id: string }> } | null }>(
      `query ProductFacets($id: ID!) { product(id: $id) { facetValues { id } } }`,
      { id: productId },
      'nepal',
    );
    const merged = [...new Set([...(product?.facetValues ?? []).map((value) => value.id), ...input.facetValueIds])];
    await adminFetch(
      `mutation UpdateProductFacets($input: UpdateProductInput!) {
        updateProduct(input: $input) { id }
      }`,
      { input: { id: productId, facetValueIds: merged } },
      'nepal',
    );
  }

  // Upload gallery images and attach them.
  const assetIds: string[] = [];
  for (const image of input.images) {
    const asset = await ensureAsset(image.fileName, image.url, [ctx.nepalChannelId, ctx.hongKongChannelId]);
    assetIds.push(asset.id);
  }
  if (assetIds.length) {
    await adminFetch(
      `mutation UpdateProductAssets($input: UpdateProductInput!) {
        updateProduct(input: $input) { id }
      }`,
      { input: { id: productId, featuredAssetId: assetIds[0], assetIds } },
      'nepal',
    );
  }

  for (const optionGroupId of [ctx.sizeGroup.id, ctx.colorGroup.id]) {
    await adminFetch(
      `mutation AddOptionGroupToProduct($productId: ID!, $optionGroupId: ID!) {
        addOptionGroupToProduct(productId: $productId, optionGroupId: $optionGroupId) { id }
      }`,
      { productId, optionGroupId },
      'nepal',
    ).catch(() => undefined);
  }

  const { product } = await adminFetch<{
    product: { variants: Array<{ id: string; options: Array<{ code: string; groupId: string }> }> } | null;
  }>(
    `query ProductVariants($id: ID!) {
      product(id: $id) { variants { id options { code groupId } } }
    }`,
    { id: productId },
    'nepal',
  );
  const existingVariants = product?.variants ?? [];
  const adopted = new Set<string>();

  const findVariantFor = (sizeCode: string, colorCode: string) => {
    const exact = existingVariants.find(
      (variant) =>
        !adopted.has(variant.id) &&
        variant.options.some((option) => option.groupId === ctx.sizeGroup.id && option.code === sizeCode) &&
        variant.options.some((option) => option.groupId === ctx.colorGroup.id && option.code === colorCode),
    );
    if (exact) return exact;
    // Single-size products (accessories): adopt a legacy variant by color alone,
    // so old seeds' (m, white) tote becomes today's "white" variant instead of a dupe.
    if (input.sizes.length === 1) {
      return existingVariants.find(
        (variant) =>
          !adopted.has(variant.id) &&
          variant.options.some((option) => option.groupId === ctx.colorGroup.id && option.code === colorCode),
      );
    }
    return undefined;
  };

  const variantIds: string[] = [];
  for (const sizeName of input.sizes) {
    for (const colorName of input.colors) {
      const sizeCode = optionCode(sizeName);
      const colorCode = optionCode(colorName);
      const found = findVariantFor(sizeCode, colorCode);
      if (found) {
        adopted.add(found.id);
        variantIds.push(found.id);
        continue;
      }

      const sizeOption = ctx.sizeGroup.options.find((option) => option.code === sizeCode);
      const colorOption = ctx.colorGroup.options.find((option) => option.code === colorCode);
      if (!sizeOption || !colorOption) throw new Error(`Missing option ${sizeName}/${colorName}`);

      const sku = `HKM-${input.skuCode}-${colorCode.toUpperCase()}-${sizeCode.toUpperCase()}`;
      const { createProductVariants } = await adminFetch<{ createProductVariants: Array<{ id: string }> }>(
        `mutation CreateVariants($input: [CreateProductVariantInput!]!) {
          createProductVariants(input: $input) { id }
        }`,
        {
          input: [
            {
              productId,
              sku,
              enabled: true,
              price: input.nepalPrice,
              optionIds: [sizeOption.id, colorOption.id],
              trackInventory: 'TRUE',
              translations: [{ languageCode: 'en', name: `${input.name} — ${colorName} / ${sizeName}` }],
            },
          ],
        },
        'nepal',
      );
      variantIds.push(createProductVariants[0].id);
    }
  }

  // Make sure every variant lives in both channels.
  for (const channelId of [ctx.nepalChannelId, ctx.hongKongChannelId]) {
    await adminFetch(
      `mutation AssignVariants($input: AssignProductVariantsToChannelInput!) {
        assignProductVariantsToChannel(input: $input) { id }
      }`,
      { input: { productVariantIds: variantIds, channelId } },
      'nepal',
    ).catch(() => undefined);
  }

  // NPR price + both warehouses' stock, scoped to the Nepal channel.
  await adminFetch(
    `mutation UpdateVariants($input: [UpdateProductVariantInput!]!) {
      updateProductVariants(input: $input) { id }
    }`,
    {
      input: variantIds.map((id) => ({
        id,
        prices: [{ currencyCode: 'NPR', price: input.nepalPrice }],
        stockLevels: [
          { stockLocationId: ctx.nepalStockLocationId, stockOnHand: input.nepalStock },
          { stockLocationId: ctx.hongKongStockLocationId, stockOnHand: input.hongKongStock },
          ...ctx.staleStockLocationIds.map((stockLocationId) => ({ stockLocationId, stockOnHand: 0 })),
        ],
      })),
    },
    'nepal',
  );

  // HKD price, scoped to the Hong Kong channel.
  await adminFetch(
    `mutation UpdateVariantPrices($input: [UpdateProductVariantInput!]!) {
      updateProductVariants(input: $input) { id }
    }`,
    { input: variantIds.map((id) => ({ id, prices: [{ currencyCode: 'HKD', price: input.hongKongPrice }] })) },
    'hongkong',
  );

  return { id: productId, slug: input.slug };
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

const unsplash = (photoId: string) => `https://images.unsplash.com/${photoId}?w=1200&h=1500&fit=crop&q=80&fm=jpg`;

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
    { code: 'denim', name: 'Denim' },
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
  const colorFacet = await ensureFacet('color', 'Color', [
    { code: 'black', name: 'Black' },
    { code: 'white', name: 'White' },
    { code: 'olive', name: 'Olive' },
    { code: 'sand', name: 'Sand' },
    { code: 'clay', name: 'Clay' },
    { code: 'charcoal', name: 'Charcoal' },
  ]);
  const drop = await ensureFacet('drop', 'Drop', [
    { code: 'essentials', name: 'The Essentials' },
    { code: 'new-drop', name: 'New Drop' },
  ]);

  // Facets live on the default channel when created; the shop API's channel-aware
  // facet resolvers (search aggregations, filters) only see them once assigned.
  for (const channelId of [nepalChannel.id, hongKongChannel.id]) {
    await adminFetch(
      `mutation AssignFacets($input: AssignFacetsToChannelInput!) {
        assignFacetsToChannel(input: $input) { id }
      }`,
      { input: { channelId, facetIds: [productType.id, material.id, fit.id, gender.id, colorFacet.id, drop.id] } },
    ).catch(() => undefined);
  }

  const size = await ensureOptionGroup('size', 'Size', ['S', 'M', 'L', 'One Size']);
  const color = await ensureOptionGroup('color', 'Color', ['Black', 'White', 'Olive', 'Sand', 'Clay', 'Charcoal']);

  await assignOptionGroupsToChannels([size.id, color.id], [nepalChannel.id, hongKongChannel.id]);

  // Each warehouse gets exactly one root (country) zone, then as many nested levels as needed.
  const nepalRoot = await ensureShippingZoneNode(nepalWarehouse.id, null, 'Nepal', 'nepal', 35000);
  const bagmati = await ensureShippingZoneNode(nepalWarehouse.id, nepalRoot.id, 'Bagmati', 'bagmati', null);
  const kathmandu = await ensureShippingZoneNode(nepalWarehouse.id, bagmati.id, 'Kathmandu', 'kathmandu', null);
  await ensureShippingZoneNode(nepalWarehouse.id, kathmandu.id, 'Inside Ringroad', 'inside-ringroad', 15000);
  await ensureShippingZoneNode(nepalWarehouse.id, kathmandu.id, 'Outside Ringroad', 'outside-ringroad', 20000);
  await ensureShippingZoneNode(nepalWarehouse.id, bagmati.id, 'Lalitpur', 'lalitpur', 22000);
  const lumbini = await ensureShippingZoneNode(nepalWarehouse.id, nepalRoot.id, 'Lumbini', 'lumbini', null);
  await ensureShippingZoneNode(nepalWarehouse.id, lumbini.id, 'Butwal', 'butwal', 32000);

  const hongKongRoot = await ensureShippingZoneNode(hongKongWarehouse.id, null, 'Hong Kong', 'hong-kong', 5000);
  await ensureShippingZoneNode(hongKongWarehouse.id, hongKongRoot.id, 'Hong Kong Island', 'hong-kong-island', 3000);
  const kowloon = await ensureShippingZoneNode(hongKongWarehouse.id, hongKongRoot.id, 'Kowloon', 'kowloon', null);
  await ensureShippingZoneNode(hongKongWarehouse.id, kowloon.id, 'Yau Tsim Mong', 'yau-tsim-mong', 3200);
  await ensureShippingZoneNode(hongKongWarehouse.id, kowloon.id, 'Kwun Tong', 'kwun-tong', 3600);
  await ensureShippingZoneNode(hongKongWarehouse.id, hongKongRoot.id, 'New Territories', 'new-territories', 4500);

  await ensureShippingMethod({
    code: 'standard-shipping',
    channelIds: [nepalChannel.id, hongKongChannel.id],
    name: 'Standard Shipping',
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

  const facetValue = (facet: { values: Array<{ id: string; code: string }> }, code: string) => {
    const value = facet.values.find((item) => item.code === code);
    if (!value) throw new Error(`Missing facet value ${code}`);
    return value.id;
  };
  const facetIdsFor = (product: {
    type: string;
    material: string;
    fit: string;
    drop: string;
    colors: string[];
  }) => [
    facetValue(productType, product.type),
    facetValue(material, product.material),
    facetValue(fit, product.fit),
    facetValue(gender, 'unisex'),
    facetValue(drop, product.drop),
    ...product.colors.map((colorName) => facetValue(colorFacet, optionCode(colorName))),
  ];

  const { stockLocations: allStockLocations } = await adminFetch<{
    stockLocations: { items: Array<{ id: string; name: string }> };
  }>(`query AllStockLocations { stockLocations(options: { take: 100 }) { items { id name } } }`);

  const ctx: SeedContext = {
    nepalChannelId: nepalChannel.id,
    hongKongChannelId: hongKongChannel.id,
    nepalStockLocationId: nepalWarehouse.id,
    hongKongStockLocationId: hongKongWarehouse.id,
    staleStockLocationIds: allStockLocations.items
      .filter((location) => location.id !== nepalWarehouse.id && location.id !== hongKongWarehouse.id)
      .map((location) => location.id),
    sizeGroup: size,
    colorGroup: color,
  };

  const APPAREL = ['S', 'M', 'L'];
  const ONE_SIZE = ['One Size'];

  const catalog: Array<Omit<CatalogProduct, 'facetValueIds'> & { type: string; material: string; fit: string; drop: string }> = [
    {
      name: 'Hakeems Box Tee',
      slug: 'hakeems-box-tee',
      skuCode: 'BOX-TEE',
      description:
        '<p>The tee everything else is built around. Midweight 220gsm combed cotton, boxy through the body with a clean ribbed collar that holds its shape wash after wash.</p><p>Cut, sewn and finished in Kathmandu.</p>',
      type: 'tops', material: 'cotton', fit: 'regular', drop: 'essentials',
      sizes: APPAREL, colors: ['Black', 'White', 'Olive'],
      images: [
        { fileName: 'hakeems-box-tee-1.jpg', url: unsplash('photo-1521572163474-6864f9cf17ab') },
        { fileName: 'hakeems-box-tee-2.jpg', url: unsplash('photo-1554568218-0f1715e72254') },
      ],
      nepalPrice: 250000, hongKongPrice: 16800, nepalStock: 14, hongKongStock: 12,
    },
    {
      name: 'Studio Tee',
      slug: 'studio-tee',
      skuCode: 'STUDIO-TEE',
      description:
        '<p>A heavier, drapier tee for people who notice the difference. Garment-dyed so every piece fades its own way, with a slightly dropped shoulder.</p>',
      type: 'tops', material: 'cotton', fit: 'relaxed', drop: 'essentials',
      sizes: APPAREL, colors: ['Black', 'Charcoal'],
      images: [
        { fileName: 'studio-tee-1.jpg', url: unsplash('photo-1618354691373-d851c5c3a990') },
        { fileName: 'studio-tee-2.jpg', url: unsplash('photo-1583743814966-8936f5b7be1a') },
      ],
      nepalPrice: 220000, hongKongPrice: 14800, nepalStock: 16, hongKongStock: 10,
    },
    {
      name: 'Terrace Graphic Tee',
      slug: 'terrace-graphic-tee',
      skuCode: 'TERRACE-TEE',
      description:
        '<p>Season graphic printed front and back with water-based inks that sink into the fabric instead of sitting on top. Screen printed by hand in Patan.</p>',
      type: 'tops', material: 'cotton', fit: 'oversized', drop: 'new-drop',
      sizes: APPAREL, colors: ['Black', 'White'],
      images: [
        { fileName: 'terrace-graphic-tee-1.jpg', url: unsplash('photo-1503341504253-dff4815485f1') },
        { fileName: 'terrace-graphic-tee-2.jpg', url: unsplash('photo-1576566588028-4147f3842f27') },
      ],
      nepalPrice: 280000, hongKongPrice: 18800, nepalStock: 12, hongKongStock: 12,
    },
    {
      name: 'Everyday Crew Sweat',
      slug: 'everyday-crew-sweat',
      skuCode: 'CREW-SWEAT',
      description:
        '<p>Brushed-back fleece crewneck with set-in sleeves and ribbed everything — collar, cuffs, hem. Warm without the bulk, sharp enough for dinner after.</p>',
      type: 'tops', material: 'fleece', fit: 'regular', drop: 'essentials',
      sizes: APPAREL, colors: ['White', 'Sand'],
      images: [
        { fileName: 'everyday-crew-sweat-1.jpg', url: unsplash('photo-1620799140408-edc6dcb6d633') },
        { fileName: 'everyday-crew-sweat-2.jpg', url: unsplash('photo-1434389677669-e08b4cac3105') },
      ],
      nepalPrice: 480000, hongKongPrice: 32800, nepalStock: 10, hongKongStock: 8,
    },
    {
      name: 'Ridgeline Hoodie',
      slug: 'ridgeline-hoodie',
      skuCode: 'RIDGE-HOOD',
      description:
        '<p>Heavyweight 420gsm fleece hoodie with a double-layer hood that actually stands up. Oversized fit, kangaroo pocket, tonal drawcords.</p>',
      type: 'tops', material: 'fleece', fit: 'oversized', drop: 'new-drop',
      sizes: APPAREL, colors: ['Black', 'Clay'],
      images: [
        { fileName: 'ridgeline-hoodie-1.jpg', url: unsplash('photo-1571945153237-4929e783af4a') },
        { fileName: 'ridgeline-hoodie-2.jpg', url: unsplash('photo-1556905055-8f358a7a47b2') },
      ],
      nepalPrice: 560000, hongKongPrice: 38800, nepalStock: 10, hongKongStock: 10,
    },
    {
      name: 'Harbour Overshirt',
      slug: 'harbour-overshirt',
      skuCode: 'HARBOUR-OS',
      description:
        '<p>The layer for cooler evenings — a relaxed overshirt in brushed cotton twill with corozo buttons and two chest pockets sized for a phone and a notebook.</p>',
      type: 'tops', material: 'cotton', fit: 'relaxed', drop: 'new-drop',
      sizes: APPAREL, colors: ['Olive', 'Charcoal'],
      images: [
        { fileName: 'harbour-overshirt-1.jpg', url: unsplash('photo-1591047139829-d91aecb6caea') },
        { fileName: 'harbour-overshirt-2.jpg', url: unsplash('photo-1611312449408-fcece27cdbb7') },
      ],
      nepalPrice: 715000, hongKongPrice: 42000, nepalStock: 8, hongKongStock: 14,
    },
    {
      name: 'Kathmandu Utility Pant',
      slug: 'kathmandu-utility-pant',
      skuCode: 'UTILITY-PANT',
      description:
        '<p>Durable cotton canvas with a relaxed straight leg, reinforced knees and event-ready pockets. Built to survive load-ins, not just lookbooks.</p>',
      type: 'bottoms', material: 'canvas', fit: 'relaxed', drop: 'essentials',
      sizes: APPAREL, colors: ['Black', 'Olive'],
      images: [
        { fileName: 'kathmandu-utility-pant-1.jpg', url: unsplash('photo-1624378439575-d8705ad7ae80') },
        { fileName: 'kathmandu-utility-pant-2.jpg', url: unsplash('photo-1541099649105-f69ad21f3246') },
      ],
      nepalPrice: 390000, hongKongPrice: 22800, nepalStock: 14, hongKongStock: 6,
    },
    {
      name: 'Valley Jogger',
      slug: 'valley-jogger',
      skuCode: 'VALLEY-JOG',
      description:
        '<p>Tapered jogger in loopback terry — structured enough to leave the house in, soft enough that you won\'t want to. Zip pocket at the right hip.</p>',
      type: 'bottoms', material: 'fleece', fit: 'relaxed', drop: 'new-drop',
      sizes: APPAREL, colors: ['Sand', 'Black'],
      images: [
        { fileName: 'valley-jogger-1.jpg', url: unsplash('photo-1594633312681-425c7b97ccd1') },
        { fileName: 'valley-jogger-2.jpg', url: unsplash('photo-1516762689617-e1cffcef479d') },
      ],
      nepalPrice: 420000, hongKongPrice: 26800, nepalStock: 12, hongKongStock: 10,
    },
    {
      name: 'Summit Denim Pant',
      slug: 'summit-denim-pant',
      skuCode: 'SUMMIT-DNM',
      description:
        '<p>Rigid 13oz denim in a straight, slightly cropped cut. No stretch, no wash tricks — it breaks in on your schedule and looks better for it.</p>',
      type: 'bottoms', material: 'denim', fit: 'regular', drop: 'essentials',
      sizes: APPAREL, colors: ['Charcoal'],
      images: [
        { fileName: 'summit-denim-pant-1.jpg', url: unsplash('photo-1560243563-062bfc001d68') },
        { fileName: 'summit-denim-pant-2.jpg', url: unsplash('photo-1525507119028-ed4c629a60a3') },
      ],
      nepalPrice: 520000, hongKongPrice: 34800, nepalStock: 8, hongKongStock: 8,
    },
    {
      name: 'Market Tote',
      slug: 'market-tote',
      skuCode: 'MARKET-TOTE',
      description:
        '<p>Heavy canvas tote for pop-ups, markets and daily carry. Reinforced handles, interior sleeve pocket, and a base wide enough for records or groceries.</p>',
      type: 'accessories', material: 'canvas', fit: 'regular', drop: 'essentials',
      sizes: ONE_SIZE, colors: ['White', 'Sand'],
      images: [
        { fileName: 'market-tote-1.jpg', url: unsplash('photo-1590874103328-eac38a683ce7') },
        { fileName: 'market-tote-2.jpg', url: unsplash('photo-1606522754091-a3bbf9ad4cb3') },
      ],
      nepalPrice: 270000, hongKongPrice: 16000, nepalStock: 30, hongKongStock: 25,
    },
    {
      name: 'City Sling Pack',
      slug: 'city-sling-pack',
      skuCode: 'CITY-SLING',
      description:
        '<p>Compact crossbody sling in bonded canvas with a water-resistant zip. Fits the essentials — wallet, keys, a paperback — and sits flat against the body.</p>',
      type: 'accessories', material: 'canvas', fit: 'regular', drop: 'new-drop',
      sizes: ONE_SIZE, colors: ['Charcoal'],
      images: [
        { fileName: 'city-sling-pack-1.jpg', url: unsplash('photo-1553062407-98eeb64c6a62') },
        { fileName: 'city-sling-pack-2.jpg', url: unsplash('photo-1441986300917-64674bd600d8') },
      ],
      nepalPrice: 310000, hongKongPrice: 19800, nepalStock: 15, hongKongStock: 15,
    },
    {
      name: 'Trail Cap',
      slug: 'trail-cap',
      skuCode: 'TRAIL-CAP',
      description:
        '<p>Six-panel cap in washed cotton with an unstructured crown and adjustable strap. The kind of cap that looks better the more it gets worn.</p>',
      type: 'accessories', material: 'cotton', fit: 'regular', drop: 'essentials',
      sizes: ONE_SIZE, colors: ['White', 'Sand'],
      images: [
        { fileName: 'trail-cap-1.jpg', url: unsplash('photo-1622445275576-721325763afe') },
        { fileName: 'trail-cap-2.jpg', url: unsplash('photo-1588850561407-ed78c282e89b') },
      ],
      nepalPrice: 180000, hongKongPrice: 12800, nepalStock: 20, hongKongStock: 20,
    },
  ];

  for (const item of catalog) {
    const { type, material: materialCode, fit: fitCode, drop: dropCode, ...productInput } = item;
    await ensureProduct(ctx, {
      ...productInput,
      facetValueIds: facetIdsFor({ type, material: materialCode, fit: fitCode, drop: dropCode, colors: item.colors }),
    });
    console.log(`Seeded product: ${item.slug}`);
  }

  // Collections power "Shop by Collection" on the storefront.
  const channelIds = [nepalChannel.id, hongKongChannel.id];
  await ensureCollection({
    slug: 'tops', name: 'Tops',
    description: 'Tees, sweats, hoodies and overshirts — the upper half of every Hakeems fit.',
    facetValueIds: [facetValue(productType, 'tops')], channelIds,
  });
  await ensureCollection({
    slug: 'bottoms', name: 'Bottoms',
    description: 'Utility pants, joggers and denim built for the street and the stage.',
    facetValueIds: [facetValue(productType, 'bottoms')], channelIds,
  });
  await ensureCollection({
    slug: 'accessories', name: 'Accessories',
    description: 'Totes, slings and caps — the pieces that finish the fit.',
    facetValueIds: [facetValue(productType, 'accessories')], channelIds,
  });
  await ensureCollection({
    slug: 'the-essentials', name: 'The Essentials',
    description: 'The permanent collection. Core pieces we cut in every drop, restocked season after season.',
    facetValueIds: [facetValue(drop, 'essentials')], channelIds,
  });
  await ensureCollection({
    slug: 'new-drop', name: 'New Drop · SS26',
    description: 'The latest release — limited runs designed in Kathmandu and gone when they\'re gone.',
    facetValueIds: [facetValue(drop, 'new-drop')], channelIds,
  });

  // Rebuild the per-channel search index so search/filters see everything above.
  for (const token of ['nepal', 'hongkong']) {
    await adminFetch(`mutation { reindex { id } }`, {}, token);
  }

  console.log('Hakeems Vendure seed complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
