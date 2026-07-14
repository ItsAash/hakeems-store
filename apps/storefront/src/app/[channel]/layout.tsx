import { notFound } from 'next/navigation';
import { CHANNEL_CODES, getChannel, isChannelCode } from '@/lib/channel';
import { ChannelProvider } from '@/lib/channel-context';
import { AnnouncementBar } from '@/components/marketing/announcement-bar';
import { NavBar } from '@/components/nav/nav-bar';
import { HeaderChrome } from '@/components/nav/header-chrome';
import { Footer } from '@/components/nav/footer';
import { getVisibleAnnouncements } from '@/lib/announcements';
import { getPage } from '@/lib/strapi/queries';

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
  const homePage = await getPage('home', channel.code);
  const activeAnnouncements = getVisibleAnnouncements(
    homePage?.announcementBarEnabled ?? null,
    homePage?.announcements ?? [],
  );

  return (
    <ChannelProvider channel={channel}>
      <div className="flex min-h-screen flex-col">
        <HeaderChrome channelCode={channel.code}>
          <AnnouncementBar announcements={activeAnnouncements} />
          <NavBar channel={channel} />
        </HeaderChrome>
        {children}
        <Footer channel={channel} />
      </div>
    </ChannelProvider>
  );
}
