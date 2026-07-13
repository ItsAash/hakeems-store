import { notFound } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { CONTAINER } from '@/lib/ui';
import { PasswordResetForm } from '@/components/auth/password-reset-form';

export default async function PasswordResetPage({
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
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">Reset Password</h1>
        {token ? (
          <PasswordResetForm channelCode={channel.code} token={token} />
        ) : (
          <p className="text-sm text-red-600">This reset link is missing its token. Please use the link from your email.</p>
        )}
      </div>
    </main>
  );
}
