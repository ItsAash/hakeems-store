import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, api, cn, toast } from '@vendure/dashboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, ImageOff, Images, Loader2, Star, Upload, X } from 'lucide-react';
import { ColorImageDialog } from './color-image-dialog.js';
import {
  createProductAssetsDocument,
  productAssetManagerDocument,
  updateProductAssetPoolDocument,
  updateVariantAssetsDocument,
} from './asset-manager.graphql.js';

type BlockContext = { entity?: { id?: string } | null };

type ProductData = NonNullable<
  Awaited<ReturnType<typeof loadProduct>>
>;

// Helper purely for type inference of the query result shape.
function loadProduct(id: string) {
  return api.query(productAssetManagerDocument, { id });
}

export function ProductAssetManagerBlock({ context }: { context: BlockContext }) {
  const productId = context.entity?.id;
  const queryClient = useQueryClient();

  const queryKey = ['product-asset-manager', productId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => loadProduct(productId!),
    enabled: !!productId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const product = data?.product ?? null;

  if (!productId) return null;

  return (
    <div className="space-y-6">
      <MediaSection product={product} isLoading={isLoading} onChanged={invalidate} />
      <ColorAssignmentSection product={product} onChanged={invalidate} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media pool: upload, reorder, featured, remove                       */
/* ------------------------------------------------------------------ */

function MediaSection({
  product,
  isLoading,
  onChanged,
}: {
  product: ProductData['product'] | null;
  isLoading: boolean;
  onChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const assets = product?.assets ?? [];
  const featuredId = product?.featuredAsset?.id ?? null;
  const assetById = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);

  // Keep a local order so drag feels instant; re-seed from the server on load.
  useEffect(() => {
    setOrder(assets.map(a => a.id));
  }, [product?.id, assets.map(a => a.id).join(',')]);

  const createAssets = useMutation({ mutationFn: api.mutate(createProductAssetsDocument) });
  const updateProduct = useMutation({ mutationFn: api.mutate(updateProductAssetPoolDocument) });

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length || !product) return;
    const files = Array.from(fileList);
    setIsUploading(true);
    try {
      const result = await createAssets.mutateAsync({ input: files.map(file => ({ file })) });
      const newIds: string[] = [];
      for (const entry of result.createAssets) {
        if ('id' in entry) newIds.push(entry.id);
        else if ('message' in entry) toast.error(entry.message);
      }
      if (!newIds.length) return;
      await updateProduct.mutateAsync({
        input: {
          id: product.id,
          assetIds: [...order, ...newIds],
          featuredAssetId: featuredId ?? newIds[0],
        },
      });
      toast.success(`Uploaded ${newIds.length} image${newIds.length === 1 ? '' : 's'}`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function persistPool(nextOrder: string[], nextFeatured: string | null) {
    if (!product) return;
    try {
      await updateProduct.mutateAsync({
        input: { id: product.id, assetIds: nextOrder, featuredAssetId: nextFeatured },
      });
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update images');
      setOrder(assets.map(a => a.id)); // roll back optimistic order
    }
  }

  function handleSetFeatured(assetId: string) {
    if (!product || assetId === featuredId) return;
    persistPool(order, assetId);
  }

  function handleRemove(assetId: string) {
    if (!product) return;
    const nextOrder = order.filter(id => id !== assetId);
    setOrder(nextOrder);
    const nextFeatured = featuredId === assetId ? (nextOrder[0] ?? null) : featuredId;
    persistPool(nextOrder, nextFeatured);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    setDragId(null);
    setOrder(next);
    persistPool(next, featuredId);
  }

  const orderedAssets = order.map(id => assetById.get(id)).filter((a): a is (typeof assets)[number] => !!a);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Images className="h-4 w-4" /> Media
          <span className="text-muted-foreground font-normal">({assets.length})</span>
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
        <Button type="button" variant="secondary" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload images
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
        </div>
      ) : orderedAssets.length === 0 ? (
        <label
          className="text-muted-foreground flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed py-10 text-sm hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageOff className="h-6 w-6" />
          No images yet — upload some to get started.
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {orderedAssets.map(asset => {
            const isFeatured = asset.id === featuredId;
            return (
              <div
                key={asset.id}
                draggable
                onDragStart={() => setDragId(asset.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(asset.id)}
                className={cn(
                  'group bg-card relative overflow-hidden rounded-md border',
                  dragId === asset.id && 'opacity-50',
                )}
              >
                <div className="bg-muted relative aspect-square">
                  <img src={asset.preview} alt={asset.name} className="h-full w-full object-cover" loading="lazy" />
                  <span className="bg-background/70 text-muted-foreground absolute left-1 top-1 cursor-grab rounded p-1 opacity-0 transition group-hover:opacity-100">
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                  <button
                    type="button"
                    title={isFeatured ? 'Thumbnail' : 'Set as thumbnail'}
                    onClick={() => handleSetFeatured(asset.id)}
                    className={cn(
                      'absolute right-1 top-1 rounded-full p-1.5 transition',
                      isFeatured
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground',
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', isFeatured && 'fill-current')} />
                  </button>
                  <button
                    type="button"
                    title="Remove from product"
                    onClick={() => handleRemove(asset.id)}
                    className="bg-background/80 text-muted-foreground hover:text-destructive absolute bottom-1 right-1 rounded-full p-1.5 opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {isFeatured && (
                    <Badge className="absolute bottom-1 left-1" variant="default">
                      Thumbnail
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Color assignment: apply product images to all variants of a color   */
/* ------------------------------------------------------------------ */

function ColorAssignmentSection({
  product,
  onChanged,
}: {
  product: ProductData['product'] | null;
  onChanged: () => void;
}) {
  const [openValueId, setOpenValueId] = useState<string | null>(null);
  const updateVariants = useMutation({ mutationFn: api.mutate(updateVariantAssetsDocument) });

  const optionGroups = product?.optionGroups ?? [];
  const variants = product?.variants ?? [];
  const assets = product?.assets ?? [];

  // The group most likely to represent color; otherwise the first option group.
  const colorGroup = useMemo(() => {
    if (!optionGroups.length) return null;
    return (
      optionGroups.find(g => /colou?r/i.test(g.code) || /colou?r/i.test(g.name)) ?? optionGroups[0]
    );
  }, [optionGroups]);

  if (!colorGroup || variants.length === 0) return null;

  const assetById = new Map(assets.map(a => [a.id, a]));
  const openValue = colorGroup.options.find(o => o.id === openValueId) ?? null;

  const variantsForValue = (valueId: string) =>
    variants.filter(v => v.options.some(o => o.id === valueId));

  // Representative current selection for a color = the assets of its first variant.
  const selectionForValue = (valueId: string): string[] => {
    const first = variantsForValue(valueId)[0];
    return (first?.assets ?? []).map(a => a.id);
  };

  async function handleApply(valueId: string, selectedIds: string[]) {
    const targetVariants = variantsForValue(valueId);
    if (!targetVariants.length) return;
    try {
      await updateVariants.mutateAsync({
        input: targetVariants.map(v => ({
          id: v.id,
          assetIds: selectedIds,
          featuredAssetId: selectedIds[0] ?? null,
        })),
      });
      const name = colorGroup!.options.find(o => o.id === valueId)?.name ?? 'color';
      toast.success(`Applied ${selectedIds.length} image(s) to ${targetVariants.length} ${name} variant(s)`);
      setOpenValueId(null);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign images');
    }
  }

  return (
    <div className="space-y-3 border-t pt-5">
      <div>
        <h3 className="text-sm font-medium">Assign images by {colorGroup.name.toLowerCase()}</h3>
        <p className="text-muted-foreground text-xs">
          Pick which product images show for each {colorGroup.name.toLowerCase()} — applied to all
          matching variants at once.
        </p>
      </div>

      <div className="divide-y rounded-md border">
        {colorGroup.options.map(option => {
          const count = variantsForValue(option.id).length;
          const currentIds = selectionForValue(option.id);
          const thumbs = currentIds.map(id => assetById.get(id)).filter(Boolean).slice(0, 5);
          return (
            <div key={option.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{option.name}</div>
                <div className="text-muted-foreground text-xs">
                  {count} variant{count === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {thumbs.length === 0 ? (
                    <span className="text-muted-foreground text-xs">No images</span>
                  ) : (
                    thumbs.map(
                      asset =>
                        asset && (
                          <img
                            key={asset.id}
                            src={asset.preview}
                            alt={asset.name}
                            className="border-background h-8 w-8 rounded-md border-2 object-cover"
                          />
                        ),
                    )
                  )}
                  {currentIds.length > 5 && (
                    <span className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-md border-2 border-background text-[10px]">
                      +{currentIds.length - 5}
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenValueId(option.id)}>
                  Assign images
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {openValue && (
        <ColorImageDialog
          open={!!openValueId}
          onOpenChange={open => setOpenValueId(open ? openValueId : null)}
          colorName={openValue.name}
          variantCount={variantsForValue(openValue.id).length}
          assets={assets.map(a => ({ id: a.id, name: a.name, preview: a.preview }))}
          initialSelectedIds={selectionForValue(openValue.id)}
          isPending={updateVariants.isPending}
          onApply={selectedIds => handleApply(openValue.id, selectedIds)}
        />
      )}
    </div>
  );
}
