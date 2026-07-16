import 'dotenv/config';
import {
  ACTIVITY_FACET,
  COLLECTIONS,
  COLOR_SWATCH_HEX,
  COLORS,
  MATERIAL_DETAILS,
  MATERIAL_FACET,
  PRODUCTS,
  SIZE_OPTION_VALUES,
  SIZES_APPAREL,
  SIZES_ONE,
} from '../../../scripts/data/persona';
import {
  type ImageSpec,
  loadImageBytes,
  type ProductImageSpecs,
  productImageSpecs,
} from '../../../scripts/data/images';

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

/** Hex swatch per colour option code (see optionCode()). The storefront renders these
 * as the colour dots on product cards via ProductOption.customFields.swatch (added by
 * the product-option-swatch plugin); without them the dots render as empty circles. */
const COLOR_SWATCHES: Record<string, string> = COLOR_SWATCH_HEX;

async function ensureColorSwatches(colorGroup: { options: Array<{ id: string; code: string }> }) {
  for (const option of colorGroup.options) {
    const swatch = COLOR_SWATCHES[option.code];
    if (!swatch) continue;
    await adminFetch(
      `mutation UpdateProductOption($input: UpdateProductOptionInput!) {
        updateProductOption(input: $input) { id }
      }`,
      { input: { id: option.id, customFields: { swatch } } },
    );
  }
  console.log('Set colour swatches');
}

/**
 * Uploads the images for a list of specs (garment+colour matched — see scripts/data/images.ts)
 * and returns their asset ids in order. Idempotent by filename; bytes come from the image
 * pipeline (local cache → provider), so a missing/failed image is skipped rather than fatal.
 */
