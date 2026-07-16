-- ============================================================================
-- Schema 1: vendure_data  — normalized product catalogue
-- Products · Variants (colour × size) · Images (per colour) · Inventory · Pricing
--
-- PostgreSQL best practices: surrogate identity PKs + natural unique keys, FKs with
-- explicit ON DELETE, CHECK constraints, enums for closed sets, composite uniques to
-- prevent duplicates, indexes on every FK/lookup, and updated_at triggers.
-- No secrets here — connection details come from environment variables at deploy time.
-- ============================================================================

create schema if not exists vendure_data;

-- ── Enums (closed value sets) ───────────────────────────────────────────────
create type vendure_data.currency_code   as enum ('NPR', 'HKD');
create type vendure_data.channel_code     as enum ('nepal', 'hongkong');
create type vendure_data.product_category as enum ('tops', 'bottoms', 'sets', 'accessories');
create type vendure_data.image_role       as enum ('front', 'macro', 'on_model', 'product');
create type vendure_data.collection_kind  as enum ('category', 'merchandising', 'spotlight');

-- ── Shared updated_at trigger ───────────────────────────────────────────────
create or replace function vendure_data.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Colour palette ──────────────────────────────────────────────────────────
create table vendure_data.color (
  id         bigint generated always as identity primary key,
  code       text not null unique,
  name       text not null,
  hex        char(7) not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

-- ── Size run ────────────────────────────────────────────────────────────────
create table vendure_data.size (
  id         bigint generated always as identity primary key,
  code       text not null unique,
  name       text not null,
  sort_order integer not null default 0
);

-- ── Facets (Categories, Activity, Material, …) ──────────────────────────────
create table vendure_data.facet (
  id   bigint generated always as identity primary key,
  code text not null unique,
  name text not null
);

create table vendure_data.facet_value (
  id       bigint generated always as identity primary key,
  facet_id bigint not null references vendure_data.facet (id) on delete cascade,
  code     text not null,
  name     text not null,
  unique (facet_id, code)
);
create index idx_facet_value_facet on vendure_data.facet_value (facet_id);

-- ── Collections (category + merchandising) ──────────────────────────────────
create table vendure_data.collection (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  kind        vendure_data.collection_kind not null default 'merchandising',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_collection_updated before update on vendure_data.collection
  for each row execute function vendure_data.set_updated_at();

-- ── Product (the sellable style) ────────────────────────────────────────────
create table vendure_data.product (
  id               bigint generated always as identity primary key,
  slug             text not null unique,
  sku_code         text not null unique,
  name             text not null,
  description      text,
  features         text[] not null default '{}',
  category         vendure_data.product_category not null,
  fabric           text,
  care             text,
  seo_title        text,
  seo_description  text,
  badge            text,
  discount_percent smallint check (discount_percent between 0 and 100),
  promo_label      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_product_category on vendure_data.product (category);
create trigger trg_product_updated before update on vendure_data.product
  for each row execute function vendure_data.set_updated_at();

-- ── Product ⇄ Facet value (activity, material, …) ───────────────────────────
create table vendure_data.product_facet_value (
  product_id     bigint not null references vendure_data.product (id) on delete cascade,
  facet_value_id bigint not null references vendure_data.facet_value (id) on delete cascade,
  primary key (product_id, facet_value_id)
);
create index idx_pfv_facet_value on vendure_data.product_facet_value (facet_value_id);

-- ── Product ⇄ Collection ────────────────────────────────────────────────────
create table vendure_data.product_collection (
  product_id    bigint not null references vendure_data.product (id) on delete cascade,
  collection_id bigint not null references vendure_data.collection (id) on delete cascade,
  position      integer not null default 0,
  primary key (product_id, collection_id)
);
create index idx_pc_collection on vendure_data.product_collection (collection_id);

-- ── Images (optionally tied to a colour for variant image-switching) ────────
create table vendure_data.product_image (
  id         bigint generated always as identity primary key,
  product_id bigint not null references vendure_data.product (id) on delete cascade,
  color_id   bigint references vendure_data.color (id) on delete set null,
  url        text not null,
  alt        text,
  role       vendure_data.image_role not null default 'product',
  position   integer not null default 0
);
create index idx_image_product on vendure_data.product_image (product_id);
create index idx_image_color on vendure_data.product_image (color_id);

-- ── Variant (one per colour × size) ─────────────────────────────────────────
create table vendure_data.product_variant (
  id         bigint generated always as identity primary key,
  product_id bigint not null references vendure_data.product (id) on delete cascade,
  color_id   bigint not null references vendure_data.color (id) on delete restrict,
  size_id    bigint not null references vendure_data.size (id) on delete restrict,
  sku        text not null unique,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color_id, size_id)
);
create index idx_variant_product on vendure_data.product_variant (product_id);
create index idx_variant_color on vendure_data.product_variant (color_id);
create trigger trg_variant_updated before update on vendure_data.product_variant
  for each row execute function vendure_data.set_updated_at();

-- ── Pricing (per currency / channel) ────────────────────────────────────────
create table vendure_data.variant_price (
  id           bigint generated always as identity primary key,
  variant_id   bigint not null references vendure_data.product_variant (id) on delete cascade,
  currency     vendure_data.currency_code not null,
  amount_minor integer not null check (amount_minor >= 0),  -- minor units (paisa / cents)
  unique (variant_id, currency)
);

-- ── Inventory (per channel warehouse) ───────────────────────────────────────
create table vendure_data.variant_inventory (
  id            bigint generated always as identity primary key,
  variant_id    bigint not null references vendure_data.product_variant (id) on delete cascade,
  channel       vendure_data.channel_code not null,
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  unique (variant_id, channel)
);
