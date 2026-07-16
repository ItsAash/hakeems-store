-- ============================================================================
-- Schema 2: cms_data  — content, SEO, collections & pages
-- Site settings + SEO defaults · Nav · Social/legal links · Collection editorial +
-- SEO · Homepage sections · Static (legal) pages · Brand story · Announcements
--
-- Same conventions as vendure_data: identity PKs + natural keys, enums, FKs with
-- ON DELETE, CHECK/unique constraints, indexes, updated_at triggers. Links to the
-- catalogue are by stable slug (e.g. vendure_collection_slug), not cross-schema FK,
-- so CMS and catalogue can evolve/scale independently.
-- ============================================================================

create schema if not exists cms_data;

create type cms_data.channel_code    as enum ('nepal', 'hongkong');
create type cms_data.section_type    as enum ('hero_slider', 'category_grid', 'product_rail', 'editorial_banner', 'brand_story');
create type cms_data.social_platform as enum ('instagram', 'tiktok', 'facebook', 'youtube', 'x', 'whatsapp');

create or replace function cms_data.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Site settings (single row, SEO defaults) ────────────────────────────────
create table cms_data.site_setting (
  id                      bigint generated always as identity primary key,
  is_singleton            boolean not null default true,
  site_name               text not null,
  tagline                 text,
  support_email           text,
  support_phone           text,
  footer_note             text,
  default_seo_title       text,
  default_seo_description text,
  default_og_image_url    text,
  updated_at              timestamptz not null default now(),
  constraint only_one_site_setting unique (is_singleton),
  constraint site_setting_singleton_true check (is_singleton is true)
);
create trigger trg_site_setting_updated before update on cms_data.site_setting
  for each row execute function cms_data.set_updated_at();

create table cms_data.social_link (
  id       bigint generated always as identity primary key,
  platform cms_data.social_platform not null,
  url      text not null,
  position integer not null default 0
);

create table cms_data.legal_link (
  id       bigint generated always as identity primary key,
  label    text not null,
  href     text not null,
  position integer not null default 0
);

-- ── Navigation (per channel, self-referencing tree) ─────────────────────────
create table cms_data.nav (
  id      bigint generated always as identity primary key,
  channel cms_data.channel_code not null unique
);

create table cms_data.nav_item (
  id        bigint generated always as identity primary key,
  nav_id    bigint not null references cms_data.nav (id) on delete cascade,
  parent_id bigint references cms_data.nav_item (id) on delete cascade,
  label     text not null,
  href      text not null,
  position  integer not null default 0
);
create index idx_nav_item_nav on cms_data.nav_item (nav_id);
create index idx_nav_item_parent on cms_data.nav_item (parent_id);

-- ── Collection editorial layer (keyed to catalogue by slug) ─────────────────
create table cms_data.collection_page (
  id                      bigint generated always as identity primary key,
  vendure_collection_slug text not null unique,
  title                   text not null,
  tagline                 text,
  description             text,           -- markdown
  hero_image_url          text,
  featured                boolean not null default false,
  sort_order              integer not null default 0,
  seo_title               text,
  seo_description         text,
  og_image_url            text,
  updated_at              timestamptz not null default now()
);
create index idx_collection_page_featured on cms_data.collection_page (featured);
create trigger trg_collection_page_updated before update on cms_data.collection_page
  for each row execute function cms_data.set_updated_at();

-- ── Static / legal pages (Privacy, Terms, Shipping & Returns, …) ────────────
create table cms_data.legal_page (
  id              bigint generated always as identity primary key,
  slug            text not null unique,
  title           text not null,
  content         text not null,          -- markdown
  seo_title       text,
  seo_description text,
  updated_at      timestamptz not null default now()
);
create trigger trg_legal_page_updated before update on cms_data.legal_page
  for each row execute function cms_data.set_updated_at();

-- ── Composable pages + homepage sections (dynamic zone) ─────────────────────
create table cms_data.page (
  id              bigint generated always as identity primary key,
  slug            text not null,
  channel         cms_data.channel_code not null,
  title           text,
  seo_title       text,
  seo_description text,
  updated_at      timestamptz not null default now(),
  unique (slug, channel)
);
create trigger trg_page_updated before update on cms_data.page
  for each row execute function cms_data.set_updated_at();

create table cms_data.page_section (
  id       bigint generated always as identity primary key,
  page_id  bigint not null references cms_data.page (id) on delete cascade,
  type     cms_data.section_type not null,
  position integer not null default 0,
  config   jsonb not null default '{}'::jsonb   -- slides/tiles/collection slug/copy per section type
);
create index idx_page_section_page on cms_data.page_section (page_id);

-- ── Brand story (global single row) ─────────────────────────────────────────
create table cms_data.brand_story (
  id           bigint generated always as identity primary key,
  is_singleton boolean not null default true,
  eyebrow      text,
  heading      text not null,
  image_url    text,
  paragraphs   text[] not null default '{}',
  updated_at   timestamptz not null default now(),
  constraint only_one_brand_story unique (is_singleton),
  constraint brand_story_singleton_true check (is_singleton is true)
);
create trigger trg_brand_story_updated before update on cms_data.brand_story
  for each row execute function cms_data.set_updated_at();

-- ── Announcement bar (per channel) ──────────────────────────────────────────
create table cms_data.announcement (
  id       bigint generated always as identity primary key,
  channel  cms_data.channel_code not null,
  text     text not null,
  href     text,
  enabled  boolean not null default true,
  position integer not null default 0
);
create index idx_announcement_channel on cms_data.announcement (channel);
