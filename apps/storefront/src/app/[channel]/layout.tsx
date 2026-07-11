import { Shell } from '@/components/Shell';
import { assertChannel } from '@/lib/channels';

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ channel: string }>;
}) {
  const { channel: channelParam } = await params;
  const channel = assertChannel(channelParam);
  return <Shell channel={channel}>{children}</Shell>;
}
