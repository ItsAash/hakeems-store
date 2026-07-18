import { notFound, redirect } from 'next/navigation';
import { getChannel, isChannelCode } from '@/lib/channel';
import { routes } from '@/lib/routes';
import { fetchCustomerAction } from '@/lib/medusa/auth-actions';
import { AddressBook } from '@/components/account/address-book';

export default async function AccountAddressesPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelParam } = await params;
  if (!isChannelCode(channelParam)) notFound();
  const channel = getChannel(channelParam);

  const customer = await fetchCustomerAction(channel.code);
  if (!customer) redirect(routes.login(channel.code, routes.account(channel.code, '/addresses')));

  const addresses = (customer.addresses ?? []).map((addr: any) => ({
    id: addr.id,
    fullName: [addr.first_name, addr.last_name].filter(Boolean).join(' ') || '—',
    streetLine1: addr.address_1 ?? '',
    streetLine2: addr.address_2 ?? '',
    city: addr.city ?? '',
    province: addr.province ?? '',
    postalCode: addr.postal_code ?? '',
    country: { code: addr.country_code ?? '', name: (addr.country_code ?? '').toUpperCase() },
    phoneNumber: addr.phone ?? '',
    defaultShippingAddress: addr.is_default_shipping ?? false,
    defaultBillingAddress: addr.is_default_billing ?? false,
  }));

  const countries = [
    { code: 'np', name: 'Nepal' },
    { code: 'hk', name: 'Hong Kong' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Addresses</h2>
      <AddressBook
        channelCode={channel.code}
        addresses={addresses}
        countries={countries}
        defaultCountryCode={channel.countryCode}
      />
    </div>
  );
}
