'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { setCustomerForOrderAction, setOrderShippingAddressAction } from '@/lib/vendure/actions';
import { createCustomerAddressAction } from '@/lib/vendure/auth-actions';
import type { CreateAddressInput, CustomerAddressFieldsFragment } from '@/lib/vendure/generated';
import { Field } from '@/components/ui/field';

export type Country = { code: string; name: string };

/** The signed-in customer's profile + saved addresses, passed only when authenticated. */
export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string | null;
  addresses: CustomerAddressFieldsFragment[];
};

type ContactState = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

type AddressState = {
  streetLine1: string;
  streetLine2: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
};

const emptyAddress: AddressState = {
  streetLine1: '',
  streetLine2: '',
  city: '',
  province: '',
  postalCode: '',
  countryCode: '',
};

/** Map a saved account address to the CreateAddressInput the order mutation expects. */
function savedAddressToInput(address: CustomerAddressFieldsFragment): CreateAddressInput {
  return {
    fullName: address.fullName || undefined,
    streetLine1: address.streetLine1,
    streetLine2: address.streetLine2 || undefined,
    city: address.city || undefined,
    province: address.province || undefined,
    postalCode: address.postalCode || undefined,
    countryCode: address.country.code,
    phoneNumber: address.phoneNumber || undefined,
  };
}

/** Human-readable lines for an address card, skipping any empty parts. */
function addressSummaryLines(address: CustomerAddressFieldsFragment): string[] {
  const cityLine = [address.city, address.province, address.postalCode].filter(Boolean).join(', ');
  return [address.streetLine1, address.streetLine2, cityLine, address.country.name, address.phoneNumber].filter(
    (line): line is string => Boolean(line),
  );
}

/**
 * Checkout address step.
 *
 * Signed-in customers get their contact details pre-filled from their Vendure profile and,
 * when they have saved addresses, a one-click picker over all of them plus an "add new"
 * option (which can optionally be saved back to their account). Guests get the standard
 * empty form. Everything is data-driven from Vendure — nothing hardcoded.
 */
