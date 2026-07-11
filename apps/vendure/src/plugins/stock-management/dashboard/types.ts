export type StockLevelRow = {
  stockOnHand: number;
  stockAllocated: number;
  stockLocation: { id: string; name: string };
};

export type VariantStockRow = {
  id: string;
  sku: string;
  name: string;
  product: { name: string };
  stockLevels: StockLevelRow[];
};
