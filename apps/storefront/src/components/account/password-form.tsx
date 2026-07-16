'use client';

import { useState } from 'react';
import type { ChannelCode } from '@/lib/channel';
import { updateCustomerPasswordAction } from '@/lib/vendure/auth-actions';
import { Field } from '@/components/ui/field';

export function PasswordForm({ channelCode }: { channelCode: ChannelCode }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
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

    const result = await updateCustomerPasswordAction(channelCode, form);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setForm({ currentPassword: '', newPassword: '' });
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field
        idPrefix="password"
        label="Current password"
        type="password"
        required
        value={form.currentPassword}
        onChange={setField('currentPassword')}
        autoComplete="current-password"
      />
      <Field
        idPrefix="password"
        label="New password"
        type="password"
        required
        value={form.newPassword}
        onChange={setField('newPassword')}
        autoComplete="new-password"
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-[var(--color-ink)]">Password updated.</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[var(--color-ink)] py-4 text-sm font-medium tracking-[0.1em] text-[var(--color-paper)] uppercase transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? 'Saving…' : 'Update Password'}
      </button>
    </form>
  );
}
