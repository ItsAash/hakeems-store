import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MoreHorizontal, PlusIcon, Warehouse } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FullWidthPageBlock,
  Label,
  NativeSelect,
  NativeSelectOption,
  Page,
  PageActionBar,
  PageActionBarRight,
  PageLayout,
  PageTitle,
  api,
  toast,
} from '@vendure/dashboard';
import {
  deleteShippingZoneNodeDocument,
  shippingZoneTreeDocument,
  stockLocationsDocument,
} from './shipping-zones.graphql.js';
import { ZoneNodeDialog, ZoneNodeFormTarget } from './zone-node-dialog.js';

type ZoneNode = {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  rate: number | null;
  parentId: string | null;
  children: ZoneNode[];
};

function formatRate(node: ZoneNode, currencyCode: string | undefined): { label: string; muted: boolean } {
  if (node.rate != null) {
    const formatted = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode || 'USD',
      maximumFractionDigits: currencyCode === 'NPR' ? 0 : 2,
    }).format(node.rate / 100);
    return { label: formatted, muted: false };
  }
  if ((node.children ?? []).length > 0) {
    return { label: 'Subdivided below', muted: true };
  }
  return { label: 'No rate set', muted: true };
}

function ZoneRow({
  node,
  depth,
  currencyCode,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: ZoneNode;
  depth: number;
  currencyCode: string | undefined;
  onAddChild: (node: ZoneNode) => void;
  onEdit: (node: ZoneNode) => void;
  onDelete: (node: ZoneNode) => void;
}) {
  const { label, muted } = formatRate(node, currencyCode);
  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0" style={{ paddingLeft: depth * 24 }}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-medium">{node.name}</span>
          <span className="text-muted-foreground text-xs">{node.code}</span>
          {!node.enabled && <Badge variant="secondary">Disabled</Badge>}
          {depth === 0 && <Badge variant="outline">Country</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className={muted ? 'text-muted-foreground text-sm' : 'text-sm font-medium'}>{label}</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddChild(node)}>Add child zone</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(node)}>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(node)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {(node.children ?? []).map(child => (
        <ZoneRow
          key={child.id}
          node={child}
          depth={depth + 1}
          currencyCode={currencyCode}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export function ShippingZonesPage() {
  const [stockLocationId, setStockLocationId] = useState<string>('');
  const [formTarget, setFormTarget] = useState<ZoneNodeFormTarget | null>(null);
  const [deletingNode, setDeletingNode] = useState<ZoneNode | null>(null);

  const { data: locationsData } = useQuery({
    queryKey: ['shipping-zones-stock-locations'],
    queryFn: () => api.query(stockLocationsDocument),
  });
  const stockLocations = locationsData?.stockLocations.items ?? [];

  useEffect(() => {
    if (!stockLocationId && stockLocations.length > 0) {
      setStockLocationId(stockLocations[0].id);
    }
  }, [stockLocations, stockLocationId]);

  const { data, refetch } = useQuery({
    queryKey: ['shipping-zone-tree', stockLocationId],
    queryFn: () => api.query(shippingZoneTreeDocument, { stockLocationId }),
    enabled: !!stockLocationId,
  });

  const tree = (data?.shippingZoneTree ?? []) as ZoneNode[];
  const hasRoot = tree.length > 0;
  const selectedLocation = stockLocations.find(location => location.id === stockLocationId);
  const currencyCode = selectedLocation?.channels[0]?.defaultCurrencyCode;

  const { mutate: deleteNode } = useMutation({
    mutationFn: api.mutate(deleteShippingZoneNodeDocument),
    onSuccess: () => {
      toast.success('Shipping zone deleted');
      setDeletingNode(null);
      refetch();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Failed to delete zone'),
  });

  return (
    <Page pageId="shipping-zones">
      <PageTitle>Shipping Zones</PageTitle>
      <PageActionBar>
        <PageActionBarRight>
          {!hasRoot && stockLocationId && (
            <Button
              onClick={() => setFormTarget({ mode: 'create', parentId: null, parentName: null, stockLocationId })}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add country zone
            </Button>
          )}
        </PageActionBarRight>
      </PageActionBar>
      <PageLayout>
        <FullWidthPageBlock blockId="zone-tree">
          <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
            Each warehouse ships to one country, structured as a single root zone with as many nested levels
            beneath it as you need — province, then city, then area, or however deep a given branch requires.
          </p>
          <div className="mb-6 flex items-center gap-3">
            <Warehouse className="text-muted-foreground size-4" />
            <Label htmlFor="stock-location-select" className="shrink-0">
              Warehouse
            </Label>
            <NativeSelect
              id="stock-location-select"
              className="max-w-xs"
              value={stockLocationId}
              onChange={e => setStockLocationId(e.target.value)}
            >
              {stockLocations.map(location => (
                <NativeSelectOption key={location.id} value={location.id}>
                  {location.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {!stockLocationId ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No stock locations found.</p>
          ) : !hasRoot ? (
            <div className="rounded-md border border-dashed py-12 text-center">
              <p className="text-sm font-medium">{selectedLocation?.name} doesn't ship anywhere yet</p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                Add its country zone (e.g. "Nepal") to get started, then build out provinces, cities, and areas
                beneath it.
              </p>
            </div>
          ) : (
            <div className="rounded-md border px-4">
              {tree.map(root => (
                <ZoneRow
                  key={root.id}
                  node={root}
                  depth={0}
                  currencyCode={currencyCode}
                  onAddChild={node => setFormTarget({ mode: 'create', parentId: node.id, parentName: node.name, stockLocationId })}
                  onEdit={node =>
                    setFormTarget({
                      mode: 'edit',
                      id: node.id,
                      name: node.name,
                      code: node.code,
                      rate: node.rate,
                      enabled: node.enabled,
                    })
                  }
                  onDelete={node => setDeletingNode(node)}
                />
              ))}
            </div>
          )}
        </FullWidthPageBlock>
      </PageLayout>
      <ZoneNodeDialog
        target={formTarget}
        onOpenChange={open => !open && setFormTarget(null)}
        onSuccess={() => refetch()}
      />
      <AlertDialog open={!!deletingNode} onOpenChange={open => !open && setDeletingNode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shipping zone</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingNode && (deletingNode.children ?? []).length > 0
                ? `This will also delete all ${(deletingNode.children ?? []).length} child zone(s) beneath "${deletingNode.name}".`
                : `Delete "${deletingNode?.name}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingNode(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingNode && deleteNode({ id: deletingNode.id })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
