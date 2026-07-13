import { getChannel, isChannelCode } from '@/lib/channel';
import { getHomePage, getSpotlight, getNewArrivals } from '@/lib/strapi/queries';
import { notFound } from 'next/navigation';
import { HeroSlider } from '@/components/marketing/hero-slider';
import { FacetCategoryGrid } from '@/components/marketing/facet-category-grid';
import { SpotlightBlock } from '@/components/marketing/spotlight-block';
import { NewArrivalsBlock } from '@/components/marketing/new-arrivals-block';
import { CONTAINER } from '@/lib/ui';

export default async function HomePage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const [homePage, spotlight, newArrivals] = await Promise.all([
    getHomePage(channel.code),
    getSpotlight(),
    getNewArrivals(),
  ]);

  const hasStory = Boolean(homePage?.storyHeading || homePage?.storyParagraphs?.length);

  return (
    <main className="flex flex-1 flex-col">
      <HeroSlider slides={homePage?.heroSlides ?? []} channelCode={channel.code} />

      <FacetCategoryGrid tiles={homePage?.facetCategoryTiles ?? []} channelCode={channel.code} />

      {spotlight && <SpotlightBlock spotlight={spotlight} channelCode={channel.code} />}

      {/* Brand story / writing section — sits directly below the Spotlight and shares the
          site's standard section rhythm (py-section, like the rails above and below) so the
          whitespace reads as deliberate instead of the cramped py-section-sm it used before.
          Content is Strapi-authored (storyEyebrow / storyHeading / storyParagraphs). */}
      {hasStory && (
        <section className={`py-section ${CONTAINER}`}>
          {/* Narrower measure for prose, left-aligned so it shares the same left edge as
              the nav/grids above rather than re-centering independently. */}
          <div className="flex max-w-xl flex-col gap-6">
            {homePage?.storyEyebrow && <p className="eyebrow">{homePage.storyEyebrow}</p>}
            {homePage?.storyHeading && (
              <h2 className="font-serif text-4xl text-[var(--color-ink)]">{homePage.storyHeading}</h2>
            )}
            {homePage?.storyParagraphs.map((paragraph) => (
              <p key={paragraph.id} className="text-[var(--color-ink-muted)]">
                {paragraph.text}
              </p>
            ))}
          </div>
        </section>
      )}

      {newArrivals && <NewArrivalsBlock newArrivals={newArrivals} channelCode={channel.code} />}
    </main>
  );
}
