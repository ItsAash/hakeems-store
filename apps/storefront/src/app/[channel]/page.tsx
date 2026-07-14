import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getPage, getSiteSetting } from '@/lib/strapi/queries';
import { resolveMediaUrl } from '@/lib/strapi/client';
import { buildMetadata } from '@/lib/seo/metadata';
import { routes } from '@/lib/routes';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/sections/section-renderer';

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) return {};
  const setting = await getSiteSetting();
  const metaTitle = setting?.defaultSeo?.metaTitle || setting?.siteName;
  const ogImage = setting?.defaultSeo?.ogImage ? resolveMediaUrl(setting.defaultSeo.ogImage.url) : undefined;

  const metadata = buildMetadata({
    title: metaTitle,
    description: setting?.defaultSeo?.metaDescription || setting?.tagline || undefined,
    path: routes.home(channelParam),
    channel: channelParam,
    siteName: setting?.siteName,
    images: ogImage ? [ogImage] : [],
  });
  // Home is the brand landing page — use the title verbatim, without the "· {brand}" template.
  if (metaTitle) metadata.title = { absolute: metaTitle };
  return metadata;
}

/**
 * The home page is fully composed in Strapi: a `Page` (slug 'home', per channel) whose
 * dynamic zone of section blocks is rendered by SectionRenderer. Merchandisers reorder /
 * add / remove sections in Strapi with no code change. If the Page is missing the body is
 * empty (nav + footer still render) rather than crashing.
 */
export default async function HomePage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const page = await getPage('home', channel.code);

  return (
    <main className="flex flex-1 flex-col">
      {page && <SectionRenderer sections={page.sections} channelCode={channel.code} />}
    </main>
  );
}
