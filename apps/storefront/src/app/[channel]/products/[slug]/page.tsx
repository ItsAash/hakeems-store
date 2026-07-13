import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { buildVariantMatrix } from '@/lib/vendure/pdp';
import { CONTAINER } from '@/lib/ui';
import { Breadcrumbs } from '@/components/commerce/breadcrumbs';
import { ProductGallery } from '@/components/commerce/product-gallery';
import { VariantSelector } from '@/components/commerce/variant-selector';
import { ProductDetailsTabs } from '@/components/commerce/product-details-tabs';

type PdpParams = { channel: string; slug: string };

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
  if (!data?.product) return {};

  const { product } = data;
  return {
    title: product.customFields?.seoTitle || product.name,
    description: product.customFields?.seoDescription || product.description,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<PdpParams> }) {
  const { channel: channelParam, slug } = await params;
  const data = await loadProduct(channelParam, slug);
  if (!data?.product) notFound();

  const { channel, product } = data;
  const matrix = buildVariantMatrix(product.variants);
  const breadcrumbItems = product.collections[0]?.breadcrumbs ?? [];
  const description = product.customFields?.enrichedDescription || product.description;
  const images = product.assets.map((asset) => asset.preview);

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <Breadcrumbs items={[...breadcrumbItems, { name: product.name, slug: product.slug }]} channelCode={channel.code} />

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={images} alt={product.name} />

        <div className="flex flex-col gap-6 lg:max-w-md lg:py-4">
          <div>
            <h1 className="font-serif text-3xl text-[var(--color-ink)] md:text-4xl">{product.name}</h1>
          </div>

          <VariantSelector matrix={matrix} channelCode={channel.code} />

          <ProductDetailsTabs
            tabs={[
              { id: 'details', label: 'Details', content: description },
              { id: 'fit-fabric', label: 'Fit & Fabric', content: product.customFields?.fitAndFabric },
              { id: 'shipping-returns', label: 'Shipping & Returns', content: product.customFields?.shippingReturns },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
