import { notFound } from 'next/navigation';
import { CHANNEL_CODES, getChannel, isChannelCode } from '@/lib/channel';
import { ChannelProvider } from '@/lib/channel-context';
import { AnnouncementBar } from '@/components/marketing/announcement-bar';
import { NavBar } from '@/components/nav/nav-bar';
import { HeaderChrome } from '@/components/nav/header-chrome';
import { Footer } from '@/components/nav/footer';
import { getVisibleAnnouncements } from '@/lib/announcements';
import { getPage, getSiteSetting } from '@/lib/strapi/queries';
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo/site';
import { JsonLd, organizationSchema, websiteSchema } from '@/lib/seo/structured-data';

export function generateStaticParams() {
  return CHANNEL_CODES.map((channel) => ({ channel }));
}

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ channel: string }>;
}) {
  const { channel: channelParam } = await params;

  if (!isChannelCode(channelParam)) {
    notFound();
  }

  const channel = getChannel(channelParam);
  // The announcement bar is site-wide (every route), but its content is authored on the
  // 'home' Page — the old home-page content type used to own it (see lib/announcements.ts).
  const [homePage, siteSetting] = await Promise.all([
    getPage('home', channel.code).catch(() => null),
    getSiteSetting().catch(() => null),
  ]);
  const activeAnnouncements = getVisibleAnnouncements(
    homePage?.announcementBarEnabled ?? null,
    homePage?.announcements ?? [],
  );

  const siteName = siteSetting?.siteName || SITE_NAME;
  const organization = organizationSchema({
    name: siteName,
    url: SITE_URL,
    sameAs: siteSetting?.socialLinks.map((link) => link.url) ?? [],
    email: siteSetting?.supportEmail,
    phone: siteSetting?.supportPhone,
  });
  const website = websiteSchema({ name: siteName, url: SITE_URL, searchUrl: absoluteUrl(`/${channel.code}/search`) });

  return (
    <ChannelProvider channel={channel}>
      <JsonLd data={organization} />
      <JsonLd data={website} />
      <div className="flex min-h-screen flex-col">
        <HeaderChrome channelCode={channel.code} hasAnnouncement={activeAnnouncements.length > 0}>
          <AnnouncementBar announcements={activeAnnouncements} />
          <NavBar channel={channel} />
        </HeaderChrome>
        {children}
        <Footer channel={channel} />
      </div>
    </ChannelProvider>
  );
}
