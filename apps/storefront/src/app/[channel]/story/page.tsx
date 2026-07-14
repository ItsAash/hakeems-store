import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getBrandStory } from '@/lib/strapi/queries';
import { pickImageUrl } from '@/lib/strapi/client';
import { CONTAINER } from '@/lib/ui';

export const metadata: Metadata = { title: 'Our Story' };

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
          <div className="aspect-[16/9] w-full overflow-hidden bg-[var(--color-hairline)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
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
