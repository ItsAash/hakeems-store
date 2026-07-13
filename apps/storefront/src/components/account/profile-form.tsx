'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelCode } from '@/lib/channel';
import { updateCustomerAction } from '@/lib/vendure/auth-actions';
import { Field } from '@/components/ui/field';

export function ProfileForm({
  channelCode,
  emailAddress,
  firstName,
  lastName,
  phoneNumber,
}: {
  channelCode: ChannelCode;
  emailAddress: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName, lastName, phoneNumber });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await updateCustomerAction(channelCode, form);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[var(--color-ink-muted)]">Email</label>
        <p className="border border-[var(--color-hairline)] bg-[var(--color-paper-raised)] px-3 py-2.5 text-sm text-[var(--color-ink-muted)]">
          {emailAddress}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field idPrefix="profile" label="First name" required value={form.firstName} onChange={setField('firstName')} />
        <Field idPrefix="profile" label="Last name" required value={form.lastName} onChange={setField('lastName')} />
      </div>
      <Field idPrefix="profile" label="Phone" type="tel" value={form.phoneNumber} onChange={setField('phoneNumber')} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-[var(--color-ink)]">Saved.</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
