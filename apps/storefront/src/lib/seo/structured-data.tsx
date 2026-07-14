/**
 * Schema.org JSON-LD helpers. Builders return plain objects; <JsonLd> serializes one into a
 * script tag. Everything is data-in — callers pass Vendure/Strapi values, nothing hardcoded.
 */

type JsonLdObject = Record<string, unknown>;

/** Renders a JSON-LD block. Safe: the payload is our own structured data, not user HTML. */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationSchema(input: {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  email?: string | null;
  phone?: string | null;
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    ...(input.logo ? { logo: input.logo } : {}),
    ...(input.sameAs && input.sameAs.length > 0 ? { sameAs: input.sameAs } : {}),
    ...(input.email || input.phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            ...(input.email ? { email: input.email } : {}),
            ...(input.phone ? { telephone: input.phone } : {}),
          },
        }
      : {}),
  };
}

export function websiteSchema(input: { name: string; url: string; searchUrl: string }): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${input.searchUrl}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Money in Vendure is integer minor units; Schema.org wants a decimal string. */
function toMajor(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

export function productSchema(input: {
  name: string;
  description?: string;
  images: string[];
  url: string;
  sku?: string | null;
  brand: string;
  currency: string;
  priceMin: number;
  priceMax: number;
  inStock: boolean;
}): JsonLdObject {
  const availability = input.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const offers =
    input.priceMin === input.priceMax
      ? {
          '@type': 'Offer',
          url: input.url,
          priceCurrency: input.currency,
          price: toMajor(input.priceMin),
          availability,
          itemCondition: 'https://schema.org/NewCondition',
        }
      : {
          '@type': 'AggregateOffer',
          url: input.url,
          priceCurrency: input.currency,
          lowPrice: toMajor(input.priceMin),
          highPrice: toMajor(input.priceMax),
          availability,
        };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.images.length > 0 ? { image: input.images } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    brand: { '@type': 'Brand', name: input.brand },
    offers,
  };
}
