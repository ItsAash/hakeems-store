import { notFound, redirect } from 'next/navigation';
import { NOINDEX_METADATA } from '@/lib/seo/metadata';

export const metadata = { ...NOINDEX_METADATA, title: 'Sign In' };
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { CONTAINER } from '@/lib/ui';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ channel: channelParam }, { next }] = await Promise.all([params, searchParams]);
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const { activeCustomer } = await getVendureClient(channel.code, sessionCookies).ActiveCustomer();
  if (activeCustomer) redirect(next && next.startsWith('/') ? next : routes.account(channel.code));

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <div className="mx-auto flex max-w-sm flex-col gap-8">
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">Sign In</h1>
        <LoginForm channelCode={channel.code} next={next && next.startsWith('/') ? next : routes.account(channel.code)} />
      </div>
    </main>
  );
}
