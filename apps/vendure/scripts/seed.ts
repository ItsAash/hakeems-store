import 'dotenv/config';
import {
  ACTIVITY_FACET,
  COLOR_GALLERY,
  COLOR_SWATCH_HEX,
  COLORS,
  MATERIAL_FACET,
  SIZE_OPTION_VALUES,
  SIZES_APPAREL,
} from '../../../scripts/data/persona';

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
 * Distinct lead image per colour code, so PDP colour swatches visibly swap the gallery.
 * (Demo imagery reused across products — production would use real per-product-per-colour
 * photography; the storefront simply renders whatever assets each variant carries.)
 * Keys must match the colour option codes (see optionCode()).
 */
const COLOR_IMAGE_URLS: Record<string, string[]> = COLOR_GALLERY;

/** Uploads a colour's images once (deduped by filename) and caches the asset ids. */
const colorAssetIdCache = new Map<string, string[]>();
async function ensureColorAssets(colorCode: string, channelIds: string[]): Promise<string[]> {
  const cached = colorAssetIdCache.get(colorCode);
  if (cached) return cached;
  const urls = COLOR_IMAGE_URLS[colorCode] ?? [];
  const ids: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    // "-v2" forces a fresh upload under the corrected mapping below — the old
    // "color-<code>-N.jpg" assets pointed at mismatched stock photos (e.g. "olive"
    // resolved to a denim-shelf photo), and ensureAsset is idempotent by filename, so
    // reusing the old name would keep serving the wrong image forever.
    const asset = await ensureAsset(`color-${colorCode}-${i + 1}-v2.jpg`, urls[i], channelIds);
    ids.push(asset.id);
  }
  colorAssetIdCache.set(colorCode, ids);
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
  facetValueIds: string[];
  /** Merchandising (all optional): sale % (0–100) drives the strikethrough "was" price and
   * "% off" on product cards; promoLabel is the small caption; badge is the corner tag. */
  discountPercent?: number;
  promoLabel?: string;
  badge?: string;
  sizes: string[];
  colors: string[];
  images: Array<{ fileName: string; url: string }>;
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
    const colorAssetIds = await ensureColorAssets(colorCode, imageChannelIds);
    if (colorAssetIds.length === 0) continue;
    const variantAssetIds = [...colorAssetIds, ...assetIds];
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

  // The catalog is tagged with a single "categories" facet — Tops/Bottoms/Accessories/Sets —
  // used both for collection filters below and for the storefront's facet-based category grid.
  const categories = await ensureFacet('categories', 'Categories', [
    { code: 'tops', name: 'Tops' },
    { code: 'bottoms', name: 'Bottoms' },
    { code: 'accessories', name: 'Accessories' },
    { code: 'sets', name: 'Sets' },
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

  const APPAREL = [...SIZES_APPAREL];
  const ONE_SIZE = ['One Size'];

  // Per-product Activity/Material facet tags (persona taxonomy), keyed by slug. Kept beside the
  // catalogue so the two commerce facets resolve to non-empty, filterable values.
  const PRODUCT_TAGS: Record<string, { activity: string; material: string }> = {
    'salutation-stash-tank': { activity: 'yoga', material: 'performance-knit' },
    'momentum-seamless-tee': { activity: 'run', material: 'performance-knit' },
    'renew-studio-tee': { activity: 'yoga', material: 'organic-cotton' },
    'ultimate-train-bra': { activity: 'train', material: 'performance-knit' },
    'gap-vintage-soft-tee': { activity: 'travel', material: 'organic-cotton' },
    'coaster-luxe-sweatshirt': { activity: 'travel', material: 'brushed-fleece' },
    'farallon-hybrid-jacket': { activity: 'travel', material: 'recycled-nylon' },
    'salutation-stash-tight': { activity: 'yoga', material: 'performance-knit' },
    'ultimate-stash-tight': { activity: 'train', material: 'performance-knit' },
    'rainier-jogger': { activity: 'travel', material: 'brushed-fleece' },
    'brooklyn-ankle-pant': { activity: 'travel', material: 'recycled-nylon' },
    'gapfit-bike-short': { activity: 'run', material: 'recycled-nylon' },
    'elation-tight': { activity: 'yoga', material: 'performance-knit' },
    'all-about-crossbody': { activity: 'travel', material: 'recycled-nylon' },
    'studio-bra-tight-set': { activity: 'yoga', material: 'performance-knit' },
  };

  // Real premium activewear catalogue in the Athleta / GAP house style. Colours are drawn from the
  // persona palette (Onyx, Chalk, Soft Sage, Sandstone, Espresso, Slate); prices are per channel in
  // minor units (NPR / HKD). Card galleries come from each colour's persona images; the per-product
  // `images` below drive the PDP gallery.
  const catalog: Array<Omit<CatalogProduct, 'facetValueIds' | 'fitAndFabric'> & { category: string }> = [
    // ── Tops ──────────────────────────────────────────────────────────────
    {
      name: 'Salutation Stash Pocket Tank',
      slug: 'salutation-stash-tank',
      skuCode: 'ATH-SAL-TANK',
      description:
        '<p>Our do-everything studio tank in buttery Powervita™ knit, with a hidden stash pocket at the back hem and a built-in shelf bra for light support. Moves with you from flow to street.</p>',
      category: 'tops',
      sizes: APPAREL, colors: ['Onyx', 'Soft Sage', 'Chalk'],
      images: [
        { fileName: 'salutation-stash-tank-1.jpg', url: unsplash('photo-1552902865-b72c031ac5ea') },
        { fileName: 'salutation-stash-tank-2.jpg', url: unsplash('photo-1518611012118-696072aa579a') },
      ],
      nepalPrice: 490000, hongKongPrice: 38000, nepalStock: 24, hongKongStock: 18,
      badge: 'Best Seller',
    },
    {
      name: 'Momentum Seamless Tee',
      slug: 'momentum-seamless-tee',
      skuCode: 'ATH-MOM-TEE',
      description:
        '<p>Engineered seamless tee with targeted ventilation zones and a featherweight, wick-fast knit. Chafe-free flatlock-free construction for high-output runs and training.</p>',
      category: 'tops',
      sizes: APPAREL, colors: ['Onyx', 'Slate', 'Sandstone'],
      images: [
        { fileName: 'momentum-seamless-tee-1.jpg', url: unsplash('photo-1518310383802-640c2de311b2') },
        { fileName: 'momentum-seamless-tee-2.jpg', url: unsplash('photo-1571945153237-4929e783af4a') },
      ],
      nepalPrice: 420000, hongKongPrice: 32000, nepalStock: 20, hongKongStock: 16,
    },
    {
      name: 'Renew Organic Studio Tee',
      slug: 'renew-studio-tee',
      skuCode: 'ATH-RNW-TEE',
      description:
        '<p>The softest everyday tee, cut from GOTS-certified organic cotton with a relaxed drape. Garment-dyed for depth of colour and made to layer year round.</p>',
      category: 'tops',
      sizes: APPAREL, colors: ['Chalk', 'Soft Sage', 'Espresso'],
      images: [
        { fileName: 'renew-studio-tee-1.jpg', url: unsplash('photo-1503341504253-dff4815485f1') },
        { fileName: 'renew-studio-tee-2.jpg', url: unsplash('photo-1620799140408-edc6dcb6d633') },
      ],
      nepalPrice: 390000, hongKongPrice: 30000, nepalStock: 26, hongKongStock: 20,
    },
    {
      name: 'Ultimate Medium-Support Bra',
      slug: 'ultimate-train-bra',
      skuCode: 'ATH-ULT-BRA',
      description:
        '<p>Medium-support sports bra with moulded cups, a wide underband and adjustable straps. Powervita™ knit keeps it soft against the skin through every session.</p>',
      category: 'tops',
      sizes: APPAREL, colors: ['Onyx', 'Slate'],
      images: [
        { fileName: 'ultimate-train-bra-1.jpg', url: unsplash('photo-1544367567-0f2fcb009e0b') },
        { fileName: 'ultimate-train-bra-2.jpg', url: unsplash('photo-1552902865-b72c031ac5ea') },
      ],
      nepalPrice: 590000, hongKongPrice: 46000, nepalStock: 18, hongKongStock: 14,
    },
    {
      name: 'Vintage Soft Crewneck Tee',
      slug: 'gap-vintage-soft-tee',
      skuCode: 'GAP-VNT-TEE',
      description:
        '<p>The GAP classic, back and better. Vintage-soft 100% cotton jersey, pre-washed for a lived-in feel, with a clean crewneck and a straight everyday fit.</p>',
      category: 'tops',
      sizes: APPAREL, colors: ['Chalk', 'Sandstone', 'Onyx'],
      images: [
        { fileName: 'gap-vintage-soft-tee-1.jpg', url: unsplash('photo-1521572163474-6864f9cf17ab') },
        { fileName: 'gap-vintage-soft-tee-2.jpg', url: unsplash('photo-1618354691373-d851c5c3a990') },
      ],
      nepalPrice: 320000, hongKongPrice: 24000, nepalStock: 34, hongKongStock: 26,
      discountPercent: 30, promoLabel: 'Extra 30% Off at Checkout',
    },
    {
      name: 'Coaster Luxe Sweatshirt',
      slug: 'coaster-luxe-sweatshirt',
      skuCode: 'ATH-CST-SWT',
      description:
        '<p>Our beloved Coaster in plush brushed-back fleece with a relaxed, cocooning fit and ribbed trims. The off-duty layer you will not want to take off.</p>',
      category: 'tops',
      sizes: APPAREL, colors: ['Sandstone', 'Onyx', 'Soft Sage'],
      images: [
        { fileName: 'coaster-luxe-sweatshirt-1.jpg', url: unsplash('photo-1556905055-8f358a7a47b2') },
        { fileName: 'coaster-luxe-sweatshirt-2.jpg', url: unsplash('photo-1620799140408-edc6dcb6d633') },
      ],
      nepalPrice: 890000, hongKongPrice: 69000, nepalStock: 16, hongKongStock: 12,
      badge: 'Best Seller',
    },
    {
      name: 'Farallon Hybrid Jacket',
      slug: 'farallon-hybrid-jacket',
      skuCode: 'ATH-FAR-JKT',
      description:
        '<p>A do-it-all hybrid shell in water-resistant recycled ripstop with stretch fleece side panels. Packs down small, layers over everything and shrugs off the commute.</p>',
      category: 'tops',
      sizes: APPAREL, colors: ['Onyx', 'Slate'],
      images: [
        { fileName: 'farallon-hybrid-jacket-1.jpg', url: unsplash('photo-1591047139829-d91aecb6caea') },
        { fileName: 'farallon-hybrid-jacket-2.jpg', url: unsplash('photo-1556905055-8f358a7a47b2') },
      ],
      nepalPrice: 1590000, hongKongPrice: 129000, nepalStock: 10, hongKongStock: 8,
    },
    // ── Bottoms ───────────────────────────────────────────────────────────
    {
      name: 'Salutation Stash Pocket 7/8 Tight',
      slug: 'salutation-stash-tight',
      skuCode: 'ATH-SAL-TGT',
      description:
        '<p>The tight that started it all. Buttery, sculpting Powervita™ knit with a high, stay-put waistband and dual side stash pockets. Squat-proof, sweat-wicking, second-skin support.</p>',
      category: 'bottoms',
      sizes: APPAREL, colors: ['Onyx', 'Soft Sage', 'Espresso'],
      images: [
        { fileName: 'salutation-stash-tight-1.jpg', url: unsplash('photo-1516762689617-e1cffcef479d') },
        { fileName: 'salutation-stash-tight-2.jpg', url: unsplash('photo-1594633312681-425c7b97ccd1') },
      ],
      nepalPrice: 990000, hongKongPrice: 78000, nepalStock: 22, hongKongStock: 18,
      badge: 'Best Seller',
    },
    {
      name: 'Ultimate Stash Pocket 7/8 Tight',
      slug: 'ultimate-stash-tight',
      skuCode: 'ATH-ULT-TGT',
      description:
        '<p>Our max-support training tight in compressive Contender™ knit with a sweat-wicking finish, wide waistband and drop-in side pockets that hold your phone through burpees.</p>',
      category: 'bottoms',
      sizes: APPAREL, colors: ['Onyx', 'Slate'],
      images: [
        { fileName: 'ultimate-stash-tight-1.jpg', url: unsplash('photo-1552902865-b72c031ac5ea') },
        { fileName: 'ultimate-stash-tight-2.jpg', url: unsplash('photo-1518611012118-696072aa579a') },
      ],
      nepalPrice: 950000, hongKongPrice: 74000, nepalStock: 18, hongKongStock: 14,
      discountPercent: 20, promoLabel: 'Price as Marked', badge: 'Just Reduced',
    },
    {
      name: 'Rainier Fleece Jogger',
      slug: 'rainier-jogger',
      skuCode: 'ATH-RNR-JOG',
      description:
        '<p>The weekend jogger in soft brushed-back fleece with a tapered leg, ribbed cuffs and a tonal drawcord waist. Structured enough for the café, soft enough for the couch.</p>',
      category: 'bottoms',
      sizes: APPAREL, colors: ['Sandstone', 'Onyx'],
      images: [
        { fileName: 'rainier-jogger-1.jpg', url: unsplash('photo-1594633312681-425c7b97ccd1') },
        { fileName: 'rainier-jogger-2.jpg', url: unsplash('photo-1556905055-8f358a7a47b2') },
      ],
      nepalPrice: 850000, hongKongPrice: 66000, nepalStock: 16, hongKongStock: 12,
    },
    {
      name: 'Brooklyn Ankle Pant',
      slug: 'brooklyn-ankle-pant',
      skuCode: 'ATH-BRK-PNT',
      description:
        '<p>The travel-ready trouser that works as hard as you do — wrinkle-resistant recycled stretch-nylon with a clean ankle crop, zip pockets and an all-day comfort waistband.</p>',
      category: 'bottoms',
      sizes: APPAREL, colors: ['Onyx', 'Espresso', 'Sandstone'],
      images: [
        { fileName: 'brooklyn-ankle-pant-1.jpg', url: unsplash('photo-1624378439575-d8705ad7ae80') },
        { fileName: 'brooklyn-ankle-pant-2.jpg', url: unsplash('photo-1516762689617-e1cffcef479d') },
      ],
      nepalPrice: 950000, hongKongPrice: 74000, nepalStock: 14, hongKongStock: 10,
    },
    {
      name: 'GapFit Recycled Bike Short',
      slug: 'gapfit-bike-short',
      skuCode: 'GAP-FIT-SHT',
      description:
        '<p>A 20cm bike short in sweat-wicking recycled poly-stretch with a high, no-dig waistband and a hidden waist pocket. Squat-proof coverage for studio, spin and street.</p>',
      category: 'bottoms',
      sizes: APPAREL, colors: ['Onyx', 'Slate'],
      images: [
        { fileName: 'gapfit-bike-short-1.jpg', url: unsplash('photo-1518310383802-640c2de311b2') },
        { fileName: 'gapfit-bike-short-2.jpg', url: unsplash('photo-1544367567-0f2fcb009e0b') },
      ],
      nepalPrice: 450000, hongKongPrice: 35000, nepalStock: 28, hongKongStock: 22,
      discountPercent: 30, promoLabel: 'Extra 30% Off at Checkout',
    },
    {
      name: 'Elation 7/8 Tight',
      slug: 'elation-tight',
      skuCode: 'ATH-ELA-TGT',
      description:
        '<p>Our lightest, most breathable studio tight in airy Elation™ knit with a smoothing high waist and a barely-there feel. Made to disappear the moment you put it on.</p>',
      category: 'bottoms',
      sizes: APPAREL, colors: ['Onyx', 'Soft Sage'],
      images: [
        { fileName: 'elation-tight-1.jpg', url: unsplash('photo-1518611012118-696072aa579a') },
        { fileName: 'elation-tight-2.jpg', url: unsplash('photo-1552902865-b72c031ac5ea') },
      ],
      nepalPrice: 920000, hongKongPrice: 72000, nepalStock: 18, hongKongStock: 14,
    },
    // ── Accessories ─────────────────────────────────────────────────────────
    {
      name: 'All About Crossbody Bag',
      slug: 'all-about-crossbody',
      skuCode: 'ATH-AAB-BAG',
      description:
        '<p>The grab-and-go crossbody in water-resistant recycled ripstop, with a smooth-glide zip, interior organization and an adjustable strap that wears sling or shoulder.</p>',
      category: 'accessories',
      sizes: ONE_SIZE, colors: ['Onyx', 'Sandstone'],
      images: [
        { fileName: 'all-about-crossbody-1.jpg', url: unsplash('photo-1553062407-98eeb64c6a62') },
        { fileName: 'all-about-crossbody-2.jpg', url: unsplash('photo-1606522754091-a3bbf9ad4cb3') },
      ],
      nepalPrice: 550000, hongKongPrice: 43000, nepalStock: 22, hongKongStock: 18,
    },
    // ── Sets ────────────────────────────────────────────────────────────────
    {
      name: 'Studio Bra + Tight Set',
      slug: 'studio-bra-tight-set',
      skuCode: 'ATH-STU-SET',
      description:
        '<p>The matched studio set — a medium-support bra and high-rise 7/8 tight in coordinating Powervita™ knit. Buy it together, wear it everywhere.</p>',
      category: 'sets',
      sizes: APPAREL, colors: ['Onyx', 'Soft Sage'],
      images: [
        { fileName: 'studio-bra-tight-set-1.jpg', url: unsplash('photo-1544367567-0f2fcb009e0b') },
        { fileName: 'studio-bra-tight-set-2.jpg', url: unsplash('photo-1518611012118-696072aa579a') },
      ],
      nepalPrice: 1290000, hongKongPrice: 99000, nepalStock: 12, hongKongStock: 10,
      badge: 'New',
    },
  ];

  for (const item of catalog) {
    const { category, ...productInput } = item;
    const tags = PRODUCT_TAGS[item.slug];
    const facetValueIds = [facetValue(categories, category)];
    if (tags) {
      facetValueIds.push(facetValue(activity, tags.activity), facetValue(material, tags.material));
    }
    await ensureProduct(ctx, {
      ...productInput,
      facetValueIds,
      fitAndFabric: FIT_AND_FABRIC[category] ?? FIT_AND_FABRIC.default,
    });
    console.log(`Seeded product: ${item.slug}`);
  }

  // Collections power "Shop by Category" on the storefront (one per "categories" facet value).
  const channelIds = [nepalChannel.id, hongKongChannel.id];
  await ensureCollection({
    slug: 'tops', name: 'Tops',
    description: 'Tanks, tees, bras, sweatshirts and layers — engineered to move from studio to street.',
    filters: facetValueFilter([facetValue(categories, 'tops')]), channelIds,
  });
  await ensureCollection({
    slug: 'bottoms', name: 'Bottoms',
    description: 'Tights, joggers, shorts and travel pants in our signature sculpting, sweat-wicking knits.',
    filters: facetValueFilter([facetValue(categories, 'bottoms')]), channelIds,
  });
  await ensureCollection({
    slug: 'accessories', name: 'Accessories',
    description: 'Bags and carry-alls built to move from the mat to the commute.',
    filters: facetValueFilter([facetValue(categories, 'accessories')]), channelIds,
  });
  await ensureCollection({
    slug: 'sets', name: 'Sets',
    description: 'Coordinated bra-and-tight sets — buy them together, wear them everywhere.',
    filters: facetValueFilter([facetValue(categories, 'sets')]), channelIds,
  });

  // The Spotlight is a hand-curated capsule (product-id filter, not facet-based) — a
  // rotating edit featured identically on every storefront. See apps/strapi's "spotlight"
  // singleton for the copy shown alongside it.
  const spotlightSlugs = ['salutation-stash-tight', 'coaster-luxe-sweatshirt', 'farallon-hybrid-jacket'];
  const spotlightProductIds: string[] = [];
  for (const slug of spotlightSlugs) {
    const product = await productExists(slug);
    if (product) spotlightProductIds.push(product.id);
  }
  await ensureCollection({
    slug: 'spotlight', name: 'Spotlight',
    description: '',
    filters: productIdFilter(spotlightProductIds), channelIds,
  });

  // New Arrivals — a hand-curated capsule of the latest pieces (product-id filter, like
  // the Spotlight), shown in the home-page rail below the brand story. Vendure owns which
  // products belong here and prices them per channel; the copy shown alongside lives in
  // apps/strapi's "new-arrival" singleton.
  const newArrivalSlugs = [
    'salutation-stash-tank',
    'momentum-seamless-tee',
    'renew-studio-tee',
    'brooklyn-ankle-pant',
    'elation-tight',
    'rainier-jogger',
    'gap-vintage-soft-tee',
    'studio-bra-tight-set',
  ];
  const newArrivalProductIds: string[] = [];
  for (const slug of newArrivalSlugs) {
    const product = await productExists(slug);
    if (product) newArrivalProductIds.push(product.id);
  }
  await ensureCollection({
    slug: 'new-arrivals', name: 'New Arrivals',
    description: 'The latest pieces to land — fresh cuts and restocks, ready before they’re gone.',
    filters: productIdFilter(newArrivalProductIds), channelIds,
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
