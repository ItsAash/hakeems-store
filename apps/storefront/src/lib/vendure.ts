import { CHANNELS, type ChannelCode } from './channels';

const VENDURE_SHOP_API_URL = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function vendureFetch<T>(
  channel: ChannelCode,
  query: string,
  variables?: Record<string, unknown>,
  cookie?: string,
) {
  const response = await fetch(VENDURE_SHOP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'vendure-token': CHANNELS[channel].token,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const setCookie = response.headers.get('set-cookie');
  const json = (await response.json()) as GraphQLResponse<T>;

  if (!response.ok || json.errors?.length) {
    throw new Error(json.errors?.map((error) => error.message).join('; ') || `Vendure request failed ${response.status}`);
  }

  return { data: json.data as T, setCookie };
}

export type VendureProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset?: { preview: string } | null;
  facetValues: Array<{ id: string; code: string; name: string; facet: { code: string; name: string } }>;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    currencyCode: string;
    stockLevel: string;
    options: Array<{ code: string; name: string; group: { code: string; name: string } }>;
  }>;
  customFields?: {
    enrichedDescription?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  } | null;
};

const PRODUCT_FIELDS = `
  id
  name
  slug
  description
  featuredAsset { preview }
  facetValues { id code name facet { code name } }
  variants {
    id
    name
    sku
    priceWithTax
    currencyCode
    stockLevel
    options { code name group { code name } }
  }
  customFields {
    enrichedDescription
    seoTitle
    seoDescription
  }
`;

export async function getProducts(channel: ChannelCode) {
  const { data } = await vendureFetch<{ products: { items: VendureProduct[] } }>(
    channel,
    `query Products {
      products(options: { take: 50 }) {
        items { ${PRODUCT_FIELDS} }
      }
    }`,
  );
  return data.products.items;
}

export async function getProductBySlug(channel: ChannelCode, slug: string) {
  const { data } = await vendureFetch<{ product: VendureProduct | null }>(
    channel,
    `query Product($slug: String!) {
      product(slug: $slug) { ${PRODUCT_FIELDS} }
    }`,
    { slug },
  );
  return data.product;
}

export async function getProductsByIds(channel: ChannelCode, ids: string[]) {
  const products = await getProducts(channel);
  const idSet = new Set(ids);
  return products.filter((product) => idSet.has(product.id));
}

export const ACTIVE_ORDER_QUERY = `
  query ActiveOrder {
    activeOrder {
      id
      code
      totalWithTax
      currencyCode
      shippingWithTax
      taxSummary { description taxRate taxTotal }
      lines {
        id
        quantity
        linePriceWithTax
        productVariant {
          id
          name
          priceWithTax
          currencyCode
          product {
            name
            slug
            featuredAsset { preview }
          }
          options { name group { name } }
        }
      }
    }
  }
`;
