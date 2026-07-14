import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { CONTAINER } from '@/lib/ui';
import { AccountNav } from '@/components/account/account-nav';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ channel: string }>;
}) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const { activeCustomer } = await getVendureClient(channel.code, sessionCookies).ActiveCustomer();
  if (!activeCustomer) redirect(routes.login(channel.code, routes.account(channel.code)));

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <h1 className="mb-10 font-serif text-3xl text-[var(--color-ink)] md:text-4xl">My Account</h1>
      <div className="flex flex-col gap-10 md:flex-row">
        <AccountNav channelCode={channel.code} />
        <div className="flex-1">{children}</div>
      </div>
    </main>
  );
}
