'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { setCustomerForOrderAction, setOrderShippingAddressAction } from '@/lib/vendure/actions';

export type Country = { code: string; name: string };

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber: string;
};

const emptyForm: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  streetLine1: '',
  streetLine2: '',
  city: '',
  province: '',
  postalCode: '',
  countryCode: '',
  phoneNumber: '',
};

export function AddressForm({
  channelCode,
  countries,
  defaultCountryCode,
}: {
  channelCode: ChannelCode;
  countries: Country[];
  defaultCountryCode: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...emptyForm, countryCode: defaultCountryCode });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const customerResult = await setCustomerForOrderAction(channelCode, {
      emailAddress: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      phoneNumber: form.phoneNumber || undefined,
    });
    if (!customerResult.success) {
      setError(customerResult.message);
      setIsSubmitting(false);
      return;
    }

    const addressResult = await setOrderShippingAddressAction(channelCode, {
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      streetLine1: form.streetLine1,
      streetLine2: form.streetLine2 || undefined,
      city: form.city,
      province: form.province || undefined,
      postalCode: form.postalCode,
      countryCode: form.countryCode,
      phoneNumber: form.phoneNumber || undefined,
    });
    if (!addressResult.success) {
      setError(addressResult.message);
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-[var(--color-ink)]">Contact &amp; Shipping Address</h2>

      <Field label="Email" type="email" required value={form.email} onChange={setField('email')} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" required value={form.firstName} onChange={setField('firstName')} />
        <Field label="Last name" required value={form.lastName} onChange={setField('lastName')} />
      </div>

      <Field label="Address" required value={form.streetLine1} onChange={setField('streetLine1')} />
      <Field label="Apartment, suite, etc. (optional)" value={form.streetLine2} onChange={setField('streetLine2')} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="City" required value={form.city} onChange={setField('city')} />
        <Field label="Province / State" required value={form.province} onChange={setField('province')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Postal code" required value={form.postalCode} onChange={setField('postalCode')} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address-country" className="text-xs text-[var(--color-ink-muted)]">
            Country
          </label>
          <select
            id="address-country"
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

      <Field label="Phone (optional)" type="tel" value={form.phoneNumber} onChange={setField('phoneNumber')} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Saving…' : 'Continue to Shipping'}
      </button>
    </form>
  );
}

function Field({
  label,
  type = 'text',
  required,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const id = `address-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-[var(--color-ink-muted)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
      />
    </div>
  );
}
