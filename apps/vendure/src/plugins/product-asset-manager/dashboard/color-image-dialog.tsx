import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from '@vendure/dashboard';
import { Check, ImageOff } from 'lucide-react';

export type PickerAsset = { id: string; name: string; preview: string };

/**
 * Modal for choosing which of the product's images apply to a given color. On
 * apply, the selected image ids are pushed to every variant of that color.
 */
export function ColorImageDialog({
  open,
  onOpenChange,
  colorName,
  variantCount,
  assets,
  initialSelectedIds,
  isPending,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colorName: string;
  variantCount: number;
  assets: PickerAsset[];
  initialSelectedIds: string[];
  isPending: boolean;
  onApply: (selectedIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);

  // Re-seed the selection whenever the dialog is (re)opened for a color.
  useEffect(() => {
    if (open) setSelected(initialSelectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, colorName]);

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Images for {colorName}</DialogTitle>
          <DialogDescription>
            Selected images are applied to all {variantCount} {colorName} variant
            {variantCount === 1 ? '' : 's'}. The first selected image becomes their thumbnail.
          </DialogDescription>
        </DialogHeader>

        {assets.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-sm">
            <ImageOff className="h-6 w-6" />
            Upload product images first, then assign them here.
          </div>
        ) : (
          <div className="grid max-h-[46vh] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4">
            {assets.map(asset => {
              const idx = selected.indexOf(asset.id);
              const isSelected = idx !== -1;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggle(asset.id)}
                  className={cn(
                    'relative aspect-square overflow-hidden rounded-md border-2 transition',
                    isSelected ? 'border-primary' : 'border-transparent hover:border-border',
                  )}
                >
                  <img src={asset.preview} alt={asset.name} className="h-full w-full object-cover" />
                  {isSelected && (
                    <span className="bg-primary text-primary-foreground absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold">
                      {idx === 0 ? <Check className="h-3 w-3" /> : idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter className="items-center justify-between sm:justify-between">
          <span className="text-muted-foreground text-xs">{selected.length} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={() => onApply(selected)} disabled={isPending}>
              Apply to {colorName}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
