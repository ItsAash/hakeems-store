import { getChannel, isChannelCode } from '@/lib/channel';
import { getHomePage, getSiteSetting, getSpotlight } from '@/lib/strapi/queries';
import { notFound } from 'next/navigation';
import { HeroSlider } from '@/components/marketing/hero-slider';
import { FacetCategoryGrid } from '@/components/marketing/facet-category-grid';
import { SpotlightBlock } from '@/components/marketing/spotlight-block';
import { CONTAINER } from '@/lib/ui';

export default async function HomePage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const [homePage, siteSetting, spotlight] = await Promise.all([
    getHomePage(channel.code),
    getSiteSetting(),
    getSpotlight(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <HeroSlider slides={homePage?.heroSlides ?? []} channelCode={channel.code} />

      <FacetCategoryGrid tiles={homePage?.facetCategoryTiles ?? []} channelCode={channel.code} />

      {spotlight && <SpotlightBlock spotlight={spotlight} channelCode={channel.code} />}

      <div className={`flex flex-1 flex-col py-section-sm ${CONTAINER}`}>
        {/* Narrower measure for prose, left-aligned (no mx-auto) so it shares the
            same left edge as the nav/grid above instead of re-centering independently. */}
        <div className="flex max-w-xl flex-col gap-6">
          <p className="eyebrow">
            {siteSetting?.siteName ?? 'Hakeems'} · {channel.countryName}
          </p>
          {homePage?.storyEyebrow && <p className="eyebrow">{homePage.storyEyebrow}</p>}
          <h1 className="font-serif text-4xl text-[var(--color-ink)]">
            {homePage?.storyHeading ?? 'Phase 0 scaffold is live.'}
          </h1>
          <p className="text-[var(--color-ink-muted)]">
            {homePage?.storyParagraphs[0]?.text ??
              'This homepage is fetching real data from both Strapi and the Vendure Shop API.'}
          </p>
          <div className="mt-2 flex gap-8 border-t hairline pt-6 text-sm text-[var(--color-ink-muted)]">
            <span>Currency: {channel.currencyCode}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
