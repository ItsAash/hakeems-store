/**
 * Persona taxonomy — the single source of truth for the premium activewear catalogue
 * (Athleta / GAP house style). Both the Vendure seed (`apps/vendure/scripts/seed.ts`) and the
 * production orchestrator (`scripts/seed-production.ts`) import from here so the facet trees,
 * size run, colour palette and imagery are defined in exactly one reviewable place.
 *
 * Nothing here touches a database — it is plain data. Editing a value here changes what the
 * seed writes on its next run.
 */

// ── Size run ──────────────────────────────────────────────────────────────────
// Apparel sizes span XS–XXL (the brief's "XS to XXL"); one-size goods (bags, caps) use ONE_SIZE.
export const SIZES_APPAREL = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export const SIZES_ONE = ['One Size'] as const;
/** Every size value the `size` option group must contain. */
export const SIZE_OPTION_VALUES = [...SIZES_APPAREL, ...SIZES_ONE];

// ── Colour palette ────────────────────────────────────────────────────────────
// Each colour carries a hex swatch (rendered as the dot on product cards) and a gallery of
// three shots — front view, textile macro, and on-model — as the brief specifies. Codes are
// derived by lowercasing + hyphenating the name (matches the seed's optionCode()).
export type PersonaColor = {
  name: string;
  code: string;
  hex: string;
  /** [front, macro, onModel] — full production galleries per colour. */
  gallery: [string, string, string];
};

const u = (id: string) => `https://images.unsplash.com/${id}?w=1200&h=1500&fit=crop&q=80&fm=jpg`;

export const COLORS: PersonaColor[] = [
  // Core neutrals (retained from the original catalogue).
  { name: 'Onyx', code: 'onyx', hex: '#1c1c1c', gallery: [u('photo-1583743814966-8936f5b7be1a'), u('photo-1618354691373-d851c5c3a990'), u('photo-1521572163474-6864f9cf17ab')] },
  { name: 'Chalk', code: 'chalk', hex: '#f4f1ea', gallery: [u('photo-1521572163474-6864f9cf17ab'), u('photo-1620799140408-edc6dcb6d633'), u('photo-1503341504253-dff4815485f1')] },
  { name: 'Soft Sage', code: 'soft-sage', hex: '#a7b0a0', gallery: [u('photo-1552902865-b72c031ac5ea'), u('photo-1618354691373-d851c5c3a990'), u('photo-1591047139829-d91aecb6caea')] },
  { name: 'Sandstone', code: 'sandstone', hex: '#d8c6a5', gallery: [u('photo-1516762689617-e1cffcef479d'), u('photo-1620799140408-edc6dcb6d633'), u('photo-1594633312681-425c7b97ccd1')] },
  { name: 'Espresso', code: 'espresso', hex: '#4b3a2f', gallery: [u('photo-1591047139829-d91aecb6caea'), u('photo-1624378439575-d8705ad7ae80'), u('photo-1571945153237-4929e783af4a')] },
  { name: 'Slate', code: 'slate', hex: '#3f4042', gallery: [u('photo-1624378439575-d8705ad7ae80'), u('photo-1556905055-8f358a7a47b2'), u('photo-1618354691373-d851c5c3a990')] },
];

/** Hex swatch map keyed by colour code (consumed by the seed's COLOR_SWATCHES). */
export const COLOR_SWATCH_HEX: Record<string, string> = Object.fromEntries(COLORS.map((c) => [c.code, c.hex]));

/** Per-colour gallery (front/macro/on-model) keyed by colour code (consumed by COLOR_IMAGE_URLS). */
export const COLOR_GALLERY: Record<string, string[]> = Object.fromEntries(COLORS.map((c) => [c.code, c.gallery]));

// ── Facet trees ───────────────────────────────────────────────────────────────
// `categories` already exists in the seed. These two are the brief's additional commerce
// facets — real, filterable attributes surfaced in the PLP facet sidebar.
export type FacetSpec = { code: string; name: string; values: Array<{ code: string; name: string }> };

export const ACTIVITY_FACET: FacetSpec = {
  code: 'activity',
  name: 'Activity',
  values: [
    { code: 'run', name: 'Run' },
    { code: 'train', name: 'Train' },
    { code: 'yoga', name: 'Yoga' },
    { code: 'travel', name: 'Travel' },
  ],
};

export const MATERIAL_FACET: FacetSpec = {
  code: 'material',
  name: 'Material',
  values: [
    { code: 'recycled-nylon', name: 'Recycled Nylon' },
    { code: 'organic-cotton', name: 'Organic Cotton Blend' },
    { code: 'performance-knit', name: 'Performance Knit' },
    { code: 'brushed-fleece', name: 'Brushed Fleece' },
  ],
};

// ── Collections (structured navigation) ─────────────────────────────────────────
// The Athleta/GAP-style merchandising structure. Documented here as the target taxonomy for
// the production catalogue; the seed maps products into these via facet-value filters.
export const COLLECTIONS = [
  { slug: 'new-arrivals', name: 'New Arrivals', description: 'The latest drop — fresh silhouettes, seasonal colour, first access.' },
  { slug: 'performance-essentials', name: 'Performance Essentials', description: 'The train-day core: tees, tights and layers engineered to move.' },
  { slug: 'studio-and-yoga', name: 'Studio & Yoga', description: 'Buttery-soft, second-skin pieces for the mat and the flow.' },
  { slug: 'outerwear-and-layers', name: 'Outerwear & Layers', description: 'Wind, chill and transit-proof shells, hoodies and mid-layers.' },
  { slug: 'loungewear', name: 'Loungewear', description: 'Off-duty softness — the pieces you live in between sessions.' },
] as const;

export type CollectionSlug = (typeof COLLECTIONS)[number]['slug'];