export function AddressForm({
  channelCode,
  countries,
  defaultCountryCode,
  customer,
  defaultEmail,
}: {
  channelCode: ChannelCode;
  countries: Country[];
  defaultCountryCode: string;
  /** Present only when the customer is signed in. */
  customer?: CheckoutCustomer | null;
  /** Guest email fallback (e.g. from a prior guest checkout). */
  defaultEmail?: string;
}) {
  const router = useRouter();
  const isLoggedIn = !!customer;
  const savedAddresses = customer?.addresses ?? [];
  const hasSavedAddresses = savedAddresses.length > 0;

  const [contact, setContact] = useState<ContactState>({
    email: customer?.emailAddress ?? defaultEmail ?? '',
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    phoneNumber: customer?.phoneNumber ?? '',
  });

  // "saved": pick an existing account address. "new": type one in. Default to picking when any
  // saved address exists, otherwise straight to the new-address form.
  const [mode, setMode] = useState<'saved' | 'new'>(hasSavedAddresses ? 'saved' : 'new');
  const defaultSelectedId =
    savedAddresses.find((address) => address.defaultShippingAddress)?.id ?? savedAddresses[0]?.id ?? null;
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultSelectedId);

  const [address, setAddress] = useState<AddressState>({ ...emptyAddress, countryCode: defaultCountryCode });
  const [saveToAccount, setSaveToAccount] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setContactField =
    (field: keyof ContactState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setContact((current) => ({ ...current, [field]: event.target.value }));
  const setAddressField =
    (field: keyof AddressState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddress((current) => ({ ...current, [field]: event.target.value }));

  const usingSavedAddress = isLoggedIn && mode === 'saved' && hasSavedAddresses;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const fail = (message: string) => {
      setError(message);
      setIsSubmitting(false);
    };

    // Vendure rejects setCustomerForOrder once the session is authenticated — the order's
    // customer is implicitly the signed-in user, so only guests need this call.
    if (!isLoggedIn) {
      const customerResult = await setCustomerForOrderAction(channelCode, {
        emailAddress: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phoneNumber: contact.phoneNumber || undefined,
      });
      if (!customerResult.success) return fail(customerResult.message);
    }

    let addressInput: CreateAddressInput;
    if (usingSavedAddress) {
      const selected = savedAddresses.find((candidate) => candidate.id === selectedAddressId);
      if (!selected) return fail('Please select a shipping address.');
      addressInput = savedAddressToInput(selected);
    } else {
      addressInput = {
        fullName: `${contact.firstName} ${contact.lastName}`.trim() || undefined,
        streetLine1: address.streetLine1,
        streetLine2: address.streetLine2 || undefined,
        city: address.city || undefined,
        province: address.province || undefined,
        postalCode: address.postalCode || undefined,
        countryCode: address.countryCode,
        phoneNumber: contact.phoneNumber || undefined,
      };

      // Optionally persist the new address to the account for future orders. A failure here
      // shouldn't block the order — the address is still applied below either way.
      if (isLoggedIn && saveToAccount) {
        await createCustomerAddressAction(channelCode, {
          ...addressInput,
          defaultShippingAddress: savedAddresses.length === 0,
        });
      }
    }

    const addressResult = await setOrderShippingAddressAction(channelCode, addressInput);
    if (!addressResult.success) return fail(addressResult.message);

    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Contact */}
      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-xl text-[var(--color-ink)]">Contact</h2>

        <Field
          idPrefix="contact"
          label="Email"
          type="email"
          required
          disabled={isLoggedIn}
          value={contact.email}
          onChange={setContactField('email')}
          autoComplete="email"
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            idPrefix="contact"
            label="First name"
            required
            value={contact.firstName}
            onChange={setContactField('firstName')}
            autoComplete="given-name"
          />
          <Field
            idPrefix="contact"
            label="Last name"
            required
            value={contact.lastName}
            onChange={setContactField('lastName')}
            autoComplete="family-name"
          />
        </div>
        <Field
          idPrefix="contact"
          label="Phone (optional)"
          type="tel"
          value={contact.phoneNumber}
          onChange={setContactField('phoneNumber')}
          autoComplete="tel"
        />
      </section>

      {/* Shipping address */}
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-xl text-[var(--color-ink)]">Shipping Address</h2>

        {hasSavedAddresses && (
          <div className="flex flex-col gap-3">
            {savedAddresses.map((saved) => {
              const isSelected = mode === 'saved' && selectedAddressId === saved.id;
              return (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => {
                    setMode('saved');
                    setSelectedAddressId(saved.id);
                  }}
                  aria-pressed={isSelected}
                  className={`flex items-start gap-3 border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[var(--color-ink)] bg-[var(--color-paper-raised)]'
                      : 'border-[var(--color-hairline)] hover:border-[var(--color-ink)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? 'border-[var(--color-ink)]' : 'border-[var(--color-ink-muted)]'
                    }`}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-[var(--color-ink)]" />}
                  </span>
                  <span className="flex flex-col gap-0.5 text-sm">
                    {saved.fullName && <span className="font-medium text-[var(--color-ink)]">{saved.fullName}</span>}
                    {addressSummaryLines(saved).map((line, index) => (
                      <span key={index} className="text-[var(--color-ink-muted)]">
                        {line}
                      </span>
                    ))}
                    {saved.defaultShippingAddress && (
                      <span className="mt-1 text-[11px] tracking-[0.1em] text-[var(--color-ink-muted)] uppercase">
                        Default
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setMode('new')}
              aria-pressed={mode === 'new'}
              className={`border border-dashed p-4 text-left text-sm transition-colors ${
                mode === 'new'
                  ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                  : 'border-[var(--color-hairline)] text-[var(--color-ink-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]'
              }`}
            >
              + Add a new address
            </button>
          </div>
        )}

        {/* New-address fields: shown for guests, for signed-in customers with no saved address,
            or when "Add a new address" is chosen. */}
        {!usingSavedAddress && (
          <div className="flex flex-col gap-5 pt-1">
            <Field
              idPrefix="address"
              label="Address"
              required
              value={address.streetLine1}
              onChange={setAddressField('streetLine1')}
              autoComplete="address-line1"
            />
            <Field
              idPrefix="address"
              label="Apartment, suite, etc. (optional)"
              value={address.streetLine2}
              onChange={setAddressField('streetLine2')}
              autoComplete="address-line2"
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                idPrefix="address"
                label="City"
                required
                value={address.city}
                onChange={setAddressField('city')}
                autoComplete="address-level2"
              />
              <Field
                idPrefix="address"
                label="Province / State"
                required
                value={address.province}
                onChange={setAddressField('province')}
                autoComplete="address-level1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                idPrefix="address"
                label="Postal code"
                required
                value={address.postalCode}
                onChange={setAddressField('postalCode')}
                autoComplete="postal-code"
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="address-country" className="text-xs text-[var(--color-ink-muted)]">
                  Country
                </label>
                <select
                  id="address-country"
                  required
                  value={address.countryCode}
                  onChange={setAddressField('countryCode')}
                  className="border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2.5 text-sm text-[var(--color-ink)]"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoggedIn && (
              <label className="flex items-center gap-2.5 text-sm text-[var(--color-ink-muted)]">
                <input
                  type="checkbox"
                  checked={saveToAccount}
                  onChange={(event) => setSaveToAccount(event.target.checked)}
                  className="h-4 w-4 accent-[var(--color-ink)]"
                />
                Save this address to my account for future orders
              </label>
            )}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Saving…' : 'Continue to Shipping'}
      </button>
    </form>
  );
}
