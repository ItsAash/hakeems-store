import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { buildMetadata, NOINDEX_METADATA } from '@/lib/seo/metadata';
import { CONTAINER } from '@/lib/ui';
import { WishlistGrid } from '@/components/commerce/wishlist-grid';

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) return {};
  return {
    ...buildMetadata({
      title: 'Wishlist',
      description: 'Pieces you have saved for later.',
      path: routes.wishlist(channelParam),
      channel: channelParam,
    }),
    ...NOINDEX_METADATA,
  };
}

export default async function WishlistPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  return (
    <main className="flex-1">
      <div className={`flex flex-col gap-3 py-section-sm ${CONTAINER}`}>
        <p className="eyebrow">Saved</p>
        <h1 className="font-serif text-display text-[var(--color-ink)]">Wishlist</h1>
      </div>
      <div className={`pb-section ${CONTAINER}`}>
        <WishlistGrid channelCode={channel.code} />
      </div>
    </main>
  );
}
