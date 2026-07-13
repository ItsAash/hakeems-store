import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { getVendureClient } from '@/lib/vendure/client';
import { getVendureSessionCookies } from '@/lib/session';
import { AddressBook } from '@/components/account/address-book';

export default async function AccountAddressesPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const sessionCookies = await getVendureSessionCookies();
  const client = getVendureClient(channel.code, sessionCookies);
  const [{ activeCustomer }, { availableCountries }] = await Promise.all([client.ActiveCustomer(), client.Countries()]);
  if (!activeCustomer) redirect(`/${channel.code}/login?next=/${channel.code}/account/addresses`);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Addresses</h2>
      <AddressBook
        channelCode={channel.code}
        addresses={activeCustomer.addresses ?? []}
        countries={availableCountries}
        defaultCountryCode={channel.countryCode}
      />
    </div>
  );
}
