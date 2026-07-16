import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getBrandStory } from '@/lib/strapi/queries';
import { pickImageUrl } from '@/lib/strapi/client';
import { buildMetadata } from '@/lib/seo/metadata';
import { toMetaDescription } from '@/lib/seo/site';
import { CONTAINER } from '@/lib/ui';

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) return {};
  const story = await getBrandStory();
  const image = story?.image ? pickImageUrl(story.image, ['large', 'medium']) : undefined;
  return buildMetadata({
    title: story?.heading ? `Our Story — ${story.heading}` : 'Our Story',
    description: toMetaDescription(story?.paragraphs.map((p) => p.text).join(' ')),
    path: `/${channelParam}/story`,
    channel: channelParam,
    type: 'article',
    images: image ? [image] : [],
  });
}

/**
 * Standalone rendering of the same global brand story shown as a section on the home page
 * (see components/sections/brand-story-block.tsx) — the "Our Story" nav/footer link needs
 * somewhere to go that isn't just a home-page anchor. Renders the full story, including the
 * image the compact home-page section omits for space.
 */
export default async function StoryPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  getChannel(channelParam);

  const story = await getBrandStory();
  if (!story) notFound();

  const imageUrl = story.image ? pickImageUrl(story.image, ['large', 'medium']) : null;

  return (
    <main className={`flex-1 py-section ${CONTAINER}`}>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {story.eyebrow && <p className="eyebrow">{story.eyebrow}</p>}
        <h1 className="font-serif text-4xl text-[var(--color-ink)] md:text-5xl">{story.heading}</h1>

        {imageUrl && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-hairline)]">
            <Image src={imageUrl} alt={story.heading} fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-5">
          {story.paragraphs.map((paragraph) => (
            <p key={paragraph.id} className="text-[var(--color-ink-muted)]">
              {paragraph.text}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
