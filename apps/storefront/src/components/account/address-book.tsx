'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import {
  createCustomerAddressAction,
  deleteCustomerAddressAction,
  updateCustomerAddressAction,
} from '@/lib/vendure/auth-actions';
import { Field } from '@/components/ui/field';
import type { CustomerAddressFieldsFragment, CountriesQuery } from '@/lib/vendure/generated';

type Country = CountriesQuery['availableCountries'][number];

type AddressFormState = {
  fullName: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber: string;
  defaultShippingAddress: boolean;
  defaultBillingAddress: boolean;
};

function toFormState(address: CustomerAddressFieldsFragment | undefined, defaultCountryCode: string): AddressFormState {
  return {
    fullName: address?.fullName ?? '',
    streetLine1: address?.streetLine1 ?? '',
    streetLine2: address?.streetLine2 ?? '',
    city: address?.city ?? '',
    province: address?.province ?? '',
    postalCode: address?.postalCode ?? '',
    countryCode: address?.country.code ?? defaultCountryCode,
    phoneNumber: address?.phoneNumber ?? '',
    defaultShippingAddress: address?.defaultShippingAddress ?? false,
    defaultBillingAddress: address?.defaultBillingAddress ?? false,
  };
}

function AddressFields({
  idPrefix,
  form,
  setForm,
  countries,
}: {
  idPrefix: string;
  form: AddressFormState;
  setForm: (updater: (current: AddressFormState) => AddressFormState) => void;
  countries: Country[];
}) {
  const setField =
    (field: keyof AddressFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  const setChecked = (field: keyof AddressFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.checked }));
  };

  return (
    <div className="flex flex-col gap-4">
      <Field idPrefix={idPrefix} label="Full name" required value={form.fullName} onChange={setField('fullName')} />
      <Field idPrefix={idPrefix} label="Address" required value={form.streetLine1} onChange={setField('streetLine1')} />
      <Field idPrefix={idPrefix} label="Apartment, suite, etc. (optional)" value={form.streetLine2} onChange={setField('streetLine2')} />
      <div className="grid grid-cols-2 gap-4">
        <Field idPrefix={idPrefix} label="City" required value={form.city} onChange={setField('city')} />
        <Field idPrefix={idPrefix} label="Province / State" required value={form.province} onChange={setField('province')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field idPrefix={idPrefix} label="Postal code" required value={form.postalCode} onChange={setField('postalCode')} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-country`} className="text-xs text-[var(--color-ink-muted)]">
            Country
          </label>
          <select
            id={`${idPrefix}-country`}
            required
            value={form.countryCode}
            onChange={setField('countryCode')}
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
      <Field idPrefix={idPrefix} label="Phone (optional)" type="tel" value={form.phoneNumber} onChange={setField('phoneNumber')} />

      <div className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.defaultShippingAddress} onChange={setChecked('defaultShippingAddress')} className="accent-[var(--color-ink)]" />
          Default shipping address
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.defaultBillingAddress} onChange={setChecked('defaultBillingAddress')} className="accent-[var(--color-ink)]" />
          Default billing address
        </label>
      </div>
    </div>
  );
}

function AddressCard({
  address,
  channelCode,
  countries,
}: {
  address: CustomerAddressFieldsFragment;
  channelCode: ChannelCode;
  countries: Country[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => toFormState(address, address.country.code));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await updateCustomerAddressAction(channelCode, { id: address.id, ...form });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this address?')) return;
    setIsSubmitting(true);
    await deleteCustomerAddressAction(channelCode, address.id);
    router.refresh();
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="flex flex-col gap-4 border hairline p-5">
        <AddressFields idPrefix={`address-${address.id}`} form={form} setForm={setForm} countries={countries} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-5 py-2.5 text-sm font-medium tracking-[0.1em] text-[var(--color-ink-muted)] uppercase hover:text-[var(--color-ink)]"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2 border hairline p-5 text-sm text-[var(--color-ink)]">
      <p className="font-medium">{address.fullName}</p>
      <p className="text-[var(--color-ink-muted)]">{address.streetLine1}</p>
      {address.streetLine2 && <p className="text-[var(--color-ink-muted)]">{address.streetLine2}</p>}
      <p className="text-[var(--color-ink-muted)]">
        {address.city}, {address.province} {address.postalCode}
      </p>
      <p className="text-[var(--color-ink-muted)]">{address.country.name}</p>
      {address.phoneNumber && <p className="text-[var(--color-ink-muted)]">{address.phoneNumber}</p>}
      {(address.defaultShippingAddress || address.defaultBillingAddress) && (
        <p className="text-xs tracking-[0.1em] text-[var(--color-ink)] uppercase">
          {[address.defaultShippingAddress && 'Default Shipping', address.defaultBillingAddress && 'Default Billing']
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      <div className="mt-2 flex gap-4">
        <button type="button" onClick={() => setIsEditing(true)} className="text-xs tracking-[0.1em] uppercase underline underline-offset-2">
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="text-xs tracking-[0.1em] text-red-600 uppercase underline underline-offset-2 disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export function AddressBook({
  channelCode,
  addresses,
  countries,
  defaultCountryCode,
}: {
  channelCode: ChannelCode;
  addresses: CustomerAddressFieldsFragment[];
  countries: Country[];
  defaultCountryCode: string;
}) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(() => toFormState(undefined, defaultCountryCode));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await createCustomerAddressAction(channelCode, form);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setIsAdding(false);
    setForm(toFormState(undefined, defaultCountryCode));
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {addresses.length === 0 && !isAdding && <p className="text-sm text-[var(--color-ink-muted)]">No saved addresses yet.</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard key={address.id} address={address} channelCode={channelCode} countries={countries} />
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleAdd} className="flex max-w-sm flex-col gap-4 border hairline p-5">
          <AddressFields idPrefix="address-new" form={form} setForm={setForm} countries={countries} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-5 py-2.5 text-sm font-medium tracking-[0.1em] text-[var(--color-ink-muted)] uppercase hover:text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="self-start border-b border-[var(--color-ink)] pb-1 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
        >
          + Add a new address
        </button>
      )}
    </div>
  );
}
