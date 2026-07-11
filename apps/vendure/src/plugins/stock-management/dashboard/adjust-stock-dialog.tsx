import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
  api,
  toast,
} from '@vendure/dashboard';
import { adjustVariantStockDocument } from './stock-overview.graphql.js';
import type { VariantStockRow } from './types.js';

export type AdjustStockVariant = VariantStockRow;

export function AdjustStockDialog({
  variant,
  open,
  onOpenChange,
  onSuccess,
}: {
  variant: AdjustStockVariant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!variant) return;
    setValues(
      Object.fromEntries(variant.stockLevels.map(level => [level.stockLocation.id, String(level.stockOnHand)])),
    );
  }, [variant]);

  const { mutate, isPending } = useMutation({
    mutationFn: api.mutate(adjustVariantStockDocument),
    onSuccess: () => {
      toast.success(`Updated stock for ${variant?.sku}`);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update stock');
    },
  });

  if (!variant) return null;

  const handleSave = () => {
    const stockLevels = variant.stockLevels.map(level => ({
      stockLocationId: level.stockLocation.id,
      stockOnHand: Number(values[level.stockLocation.id] ?? level.stockOnHand),
    }));
    mutate({ input: [{ id: variant.id, stockLevels }] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {variant.name} · SKU {variant.sku}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {variant.stockLevels.map(level => (
            <div key={level.stockLocation.id} className="grid gap-1.5">
              <Label htmlFor={`stock-${level.stockLocation.id}`}>{level.stockLocation.name}</Label>
              <Input
                id={`stock-${level.stockLocation.id}`}
                type="number"
                min={0}
                value={values[level.stockLocation.id] ?? ''}
                onChange={e =>
                  setValues(prev => ({ ...prev, [level.stockLocation.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
