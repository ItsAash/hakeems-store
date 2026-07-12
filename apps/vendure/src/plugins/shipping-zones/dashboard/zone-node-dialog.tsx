import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  MoneyInput,
  api,
  toast,
} from '@vendure/dashboard';
import { createShippingZoneNodeDocument, updateShippingZoneNodeDocument } from './shipping-zones.graphql.js';

export type ZoneNodeFormTarget =
  | { mode: 'create'; parentId: string | null; parentName: string | null; stockLocationId: string }
  | { mode: 'edit'; id: string; name: string; code: string; rate: number | null; enabled: boolean };

export function ZoneNodeDialog({
  target,
  onOpenChange,
  onSuccess,
}: {
  target: ZoneNodeFormTarget | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [rate, setRate] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!target) return;
    if (target.mode === 'edit') {
      setName(target.name);
      setCode(target.code);
      setRate(target.rate);
      setEnabled(target.enabled);
    } else {
      setName('');
      setCode('');
      setRate(null);
      setEnabled(true);
    }
  }, [target]);

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: api.mutate(createShippingZoneNodeDocument),
    onSuccess: () => {
      toast.success('Shipping zone created');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Failed to create zone'),
  });

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: api.mutate(updateShippingZoneNodeDocument),
    onSuccess: () => {
      toast.success('Shipping zone updated');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Failed to update zone'),
  });

  if (!target) return null;

  const handleSave = () => {
    if (target.mode === 'create') {
      create({
        input: {
          name,
          code,
          parentId: target.parentId,
          stockLocationId: target.parentId ? undefined : target.stockLocationId,
          rate,
          enabled,
        },
      });
    } else {
      update({ input: { id: target.id, name, code, rate, enabled } });
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {target.mode === 'edit' ? 'Edit shipping zone' : target.parentName ? 'Add shipping zone' : 'Add country zone'}
          </DialogTitle>
          <DialogDescription>
            {target.mode === 'create'
              ? target.parentName
                ? `New child of ${target.parentName}`
                : 'The root of this warehouse\'s zone tree, e.g. "Nepal" or "Hong Kong"'
              : 'Rename, re-price, or enable/disable this zone'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="zone-name">Name</Label>
            <Input id="zone-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kathmandu" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="zone-code">Code</Label>
            <Input
              id="zone-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. kathmandu"
            />
            <p className="text-muted-foreground text-xs">
              Must be unique among sibling zones. Matched (case-insensitively, against the name) when resolving
              shipping cost from an order's address.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>
              Rate
              <MoneyInput value={rate ?? 0} onChange={value => setRate(value)} />
            </Label>
            <p className="text-muted-foreground text-xs">
              Leave at 0 and instead add child zones below if this zone needs dividing further. A zone with no
              children should have a real rate here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="zone-enabled" checked={enabled} onCheckedChange={value => setEnabled(!!value)} />
            <Label htmlFor="zone-enabled">Enabled</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isCreating || isUpdating || !name || !code}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
