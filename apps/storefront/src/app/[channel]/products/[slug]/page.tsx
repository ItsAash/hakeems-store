import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { retrieveProduct, listCollectionProducts } from '@/lib/medusa/products';
import { buildVariantMatrix } from '@/lib/medusa/pdp';
import { buildProductCards } from '@/lib/medusa/product-card';
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

function metaStr(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const val = metadata?.[key];
  return typeof val === 'string' ? val : null;
}

async function loadProduct(channelParam: string, handle: string) {
  if (!isChannelCode(channelParam)) return null;
  const channel = getChannel(channelParam);
  const result = await retrieveProduct(channel.code, handle).catch(() => null);
  if (!result) return null;
  return { channel, product: result };
}

export async function generateMetadata({ params }: { params: Promise<PdpParams> }): Promise<Metadata> {
  const { channel: channelParam, slug } = await params;
  const data = await loadProduct(channelParam, slug);
  if (!data?.product) return { title: 'Product not found', robots: { index: false, follow: false } };

  const { channel, product } = data;
  return buildMetadata({
    title: metaStr(product.metadata, 'seo_title') || product.title,
    description: metaStr(product.metadata, 'seo_description') || toMetaDescription(product.description ?? ''),
    path: routes.product(channel.code, product.handle),
    channel: channel.code,
    images: (product.images ?? []).map((img) => img.url).slice(0, 4),
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<PdpParams> }) {
  const { channel: channelParam, slug } = await params;
  const data = await loadProduct(channelParam, slug);
  if (!data?.product) notFound();

  const { channel, product } = data;
  const matrix = buildVariantMatrix(product);
  const images = (product.images ?? []).map((img) => img.url);
  const collection = product.collection ?? null;
  const categories = product.categories ?? [];

  const description = metaStr(product.metadata, 'enriched_description') || product.description || '';

  const [productPage, relatedCards] = await Promise.all([
    getProductPage(product.handle).catch(() => null),
    collection
      ? listCollectionProducts(channel.code, collection.handle, 60)
          .then((cards) => cards.filter((card) => card.slug !== product.handle))
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const detailTabs: ProductDetailsTab[] = [
    { id: 'details', label: 'Details', content: <p className="leading-relaxed text-[var(--color-ink-muted)]">{description}</p> },
    ...(metaStr(product.metadata, 'fit_and_fabric')
      ? [{ id: 'fit-fabric', label: 'Fit & Fabric', content: <p className="leading-relaxed text-[var(--color-ink-muted)]">{metaStr(product.metadata, 'fit_and_fabric')!}</p> }]
      : []),
    ...(metaStr(product.metadata, 'shipping_returns')
      ? [{ id: 'shipping-returns', label: 'Shipping & Returns', content: <p className="leading-relaxed text-[var(--color-ink-muted)]">{metaStr(product.metadata, 'shipping_returns')!}</p> }]
      : []),
  ];

  for (const panel of productPage?.panels ?? []) {
    if (!panel.content.trim()) continue;
    detailTabs.push({
      id: `panel-${panel.id}`,
      label: panel.title,
      content: <Markdown content={panel.content} />,
    });
  }

  const prices = matrix.variants.map((v) => v.priceWithTax);
  const productLd = productSchema({
    name: product.title,
    description: metaStr(product.metadata, 'seo_description') || product.description || '',
    images,
    url: absoluteUrl(routes.product(channel.code, product.handle)),
    sku: matrix.variants[0]?.sku,
    brand: SITE_NAME,
    currency: matrix.variants[0]?.currencyCode ?? channel.currencyCode.toLowerCase(),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    inStock: matrix.variants.some((v) => v.inStock),
  });
  const crumbLd = breadcrumbSchema([
    { name: 'Home', url: absoluteUrl(routes.home(channel.code)) },
    ...categories.map((cat) => ({ name: cat.name, url: absoluteUrl(routes.collection(channel.code, cat.handle)) })),
    { name: product.title, url: absoluteUrl(routes.product(channel.code, product.handle)) },
  ]);

  return (
    <main className="flex-1">
      <div className={`py-section-sm ${CONTAINER}`}>
        <JsonLd data={productLd} />
        <JsonLd data={crumbLd} />
        <Breadcrumbs
          items={[...categories.map((c) => ({ name: c.name, slug: c.handle })), { name: product.title, slug: product.handle }]}
          channelCode={channel.code}
        />

        <ProductDetail
          matrix={matrix}
          channelCode={channel.code}
          productName={product.title}
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
            heading={collection ? `More from ${collection.title}` : 'You may also like'}
            paragraph={null}
            ctaLabel={collection ? 'Shop the collection' : null}
            ctaHref={collection ? routes.collection(channel.code, collection.handle) : null}
          />
        </div>
      )}
    </main>
  );
}
