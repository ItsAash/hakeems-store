import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { CONTAINER } from '@/lib/ui';
import { RegisterForm } from '@/components/auth/register-form';

export default async function RegisterPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const { activeCustomer } = await getVendureClient(channel.code, sessionCookies).ActiveCustomer();
  if (activeCustomer) redirect(`/${channel.code}/account`);

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <div className="mx-auto flex max-w-sm flex-col gap-8">
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">Create Account</h1>
        <RegisterForm channelCode={channel.code} />
      </div>
    </main>
  );
}
