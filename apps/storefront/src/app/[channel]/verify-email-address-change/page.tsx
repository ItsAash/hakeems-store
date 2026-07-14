import { notFound } from 'next/navigation';
import { NOINDEX_METADATA } from '@/lib/seo/metadata';

export const metadata = { ...NOINDEX_METADATA, title: 'Email Change' };
import { getChannel, isChannelCode } from '@/lib/channel';
import { CONTAINER } from '@/lib/ui';
import { EmailChangeStatus } from '@/components/auth/email-change-status';

export default async function VerifyEmailAddressChangePage({
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
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">Confirm Email Change</h1>
        {token ? (
          <EmailChangeStatus channelCode={channel.code} token={token} />
        ) : (
          <p className="text-sm text-red-600">This link is missing its token. Please use the link from your email.</p>
        )}
      </div>
    </main>
  );
}
