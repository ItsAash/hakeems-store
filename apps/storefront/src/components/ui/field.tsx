export function Field({
  label,
  idPrefix = 'field',
  type = 'text',
  required,
  disabled,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  idPrefix?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}) {
  const id = `${idPrefix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-[var(--color-ink-muted)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] disabled:bg-[var(--color-paper-raised)] disabled:text-[var(--color-ink-muted)]"
      />
    </div>
  );
}
