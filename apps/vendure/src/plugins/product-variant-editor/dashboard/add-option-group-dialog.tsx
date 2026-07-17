import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@vendure/dashboard';

/**
 * Collects a new option group name (e.g. "Color") and its values (e.g. "Black, Olive,
 * Sand"). Parsing splits on commas or newlines.
 */
export function AddOptionGroupDialog({
  open,
  onOpenChange,
  isPending,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onCreate: (name: string, values: string[]) => void;
}) {
  const [name, setName] = useState('');
  const [valuesText, setValuesText] = useState('');

  const values = valuesText
    .split(/[\n,]/)
    .map(v => v.trim())
    .filter(Boolean);

  function reset() {
    setName('');
    setValuesText('');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add option</DialogTitle>
          <DialogDescription>
            Create an option like Color or Size and list its values. Variants are generated from
            every combination.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="option-group-name">Option name</Label>
            <Input
              id="option-group-name"
              value={name}
              placeholder="Color"
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="option-group-values">Values</Label>
            <textarea
              id="option-group-values"
              value={valuesText}
              placeholder="Black, Olive, Sand"
              onChange={e => setValuesText(e.target.value)}
              className="border-input bg-background min-h-[80px] rounded-md border px-3 py-2 text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Separate values with commas or new lines. {values.length} value
              {values.length === 1 ? '' : 's'} detected.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreate(name.trim(), values)}
            disabled={isPending || !name.trim() || values.length === 0}
          >
            Add option
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
