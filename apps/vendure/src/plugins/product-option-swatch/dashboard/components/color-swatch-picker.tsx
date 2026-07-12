import {
  Button,
  cn,
  DashboardFormComponent,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useFormContext,
} from '@vendure/dashboard';

const PRESET_SWATCHES: Array<{ label: string; hex: string }> = [
  { label: 'Black', hex: '#000000' },
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Charcoal', hex: '#36454F' },
  { label: 'Olive', hex: '#708238' },
  { label: 'Sand', hex: '#C2B280' },
  { label: 'Clay', hex: '#B66A50' },
  { label: 'Navy', hex: '#1A365D' },
  { label: 'Red', hex: '#E53E3E' },
  { label: 'Blue', hex: '#3182CE' },
  { label: 'Green', hex: '#38A169' },
  { label: 'Yellow', hex: '#ECC94B' },
  { label: 'Purple', hex: '#805AD5' },
];

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const ColorSwatchPickerComponent: DashboardFormComponent = ({ value, onChange, onBlur, name, disabled }) => {
  const { getFieldState } = useFormContext();
  const error = getFieldState(name).error;
  const isValidHex = typeof value === 'string' && HEX_PATTERN.test(value);

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              className={cn('h-9 w-9 shrink-0 border-2 p-0', error && 'border-destructive')}
              style={{ backgroundColor: isValidHex ? value : 'transparent' }}
            />
          }
        />
        <PopoverContent className="w-56" align="start">
          <div className="grid grid-cols-6 gap-2">
            {PRESET_SWATCHES.map(swatch => (
              <button
                key={swatch.hex}
                type="button"
                title={swatch.label}
                onClick={() => onChange(swatch.hex)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 border-transparent hover:border-ring',
                  value === swatch.hex && 'border-ring',
                )}
                style={{ backgroundColor: swatch.hex }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Input
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder="#RRGGBB"
        className="font-mono"
      />
    </div>
  );
};
