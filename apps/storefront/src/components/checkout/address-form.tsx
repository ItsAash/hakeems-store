'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { setCustomerForOrderAction, setOrderShippingAddressAction } from '@/lib/vendure/actions';
import { Field } from '@/components/ui/field';

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
  defaultEmail,
  isLoggedIn = false,
}: {
  channelCode: ChannelCode;
  countries: Country[];
  defaultCountryCode: string;
  defaultEmail?: string;
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...emptyForm, countryCode: defaultCountryCode, email: defaultEmail ?? '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Vendure rejects setCustomerForOrder once the session is already authenticated —
    // the order's customer is implicitly the logged-in user, so only guests need this call.
    if (!isLoggedIn) {
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

      <Field
        idPrefix="address"
        label="Email"
        type="email"
        required
        disabled={isLoggedIn}
        value={form.email}
        onChange={setField('email')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field idPrefix="address" label="First name" required value={form.firstName} onChange={setField('firstName')} />
        <Field idPrefix="address" label="Last name" required value={form.lastName} onChange={setField('lastName')} />
      </div>

      <Field idPrefix="address" label="Address" required value={form.streetLine1} onChange={setField('streetLine1')} />
      <Field idPrefix="address" label="Apartment, suite, etc. (optional)" value={form.streetLine2} onChange={setField('streetLine2')} />

      <div className="grid grid-cols-2 gap-4">
        <Field idPrefix="address" label="City" required value={form.city} onChange={setField('city')} />
        <Field idPrefix="address" label="Province / State" required value={form.province} onChange={setField('province')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field idPrefix="address" label="Postal code" required value={form.postalCode} onChange={setField('postalCode')} />
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

      <Field idPrefix="address" label="Phone (optional)" type="tel" value={form.phoneNumber} onChange={setField('phoneNumber')} />

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
