import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  NativeSelect,
  NativeSelectOption,
  api,
  toast,
} from '@vendure/dashboard';
import { stockLocationsForTransferDocument, transferVariantStockDocument } from './stock-overview.graphql.js';
import type { VariantStockRow } from './types.js';

export type TransferStockVariant = VariantStockRow;

export function TransferStockDialog({
  variant,
  open,
  onOpenChange,
  onSuccess,
}: {
  variant: TransferStockVariant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const { data: locationsData } = useQuery({
    queryKey: ['stock-locations-for-transfer'],
    queryFn: () => api.query(stockLocationsForTransferDocument),
    enabled: open,
  });
  const locations = locationsData?.stockLocations.items ?? [];

  useEffect(() => {
    if (!variant || !open) return;
    const sorted = [...variant.stockLevels].sort((a, b) => b.stockOnHand - a.stockOnHand);
    setFromLocationId(sorted[0]?.stockLocation.id ?? '');
    setToLocationId(sorted[1]?.stockLocation.id ?? locations[0]?.id ?? '');
    setQuantity('1');
  }, [variant, open]);

  const { mutate, isPending } = useMutation({
    mutationFn: api.mutate(transferVariantStockDocument),
    onSuccess: result => {
      if (result.transferStock.success) {
        toast.success(result.transferStock.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.transferStock.message);
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to transfer stock');
    },
  });

  if (!variant) return null;

  const sourceLevel = variant.stockLevels.find(level => level.stockLocation.id === fromLocationId);
  const availableAtSource = sourceLevel ? sourceLevel.stockOnHand - sourceLevel.stockAllocated : 0;

  const handleTransfer = () => {
    mutate({
      input: {
        productVariantId: variant.id,
        fromLocationId,
        toLocationId,
        quantity: Number(quantity),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Transfer stock</DialogTitle>
          <DialogDescription>
            {variant.name} · SKU {variant.sku}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="transfer-from">From warehouse</Label>
            <NativeSelect
              id="transfer-from"
              value={fromLocationId}
              onChange={e => setFromLocationId(e.target.value)}
            >
              {locations.map(location => (
                <NativeSelectOption key={location.id} value={location.id}>
                  {location.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="text-muted-foreground text-xs">{availableAtSource} unit(s) available here</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="transfer-to">To warehouse</Label>
            <NativeSelect id="transfer-to" value={toLocationId} onChange={e => setToLocationId(e.target.value)}>
              {locations
                .filter(location => location.id !== fromLocationId)
                .map(location => (
                  <NativeSelectOption key={location.id} value={location.id}>
                    {location.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="transfer-quantity">Quantity</Label>
            <Input
              id="transfer-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={isPending || !fromLocationId || !toLocationId || fromLocationId === toLocationId}
          >
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
