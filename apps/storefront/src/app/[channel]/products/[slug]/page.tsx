import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getVendureClient } from '@/lib/vendure/client';
import { buildVariantMatrix } from '@/lib/vendure/pdp';
import { buildSpotlightCards } from '@/lib/vendure/product-card';
import { getProductPage } from '@/lib/strapi/queries';
import { buildMetadata } from '@/lib/seo/metadata';
import { SITE_NAME, absoluteUrl, toMetaDescription } from '@/lib/seo/site';
import { JsonLd, breadcrumbSchema, productSchema } from '@/lib/seo/structured-data';
import { CONTAINER } from '@/lib/ui';
import { Breadcrumbs } from '@/components/commerce/breadcrumbs';
import { ProductDetail } from '@/components/commerce/product-detail';
import type { ProductDetailsTab } from '@/components/commerce/product-details-tabs';
import { SpotlightCarousel } from '@/components/commerce/spotlight-carousel';
import { Markdown } from '@/components/legal/markdown';

type PdpParams = { channel: string; slug: string };

const VENDURE_ROOT_COLLECTION_SLUG = '__root_collection__';
const RELATED_FETCH_LIMIT = 60;

async function loadProduct(channelParam: string, slug: string) {
  if (!isChannelCode(channelParam)) return null;
  const channel = getChannel(channelParam);
  const result = await getVendureClient(channel.code)
    .PdpProduct({ slug })
    .catch(() => null);
  return { channel, product: result?.product ?? null };
}

export async function generateMetadata({ params }: { params: Promise<PdpParams> }): Promise<Metadata> {
  const { channel: channelParam, slug } = await params;
  const data = await loadProduct(channelParam, slug);
  if (!data?.product) return { title: 'Product not found', robots: { index: false, follow: false } };

  const { channel, product } = data;
  return buildMetadata({
    title: product.customFields?.seoTitle || product.name,
    description: product.customFields?.seoDescription || toMetaDescription(product.description),
    path: routes.product(channel.code, product.slug),
    channel: channel.code,
    images: product.assets.map((asset) => asset.preview).slice(0, 4),
  });
}

/** Vendure product fields are HTML strings; render them in the site's long-form type. */
function HtmlContent({ html }: { html: string }) {
  return (
    <div
      className="leading-relaxed text-[var(--color-ink-muted)] [&_a]:text-[var(--color-ink)] [&_a]:underline [&_a]:underline-offset-2 [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-medium [&_strong]:text-[var(--color-ink)] [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<PdpParams> }) {
  const { channel: channelParam, slug } = await params;
  const data = await loadProduct(channelParam, slug);
  if (!data?.product) notFound();

  const { channel, product } = data;
  const matrix = buildVariantMatrix(product.variants);
  const primaryCollection = product.collections[0] ?? null;
  const breadcrumbItems = primaryCollection?.breadcrumbs ?? [];
  const description = product.customFields?.enrichedDescription || product.description;
  const images = product.assets.map((asset) => asset.preview);

  // Editorial CMS panels (size guide, fabric tables…) + the related-products rail load in
  // parallel with nothing blocking the buy box data (already fetched above).
  const [productPage, relatedResult] = await Promise.all([
    getProductPage(product.slug).catch(() => null),
    primaryCollection
      ? getVendureClient(channel.code)
          .SpotlightCollection({ slug: primaryCollection.slug, take: RELATED_FETCH_LIMIT })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const relatedCards = buildSpotlightCards(relatedResult?.collection?.productVariants.items ?? []).filter(
    (card) => card.slug !== product.slug,
  );

  const detailTabs: ProductDetailsTab[] = [
    { id: 'details', label: 'Details', html: description },
    { id: 'fit-fabric', label: 'Fit & Fabric', html: product.customFields?.fitAndFabric },
    { id: 'shipping-returns', label: 'Shipping & Returns', html: product.customFields?.shippingReturns },
  ]
    .filter((tab): tab is { id: string; label: string; html: string } => Boolean(tab.html?.trim()))
    .map((tab) => ({ id: tab.id, label: tab.label, content: <HtmlContent html={tab.html} /> }));

  for (const panel of productPage?.panels ?? []) {
    if (!panel.content.trim()) continue;
    detailTabs.push({
      id: `panel-${panel.id}`,
      label: panel.title,
      content: <Markdown content={panel.content} />,
    });
  }

  // --- Structured data (Schema.org) — all values from live Vendure product data ---
  const prices = product.variants.map((variant) => variant.priceWithTax);
  const productLd = productSchema({
    name: product.name,
    description: product.customFields?.seoDescription || toMetaDescription(product.description),
    images,
    url: absoluteUrl(routes.product(channel.code, product.slug)),
    sku: product.variants[0]?.sku,
    brand: SITE_NAME,
    currency: product.variants[0]?.currencyCode ?? channel.currencyCode,
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    inStock: product.variants.some((variant) => variant.stockLevel !== 'OUT_OF_STOCK'),
  });
  const crumbLd = breadcrumbSchema([
    { name: 'Home', url: absoluteUrl(routes.home(channel.code)) },
    ...breadcrumbItems
      .filter((crumb) => crumb.slug !== VENDURE_ROOT_COLLECTION_SLUG)
      .map((crumb) => ({ name: crumb.name, url: absoluteUrl(routes.collection(channel.code, crumb.slug)) })),
    { name: product.name, url: absoluteUrl(routes.product(channel.code, product.slug)) },
  ]);

  return (
    <main className="flex-1">
      <div className={`py-section-sm ${CONTAINER}`}>
        <JsonLd data={productLd} />
        <JsonLd data={crumbLd} />
        <Breadcrumbs
          items={[...breadcrumbItems, { name: product.name, slug: product.slug }]}
          channelCode={channel.code}
        />

        <ProductDetail
          matrix={matrix}
          channelCode={channel.code}
          productName={product.name}
          productImages={images}
          detailTabs={detailTabs}
        />
      </div>

      {relatedCards.length > 0 && (
        <div className={`pb-section ${CONTAINER}`}>
          <SpotlightCarousel
            cards={relatedCards}
            channelCode={channel.code}
            eyebrow="Complete the look"
            heading={primaryCollection ? `More from ${primaryCollection.name}` : 'You may also like'}
            paragraph={null}
            ctaLabel={primaryCollection ? 'Shop the collection' : null}
            ctaHref={primaryCollection ? routes.collection(channel.code, primaryCollection.slug) : null}
          />
        </div>
      )}
    </main>
  );
}
