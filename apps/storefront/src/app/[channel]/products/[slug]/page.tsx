import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { buildVariantMatrix } from '@/lib/vendure/pdp';
import { CONTAINER } from '@/lib/ui';
import { Breadcrumbs } from '@/components/commerce/breadcrumbs';
import { ProductDetail } from '@/components/commerce/product-detail';

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

      <ProductDetail
        matrix={matrix}
        channelCode={channel.code}
        productName={product.name}
        productImages={images}
        detailTabs={[
          { id: 'details', label: 'Details', content: description },
          { id: 'fit-fabric', label: 'Fit & Fabric', content: product.customFields?.fitAndFabric },
          { id: 'shipping-returns', label: 'Shipping & Returns', content: product.customFields?.shippingReturns },
        ]}
      />
    </main>
  );
}
