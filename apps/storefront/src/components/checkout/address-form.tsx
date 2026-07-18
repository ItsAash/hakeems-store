'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { setCheckoutAddressAction } from '@/lib/medusa/checkout-actions';
import { Field } from '@/components/ui/field';
import { ShippingZonePicker, resolveZoneAddressFields, type ZoneNode } from '@/components/checkout/shipping-zone-picker';

type ContactState = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

type AddressState = {
  streetLine1: string;
  postalCode: string;
};

const emptyContact: ContactState = { email: '', firstName: '', lastName: '', phoneNumber: '' };
const emptyAddress: AddressState = { streetLine1: '', postalCode: '' };

/**
 * Checkout address step.
 *
 * Contact fields pre-fill from the logged-in customer's saved data (first name, last name,
 * email) when available. Street address + postal code are free text; province/city/area are
 * driven entirely by the cascading ShippingZonePicker below, since the shipping-zone-fulfillment
 * provider matches those exact fields by name to price "Standard Shipping" (see
 * apps/medusa/src/modules/shipping-zone-fulfillment/service.ts) — free-text city/province
 * fields that don't match the zone tree exactly would silently price shipping at 0.
 */
export function AddressForm({
  channelCode,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  shippingZones,
  currencyCode,
}: {
  channelCode: ChannelCode;
  /** Guest email fallback (e.g. from a prior guest checkout). */
  defaultEmail?: string;
  /** Logged-in customer's saved name (if any). */
  defaultFirstName?: string;
  defaultLastName?: string;
  /** Logged-in customer's saved phone (if any). */
  defaultPhone?: string;
  /** This channel's shipping-zone tree — drives the delivery-zone picker below the address. */
  shippingZones: ZoneNode[];
  currencyCode: string;
}) {
  const router = useRouter();

  const [contact, setContact] = useState<ContactState>({
    ...emptyContact,
    email: defaultEmail ?? '',
    firstName: defaultFirstName ?? '',
    lastName: defaultLastName ?? '',
    phoneNumber: defaultPhone ?? '',
  });
  const [address, setAddress] = useState<AddressState>(emptyAddress);
  const [shippingZoneId, setShippingZoneId] = useState<string | null>(null);
  const zoneRequired = (shippingZones[0]?.children?.length ?? 0) > 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setContactField =
    (field: keyof ContactState) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setContact((current) => ({ ...current, [field]: event.target.value }));
  const setAddressField =
    (field: keyof AddressState) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setAddress((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (zoneRequired && !shippingZoneId) {
      setError('Please select a delivery zone.');
      setIsSubmitting(false);
      return;
    }

    const zoneFields = resolveZoneAddressFields(shippingZones, shippingZoneId);

    const result = await setCheckoutAddressAction(channelCode, {
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phoneNumber || undefined,
      address1: address.streetLine1,
      postalCode: address.postalCode || undefined,
      province: zoneFields.province,
      city: zoneFields.city,
      address2: zoneFields.area,
    });

    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

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
          value={contact.email}
          onChange={setContactField('email')}
          autoComplete="email"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="flex flex-col gap-5">
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
            label="Postal code (optional)"
            value={address.postalCode}
            onChange={setAddressField('postalCode')}
            autoComplete="postal-code"
          />
        </div>

        {zoneRequired && (
          <ShippingZonePicker
            zones={shippingZones}
            value={shippingZoneId}
            onChange={setShippingZoneId}
            currencyCode={currencyCode}
          />
        )}
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || (zoneRequired && !shippingZoneId)}
        className="mt-1 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-label text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Saving…' : 'Continue to Shipping'}
      </button>
    </form>
  );
}
