import { getChannel, isChannelCode } from '@/lib/channel';
import { getPage } from '@/lib/strapi/queries';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/sections/section-renderer';

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
