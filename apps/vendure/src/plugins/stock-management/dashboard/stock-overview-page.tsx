import { useRef, useState } from 'react';
import { AnyRoute } from '@tanstack/react-router';
import { Badge, ListPage } from '@vendure/dashboard';
import { stockOverviewListDocument } from './stock-overview.graphql.js';
import { AdjustStockDialog } from './adjust-stock-dialog.js';
import { TransferStockDialog } from './transfer-stock-dialog.js';
import type { VariantStockRow } from './types.js';

const LOW_STOCK_THRESHOLD = 5;

type VariantRow = VariantStockRow;

function StockLevelBadges({ stockLevels }: { stockLevels: VariantRow['stockLevels'] }) {
  if (stockLevels.length === 0) {
    return <span className="text-muted-foreground text-xs">No stock locations</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {stockLevels.map(level => {
        const available = level.stockOnHand - level.stockAllocated;
        const variant = available <= 0 ? 'destructive' : available <= LOW_STOCK_THRESHOLD ? 'secondary' : 'outline';
        return (
          <Badge key={level.stockLocation.id} variant={variant as any}>
            {level.stockLocation.name}: {available}
          </Badge>
        );
      })}
    </div>
  );
}

export function StockOverviewPage({ route }: { route: AnyRoute }) {
  const [adjustingVariant, setAdjustingVariant] = useState<VariantRow | null>(null);
  const [transferringVariant, setTransferringVariant] = useState<VariantRow | null>(null);
  const refreshRef = useRef<() => void>(() => {});

  return (
    <>
      <ListPage
        pageId="stock-overview-list"
        title="Stock Overview"
        listQuery={stockOverviewListDocument}
        route={route}
        registerRefresher={fn => {
          refreshRef.current = fn;
        }}
        onSearchTermChange={searchTerm => ({
          sku: { contains: searchTerm },
        })}
        customizeColumns={{
          sku: {
            header: 'SKU',
          },
          name: {
            header: 'Variant',
          },
          product: {
            header: 'Product',
            cell: ({ row }) => (row.original as VariantRow).product.name,
          },
          stockLevels: {
            header: 'Stock by Warehouse',
            cell: ({ row }) => <StockLevelBadges stockLevels={(row.original as VariantRow).stockLevels} />,
          },
          trackInventory: {
            meta: { disabled: true },
          },
        }}
        defaultColumnOrder={['sku', 'name', 'product', 'stockLevels']}
        rowActions={[
          {
            label: 'Adjust stock',
            onClick: row => setAdjustingVariant(row.original as VariantRow),
          },
          {
            label: 'Transfer stock',
            onClick: row => setTransferringVariant(row.original as VariantRow),
          },
        ]}
      />
      <AdjustStockDialog
        variant={adjustingVariant}
        open={!!adjustingVariant}
        onOpenChange={open => !open && setAdjustingVariant(null)}
        onSuccess={() => refreshRef.current()}
      />
      <TransferStockDialog
        variant={transferringVariant}
        open={!!transferringVariant}
        onOpenChange={open => !open && setTransferringVariant(null)}
        onSuccess={() => refreshRef.current()}
      />
    </>
  );
}
