import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { CONTAINER } from '@/lib/ui';
import { VerifyStatus, ResendVerificationForm } from '@/components/auth/verify-status';

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ channel: channelParam }, { token }] = await Promise.all([params, searchParams]);
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <div className="mx-auto flex max-w-sm flex-col gap-8">
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">Verify Your Email</h1>
        {token ? <VerifyStatus channelCode={channel.code} token={token} /> : <ResendVerificationForm channelCode={channel.code} />}
      </div>
    </main>
  );
}
