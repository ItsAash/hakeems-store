import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { ProfileForm } from '@/components/account/profile-form';
import { PasswordForm } from '@/components/account/password-form';

export default async function AccountProfilePage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const { activeCustomer } = await getVendureClient(channel.code, sessionCookies).ActiveCustomer();
  if (!activeCustomer) redirect(`/${channel.code}/login?next=/${channel.code}/account`);

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-xl text-[var(--color-ink)]">Profile</h2>
        <ProfileForm
          channelCode={channel.code}
          emailAddress={activeCustomer.emailAddress}
          firstName={activeCustomer.firstName}
          lastName={activeCustomer.lastName}
          phoneNumber={activeCustomer.phoneNumber ?? ''}
        />
      </section>

      <section className="flex max-w-sm flex-col gap-5 border-t hairline pt-8">
        <h2 className="font-serif text-xl text-[var(--color-ink)]">Change Password</h2>
        <PasswordForm channelCode={channel.code} />
      </section>
    </div>
  );
}
