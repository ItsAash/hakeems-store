import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { fetchCustomerAction } from '@/lib/medusa/auth-actions';
import { ProfileForm } from '@/components/account/profile-form';
import { PasswordForm } from '@/components/account/password-form';

export default async function AccountProfilePage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const customer = await fetchCustomerAction(channel.code);
  if (!customer) redirect(routes.login(channel.code, routes.account(channel.code)));

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-xl text-[var(--color-ink)]">Profile</h2>
        <ProfileForm
          channelCode={channel.code}
          emailAddress={customer.email}
          firstName={customer.first_name ?? ''}
          lastName={customer.last_name ?? ''}
          phoneNumber={customer.phone ?? ''}
        />
      </section>

      <section className="flex max-w-sm flex-col gap-5 border-t hairline pt-8">
        <h2 className="font-serif text-xl text-[var(--color-ink)]">Change Password</h2>
        <PasswordForm channelCode={channel.code} />
      </section>
    </div>
  );
}
