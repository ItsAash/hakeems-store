export interface MedusaCalculatedPrice {
  calculated_amount: number;
  original_amount: number;
  currency_code: string;
  is_calculated_price_tax_inclusive: boolean;
}

export interface MedusaProductImage {
  id: string;
  url: string;
  rank: number;
}

export interface MedusaProductOptionValue {
  id: string;
  value: string;
  option?: {
    id: string;
    title: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}

export interface MedusaProductOption {
  id: string;
  title: string;
  values?: MedusaProductOptionValue[];
}

export interface MedusaProductVariant {
  id: string;
  title: string | null;
  sku: string | null;
  barcode: string | null;
  inventory_quantity: number | null;
  allow_backorder: boolean;
  manage_inventory: boolean;
  options: MedusaProductOptionValue[] | null;
  images: MedusaProductImage[] | null;
  calculated_price?: MedusaCalculatedPrice | null;
  product_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MedusaProductCollection {
  id: string;
  title: string;
  handle: string;
}

export interface MedusaProductCategory {
  id: string;
  name: string;
  handle: string;
  parent_category_id: string | null;
  category_children: MedusaProductCategory[] | null;
}

export interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  thumbnail: string | null;
  status: string;
  images: MedusaProductImage[] | null;
  options: MedusaProductOption[] | null;
  variants: MedusaProductVariant[] | null;
  collection?: MedusaProductCollection | null;
  categories?: MedusaProductCategory[] | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MedusaProductListResponse {
  products: MedusaProduct[];
  count: number;
  offset: number;
  limit: number;
}

export interface MedusaProductResponse {
  product: MedusaProduct;
}

export interface MedusaCollection {
  id: string;
  title: string;
  handle: string;
}

export interface MedusaCollectionListResponse {
  collections: MedusaCollection[];
  count: number;
  offset: number;
  limit: number;
}

export interface MedusaCategory {
  id: string;
  name: string;
  handle: string;
  parent_category_id: string | null;
  category_children: MedusaCategory[] | null;
}

export interface MedusaCategoryListResponse {
  product_categories: MedusaCategory[];
}