const specAssetIdCache = new Map<string, string>();
async function ensureSpecAssets(specs: ImageSpec[], channelIds: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const spec of specs) {
    const cachedId = specAssetIdCache.get(spec.fileName);
    if (cachedId) {
      ids.push(cachedId);
      continue;
    }
    const asset = await ensureAssetFromSpec(spec, channelIds);
    if (asset) {
      specAssetIdCache.set(spec.fileName, asset.id);
      ids.push(asset.id);
    }
  }
  return ids;
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

  const method = existing
    ? (
        // Re-sync handler args (e.g. Stripe API/webhook secrets) on every run — env vars
        // changing after the method was first created should always take effect, not
        // just on initial creation.
        await adminFetch<{ updatePaymentMethod: { id: string; code: string } }>(
          `mutation UpdatePayment($input: UpdatePaymentMethodInput!) {
            updatePaymentMethod(input: $input) { id code }
          }`,
          { input: { id: existing.id, handler: { code: input.handlerCode, arguments: input.args } } },
        )
      ).updatePaymentMethod
    : (
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
 * Uploads image bytes to Vendure's asset server via the multipart GraphQL upload spec and
 * assigns the asset to the given channels. Idempotent: keyed by the asset's file name, so a
 * name that already exists is reused (and `getBytes` is never invoked). Returns null if the
 * bytes could not be obtained, so a single missing image never aborts the whole seed.
 */
async function ensureAssetBytes(
  fileName: string,
  getBytes: () => Promise<Buffer | null>,
  channelIds: string[],
) {
  let asset = await findAssetByName(fileName);

  if (!asset) {
    const bytes = await getBytes();
    if (!bytes) {
      console.warn(`  ! skipping asset (no image bytes): ${fileName}`);
      return null;
    }

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
    form.append('0', new Blob([bytes], { type: 'image/jpeg' }), fileName);

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

/**
 * Resolves one image spec through the pipeline (local cache → provider) and uploads it.
 * This is the single point where the catalogue's per-product/per-colour photography enters
 * Vendure — swap the provider (CATALOG_IMAGE_PROVIDER) or drop licensed files into the cache
 * and nothing else changes.
 */
function ensureAssetFromSpec(spec: ImageSpec, channelIds: string[]) {
  return ensureAssetBytes(spec.fileName, () => loadImageBytes(spec), channelIds);
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

type CollectionFilter = { code: string; arguments: Array<{ name: string; value: string }> };

function facetValueFilter(facetValueIds: string[]): CollectionFilter[] {
  return [
    {
      code: 'facet-value-filter',
      arguments: [
        { name: 'facetValueIds', value: JSON.stringify(facetValueIds) },
        { name: 'containsAny', value: 'true' },
      ],
    },
  ];
}

function productIdFilter(productIds: string[]): CollectionFilter[] {
  return [
    {
      code: 'product-id-filter',
      arguments: [
        { name: 'productIds', value: JSON.stringify(productIds) },
        { name: 'combineWithAnd', value: 'true' },
      ],
    },
  ];
}

async function ensureCollection(input: {
  slug: string;
  name: string;
  description: string;
  filters: CollectionFilter[];
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
  const translations = [{ languageCode: 'en', name: input.name, slug: input.slug, description: input.description }];
  const filters = input.filters;

  if (!collection) {
    const { createCollection } = await adminFetch<{ createCollection: { id: string; slug: string } }>(
      `mutation CreateCollection($input: CreateCollectionInput!) {
        createCollection(input: $input) { id slug }
      }`,
      { input: { isPrivate: false, featuredAssetId: input.featuredAssetId, translations, filters } },
    );
    collection = createCollection;
  } else {
    // Re-run with the same (idempotent) content on every seed so CollectionEvent fires and
    // apps/vendure/src/plugins/collection-sync pushes to Strapi even if a prior sync attempt
    // was missed (e.g. Strapi was down that run) — self-healing rather than create-once.
    await adminFetch(
      `mutation UpdateCollection($input: UpdateCollectionInput!) {
        updateCollection(input: $input) { id slug }
      }`,
      { input: { id: collection.id, translations, filters } },
    );
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
  /** PDP "Fit & Fabric" tab content (HTML). */
  fitAndFabric: string;
  /** Per-product SEO metadata (Vendure Product custom fields; the storefront's PDP
   * generateMetadata prefers these over the raw name/description). */
  seoTitle?: string;
  seoDescription?: string;
  facetValueIds: string[];
  /** Merchandising (all optional): sale % (0–100) drives the strikethrough "was" price and
   * "% off" on product cards; promoLabel is the small caption; badge is the corner tag. */
  discountPercent?: number;
  promoLabel?: string;
  badge?: string;
  sizes: string[];
  colors: string[];
  /** Garment+colour matched imagery, resolved by the image pipeline (scripts/data/images.ts). */
  imageSpecs: ProductImageSpecs;
  nepalPrice: number;
  hongKongPrice: number;
  nepalStock: number;
  hongKongStock: number;
};

/** "Fit & Fabric" copy keyed by category — populates the PDP tab, per product, in Vendure. */
const FIT_AND_FABRIC: Record<string, string> = {
  tops: '<p><strong>Fabric.</strong> Lightweight, breathable performance knit with four-way stretch and moisture-wicking finish. Tagless for chafe-free wear.</p><p><strong>Fit.</strong> True to size with a relaxed, studio-to-street silhouette. Falls at the hip.</p>',
  bottoms:
    '<p><strong>Fabric.</strong> Signature buttery-soft compressive knit — squat-proof, sweat-wicking and built to hold its shape rep after rep.</p><p><strong>Fit.</strong> High-rise with a wide, stay-put waistband. Second-skin through the hip and thigh; 7/8 length hits above the ankle.</p>',
  accessories:
    '<p><strong>Material.</strong> Water-resistant recycled ripstop with smooth-glide zippers and interior organization.</p><p><strong>Details.</strong> One size. Adjustable, sweat-friendly and made to move from mat to transit.</p>',
  sets: '<p><strong>Fabric.</strong> Matching second-skin performance knit — supportive, breathable and designed to be worn together or apart.</p><p><strong>Fit.</strong> True to size. High-rise tight with a coordinating medium-support bra.</p>',
  default:
    '<p><strong>Fabric.</strong> Technical, sustainably-sourced materials chosen for performance and longevity.</p><p><strong>Fit.</strong> True to size.</p>',
};

/** Shared "Shipping & Returns" policy — the same for every product, stored on each in Vendure. */
const SHIPPING_RETURNS =
  '<p><strong>Shipping.</strong> Dispatched within 1–2 business days. Free shipping within Kathmandu Valley on orders over NPR 5,000, and free Hong Kong Island delivery over HKD 800. Duties are calculated at checkout for international orders.</p><p><strong>Returns.</strong> Unworn items with tags can be returned within 14 days of delivery. Final-sale pieces are marked at checkout.</p>';

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

  // Upload the product-level gallery (its primary colour) and attach it as the featured imagery.
  const assetIds = await ensureSpecAssets(input.imageSpecs.gallery, [ctx.nepalChannelId, ctx.hongKongChannelId]);
  if (assetIds.length) {
    await adminFetch(
      `mutation UpdateProductAssets($input: UpdateProductInput!) {
        updateProduct(input: $input) { id }
      }`,
      { input: { id: productId, featuredAssetId: assetIds[0], assetIds } },
      'nepal',
    );
  }

  // Editorial custom fields shown in the PDP "Fit & Fabric" / "Shipping & Returns" tabs.
  // Run every time so existing products are backfilled on re-seed.
  await adminFetch(
    `mutation UpdateProductCustomFields($input: UpdateProductInput!) {
      updateProduct(input: $input) { id }
    }`,
    {
      input: {
        id: productId,
        customFields: {
          fitAndFabric: input.fitAndFabric,
          shippingReturns: SHIPPING_RETURNS,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          discountPercent: input.discountPercent ?? null,
          promoLabel: input.promoLabel ?? null,
          badge: input.badge ?? null,
        },
      },
    },
    'nepal',
  );

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
  const variantColorCodes: string[] = [];
  for (const sizeName of input.sizes) {
    for (const colorName of input.colors) {
      const sizeCode = optionCode(sizeName);
      const colorCode = optionCode(colorName);
      const found = findVariantFor(sizeCode, colorCode);
      if (found) {
        adopted.add(found.id);
        variantIds.push(found.id);
        variantColorCodes.push(colorCode);
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
      variantColorCodes.push(colorCode);
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

  // Per-colour imagery: every variant of a colour gets that colour's lead image (so the PDP
  // gallery swaps when a swatch is clicked), followed by the product's own shots.
  const imageChannelIds = [ctx.nepalChannelId, ctx.hongKongChannelId];
  const variantsByColor = new Map<string, string[]>();
  variantIds.forEach((id, index) => {
    const colorCode = variantColorCodes[index];
    if (!colorCode) return;
    if (!variantsByColor.has(colorCode)) variantsByColor.set(colorCode, []);
    variantsByColor.get(colorCode)!.push(id);
  });
  for (const [colorCode, ids] of variantsByColor) {
    const colorSpecs = input.imageSpecs.byColorCode[colorCode] ?? [];
    const colorAssetIds = await ensureSpecAssets(colorSpecs, imageChannelIds);
    if (colorAssetIds.length === 0) continue;
    // This colour's matched shots first (so the swatch swaps the gallery), then the product gallery.
    const variantAssetIds = [...new Set([...colorAssetIds, ...assetIds])];
    await adminFetch(
      `mutation UpdateVariantAssets($input: [UpdateProductVariantInput!]!) {
        updateProductVariants(input: $input) { id }
      }`,
      { input: ids.map((id) => ({ id, featuredAssetId: colorAssetIds[0], assetIds: variantAssetIds })) },
      'nepal',
    );
  }

  return { id: productId, slug: input.slug };
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

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

  // The catalog is tagged with a single "categories" facet — Tops/Bottoms/Accessories/Sets —
  // used both for collection filters below and for the storefront's facet-based category grid.
  const categories = await ensureFacet('categories', 'Categories', [
    { code: 'tops', name: 'Tops' },
    { code: 'bottoms', name: 'Bottoms' },
    { code: 'sets', name: 'Sets' },
    { code: 'dresses', name: 'Dresses' },
    { code: 'swim', name: 'Swim' },
  ]);
  // Commerce facet trees (persona taxonomy) — filterable product attributes surfaced in the
  // PLP facet sidebar. Defined once in scripts/data/persona.ts.
  const activity = await ensureFacet(ACTIVITY_FACET.code, ACTIVITY_FACET.name, ACTIVITY_FACET.values);
  const material = await ensureFacet(MATERIAL_FACET.code, MATERIAL_FACET.name, MATERIAL_FACET.values);

  // Facets live on the default channel when created; the shop API's channel-aware
  // facet resolvers (search aggregations, filters) only see them once assigned.
  for (const channelId of [nepalChannel.id, hongKongChannel.id]) {
    await adminFetch(
      `mutation AssignFacets($input: AssignFacetsToChannelInput!) {
        assignFacetsToChannel(input: $input) { id }
      }`,
      { input: { channelId, facetIds: [categories.id, activity.id, material.id] } },
    ).catch(() => undefined);
  }

  const size = await ensureOptionGroup('size', 'Size', SIZE_OPTION_VALUES);
  const color = await ensureOptionGroup('color', 'Color', COLORS.map((c) => c.name));
  await ensureColorSwatches(color);

  await assignOptionGroupsToChannels([size.id, color.id], [nepalChannel.id, hongKongChannel.id]);

  // Each warehouse gets exactly one root (country) zone, then as many nested levels as needed.
  // Only leaf zones (no children) may carry a rate — every non-leaf node stays null (enforced
  // by ShippingZoneService). The storefront's zone picker requires the customer to drill down
  // to an actual leaf, so every real checkout resolves to a priced leaf; the shipping method's
  // own fallbackRate only applies to the legacy free-text address-matching path.
  const nepalRoot = await ensureShippingZoneNode(nepalWarehouse.id, null, 'Nepal', 'nepal', null);
  const bagmati = await ensureShippingZoneNode(nepalWarehouse.id, nepalRoot.id, 'Bagmati', 'bagmati', null);
  const kathmandu = await ensureShippingZoneNode(nepalWarehouse.id, bagmati.id, 'Kathmandu', 'kathmandu', null);
  await ensureShippingZoneNode(nepalWarehouse.id, kathmandu.id, 'Inside Ringroad', 'inside-ringroad', 15000);
  await ensureShippingZoneNode(nepalWarehouse.id, kathmandu.id, 'Outside Ringroad', 'outside-ringroad', 20000);
  const lalitpur = await ensureShippingZoneNode(nepalWarehouse.id, bagmati.id, 'Lalitpur', 'lalitpur', null);
  await ensureShippingZoneNode(nepalWarehouse.id, lalitpur.id, 'Patan', 'patan', 18000);
  await ensureShippingZoneNode(nepalWarehouse.id, lalitpur.id, 'Lalitpur — Other Areas', 'lalitpur-other', 22000);
  const lumbini = await ensureShippingZoneNode(nepalWarehouse.id, nepalRoot.id, 'Lumbini', 'lumbini', null);
  await ensureShippingZoneNode(nepalWarehouse.id, lumbini.id, 'Butwal', 'butwal', 32000);

  const hongKongRoot = await ensureShippingZoneNode(hongKongWarehouse.id, null, 'Hong Kong', 'hong-kong', null);
  await ensureShippingZoneNode(hongKongWarehouse.id, hongKongRoot.id, 'Hong Kong Island', 'hong-kong-island', 3000);
  const kowloon = await ensureShippingZoneNode(hongKongWarehouse.id, hongKongRoot.id, 'Kowloon', 'kowloon', null);
  await ensureShippingZoneNode(hongKongWarehouse.id, kowloon.id, 'Yau Tsim Mong', 'yau-tsim-mong', 3200);
  await ensureShippingZoneNode(hongKongWarehouse.id, kowloon.id, 'Kwun Tong', 'kwun-tong', 3600);
  await ensureShippingZoneNode(hongKongWarehouse.id, hongKongRoot.id, 'New Territories', 'new-territories', 4500);

  await ensureShippingMethod({
    code: 'standard-shipping',
    channelIds: [nepalChannel.id, hongKongChannel.id],
    name: 'Standard Shipping',
    fallbackRate: 20000,
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

  const apparelSizes = [...SIZES_APPAREL];
  const oneSizeRun = [...SIZES_ONE];

  // ── Catalogue — persona.ts (scripts/data/persona.ts) is the single source of truth. Seed every
  // product, composing its PDP description (blurb + feature list) and material-accurate Fit & Fabric,
  // and keep a slug → id map for the collection filters below.
  const productIdBySlug = new Map<string, string>();
  for (const product of PRODUCTS) {
    const materialDetail = MATERIAL_DETAILS[product.material];
    const featuresHtml = product.features.length
      ? `<ul>${product.features.map((feature) => `<li>${feature}</li>`).join('')}</ul>`
      : '';
    const fitAndFabric = materialDetail
      ? `<p><strong>Fabric.</strong> ${materialDetail.fabric}</p><p><strong>Care.</strong> ${materialDetail.care}</p>`
      : FIT_AND_FABRIC[product.category] ?? FIT_AND_FABRIC.default;

    const { id } = await ensureProduct(ctx, {
      name: product.name,
      slug: product.slug,
      skuCode: product.skuCode,
      description: `<p>${product.description}</p>${featuresHtml}`,
      fitAndFabric,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      facetValueIds: [
        facetValue(categories, product.category),
        facetValue(activity, product.activity),
        facetValue(material, product.material),
      ],
      sizes: product.oneSize ? oneSizeRun : apparelSizes,
      colors: product.colors,
      imageSpecs: productImageSpecs(product),
      nepalPrice: product.priceNpr,
      hongKongPrice: product.priceHkd,
      nepalStock: product.stockNepal,
      hongKongStock: product.stockHongKong,
      badge: product.badge,
    });
    productIdBySlug.set(product.slug, id);
    console.log(`Seeded product: ${product.slug}`);
  }

  const channelIds = [nepalChannel.id, hongKongChannel.id];

  // Category collections (garment type) — power the nav + "Shop by category" grid. Only categories
  // that actually have products are created.
  const CATEGORY_COLLECTIONS = [
    { slug: 'tops', name: 'Tops', description: 'Bras, bodysuits, tanks and layers — engineered to move from studio to street.' },
    { slug: 'bottoms', name: 'Bottoms', description: 'Leggings, flares, shorts and cargos in our naked-feel, sculpting knits.' },
    { slug: 'sets', name: 'Sets', description: 'Coordinated sets, unitards and jumpsuits — buy them together, wear them everywhere.' },
    { slug: 'dresses', name: 'Dresses', description: 'Slip dresses, lounge maxis and the tennis dress — one-and-done, elevated.' },
    { slug: 'swim', name: 'Swim', description: 'Bikinis and one-pieces in smooth, quick-dry swim knits — mix, match, done.' },
  ] as const;
  for (const collection of CATEGORY_COLLECTIONS) {
    if (!PRODUCTS.some((product) => product.category === collection.slug)) continue;
    await ensureCollection({
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      filters: facetValueFilter([facetValue(categories, collection.slug)]),
      channelIds,
    });
  }

  // Merchandising collections (persona taxonomy) — mapped by explicit product ids from each
  // product's `collections` list, so curation lives in one place (persona.ts).
  for (const collection of COLLECTIONS) {
    const ids = PRODUCTS.filter((product) => product.collections.includes(collection.slug))
      .map((product) => productIdBySlug.get(product.slug))
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) continue;
    await ensureCollection({
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      filters: productIdFilter(ids),
      channelIds,
    });
  }

  // Spotlight — a hand-curated capsule of the current best-sellers (product-id filter).
  const spotlightIds = PRODUCTS.filter((product) => product.badge === 'Best Seller')
    .map((product) => productIdBySlug.get(product.slug))
    .filter((id): id is string => Boolean(id));
  if (spotlightIds.length) {
    await ensureCollection({
      slug: 'spotlight',
      name: 'Spotlight',
      description: 'A rotating edit of the pieces we can’t keep in stock.',
      filters: productIdFilter(spotlightIds),
      channelIds,
    });
  }


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
