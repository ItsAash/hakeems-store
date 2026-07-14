import { notFound } from 'next/navigation';
import { NOINDEX_METADATA } from '@/lib/seo/metadata';

export const metadata = { ...NOINDEX_METADATA, title: 'Forgot Password' };
import { getChannel, isChannelCode } from '@/lib/channel';
import { CONTAINER } from '@/lib/ui';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default async function ForgotPasswordPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  return (
    <main className={`flex-1 py-section-sm ${CONTAINER}`}>
      <div className="mx-auto flex max-w-sm flex-col gap-8">
        <h1 className="font-serif text-3xl text-[var(--color-ink)]">Forgot Password</h1>
        <ForgotPasswordForm channelCode={channel.code} />
      </div>
    </main>
  );
}
