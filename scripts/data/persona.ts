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
    { code: 'lounge', name: 'Lounge' },
    { code: 'swim', name: 'Swim' },
  ],
};

export const MATERIAL_FACET: FacetSpec = {
  code: 'material',
  name: 'Material',
  values: [
    { code: 'sculpt-knit', name: 'Sculpt Knit' },
    { code: 'performance-knit', name: 'Performance Knit' },
    { code: 'ribbed-modal', name: 'Ribbed Modal' },
    { code: 'recycled-nylon', name: 'Recycled Nylon' },
    { code: 'brushed-fleece', name: 'Brushed Fleece' },
    { code: 'satin', name: 'Recycled Satin' },
    { code: 'swim-tech', name: 'Swim Tech' },
  ],
};

// ── Collections (structured navigation) ─────────────────────────────────────────
// The Athleta/GAP-style merchandising structure. Documented here as the target taxonomy for
// the production catalogue; the seed maps products into these via facet-value filters.
export const COLLECTIONS = [
  { slug: 'new-arrivals', name: 'New Arrivals', description: 'The latest drop — elevated silhouettes, seasonal colour, first access.' },
  { slug: 'shape-and-sculpt', name: 'Shape & Sculpt', description: 'Second-skin bodysuits and smoothing shapewear that sculpt and support, invisibly.' },
  { slug: 'performance-essentials', name: 'Performance Essentials', description: 'The train-day core: bras, tights, shorts and dresses engineered to move.' },
  { slug: 'studio-and-yoga', name: 'Studio & Yoga', description: 'Buttery-soft, second-skin pieces for the mat and the flow.' },
  { slug: 'outerwear-and-layers', name: 'Outerwear & Layers', description: 'Elevated jackets, half-zips and layers for transit and the in-between.' },
  { slug: 'loungewear', name: 'Loungewear', description: 'Off-duty luxury — ribbed sets, oversized hoodies and wide-leg softness.' },
] as const;

export type CollectionSlug = (typeof COLLECTIONS)[number]['slug'];

// ── Material details ────────────────────────────────────────────────────────────
// Per-material fabric blend + care, composed into each product's PDP "Fit & Fabric" tab so the
// copy is materially accurate (not a generic category blurb). Keyed by the material facet code.
export const MATERIAL_DETAILS: Record<string, { fabric: string; care: string }> = {
  'sculpt-knit': {
    fabric: '72% nylon, 28% elastane — a smoothing, sculpting knit with targeted compression and an invisible, second-skin finish.',
    care: 'Hand wash cold or machine wash cold on gentle in a mesh bag. No fabric softener or bleach. Lay flat to dry. Do not iron.',
  },
  'performance-knit': {
    fabric: '88% recycled polyester, 12% elastane — seamless, breathable and moisture-wicking with a buttery second-skin feel.',
    care: 'Machine wash cold on gentle with like colours. Line dry. No fabric softener or bleach.',
  },
  'ribbed-modal': {
    fabric: '54% modal, 42% cotton, 4% elastane — a soft, drapey rib with a luxe matte handfeel that holds its stretch.',
    care: 'Machine wash cold with like colours. Tumble dry low. Cool iron if needed.',
  },
  'recycled-nylon': {
    fabric: '76% recycled nylon, 24% elastane — a naked-feel handfeel with four-way stretch and a squat-proof, sweat-wicking finish.',
    care: 'Machine wash cold, inside out, with like colours. No fabric softener or bleach. Line dry. Do not iron.',
  },
  'brushed-fleece': {
    fabric: '66% organic cotton, 30% recycled polyester, 4% elastane, brushed on the inside for lightweight warmth.',
    care: 'Machine wash cold, inside out. Tumble dry low. Do not iron the brushed face.',
  },
  'satin': {
    fabric: '92% recycled polyester, 8% elastane — a fluid, matte-satin drape with a cool, luxe handfeel and a hint of stretch.',
    care: 'Hand wash cold or dry clean. Do not wring or bleach. Cool iron on the reverse if needed.',
  },
  'swim-tech': {
    fabric: '78% recycled polyamide, 22% elastane — a smooth, quick-dry, chlorine-resistant knit with four-way stretch and full opacity.',
    care: 'Rinse in cold water after each wear. Hand wash cold, no soak. No fabric softener or bleach. Lay flat to dry, out of direct sun.',
  },
};

// ── Products (the curated catalogue — 20 premium women's activewear pieces) ──────
// Original names & copy (no trademarks). Colours reference the palette above; sizes are the full
// apparel run unless `oneSize`. Prices are per-channel minor units (NPR / HKD). Each product maps
// to garment `category` + `activity`/`material` facets + one or more merchandising `collections`.
// Per-colour image galleries come from COLORS; `images` here are the shared product-level shots.
export type PersonaProduct = {
  name: string;
  slug: string;
  skuCode: string;
  category: 'tops' | 'bottoms' | 'sets' | 'dresses' | 'swim' | 'accessories';
  collections: CollectionSlug[];
  activity: string;
  material: string;
  colors: string[];
  oneSize?: boolean;
  priceNpr: number;
  priceHkd: number;
  stockNepal: number;
  stockHongKong: number;
  description: string;
  features: string[];
  seoTitle: string;
  seoDescription: string;
  badge?: string;
  images?: string[];
  /**
   * Optional override for the image pipeline's garment subject (scripts/data/images.ts).
   * Defaults to the product name — set this only when the name alone doesn't describe the
   * garment well enough for a matching photo (e.g. abbreviations or ambiguous names).
   */
  photoHint?: string;
};

// Curated activewear photography pool (all women's activewear / studio shots). Two are assigned
// to each product below as its shared product-level gallery; per-colour galleries add the rest.
const SHOT_POOL = [
  'photo-1583743814966-8936f5b7be1a',
  'photo-1618354691373-d851c5c3a990',
  'photo-1552902865-b72c031ac5ea',
  'photo-1591047139829-d91aecb6caea',
  'photo-1556905055-8f358a7a47b2',
  'photo-1594633312681-425c7b97ccd1',
  'photo-1516762689617-e1cffcef479d',
  'photo-1620799140408-edc6dcb6d633',
];

const PRODUCTS_BASE: Omit<PersonaProduct, 'images'>[] = [
  {
    name: 'Sculpt Seamless Bodysuit', slug: 'sculpt-seamless-bodysuit', skuCode: 'SCULPTBODY', category: 'tops',
    collections: ['shape-and-sculpt', 'new-arrivals'], activity: 'train', material: 'sculpt-knit',
    colors: ['Onyx', 'Sandstone', 'Espresso', 'Chalk', 'Slate'], priceNpr: 690000, priceHkd: 48000, stockNepal: 14, stockHongKong: 12,
    description: 'A smoothing, second-skin bodysuit with a scoop neck and snap gusset — sculpts and supports under everything, invisibly.',
    features: ['Sculpting seamless knit', 'Built-in shelf bra', 'Snap gusset closure', 'No-VPL bonded edges'],
    seoTitle: "Sculpt Seamless Bodysuit | Women's Shapewear", seoDescription: 'A smoothing second-skin bodysuit with a built-in shelf bra and snap gusset — sculpts and supports, invisibly.', badge: 'Best Seller',
  },
  {
    name: 'Contour Long-Sleeve Bodysuit', slug: 'contour-longsleeve-bodysuit', skuCode: 'CONTOURBODY', category: 'tops',
    collections: ['shape-and-sculpt', 'studio-and-yoga'], activity: 'yoga', material: 'sculpt-knit',
    colors: ['Onyx', 'Chalk', 'Soft Sage', 'Espresso'], priceNpr: 790000, priceHkd: 54000, stockNepal: 12, stockHongKong: 10,
    description: 'A long-sleeve mock-neck bodysuit that contours the torso in one clean, sculpting line — layer it or wear it solo.',
    features: ['Long-sleeve mock neck', 'Sculpting seamless knit', 'Snap gusset closure', 'Thumbholes'],
    seoTitle: "Contour Long-Sleeve Bodysuit | Women's", seoDescription: 'A sculpting long-sleeve mock-neck bodysuit that contours in one clean line — buttery, second-skin and layer-ready.',
  },
  {
    name: 'Cami Bodysuit', slug: 'cami-bodysuit', skuCode: 'CAMIBODY', category: 'tops',
    collections: ['shape-and-sculpt', 'loungewear'], activity: 'train', material: 'sculpt-knit',
    colors: ['Sandstone', 'Onyx', 'Espresso', 'Chalk'], priceNpr: 690000, priceHkd: 48000, stockNepal: 12, stockHongKong: 10,
    description: 'A smoothing cami bodysuit with delicate straps and a thong back — a seamless base under any look.',
    features: ['Adjustable cami straps', 'Smoothing sculpt knit', 'Thong back', 'Snap gusset'],
    seoTitle: "Cami Bodysuit | Women's Shapewear", seoDescription: 'A smoothing cami bodysuit with adjustable straps and a thong back — the invisible base layer under everything.',
  },
  {
    name: 'Smoothing Shaping Short', slug: 'smoothing-shaping-short', skuCode: 'SHAPESHORT', category: 'bottoms', photoHint: 'high-waisted smoothing shapewear shorts',
    collections: ['shape-and-sculpt'], activity: 'train', material: 'sculpt-knit',
    colors: ['Sandstone', 'Onyx', 'Espresso', 'Chalk'], priceNpr: 490000, priceHkd: 34000, stockNepal: 14, stockHongKong: 10,
    description: 'A high-waist smoothing short that shapes the midsection and thigh — the invisible base under dresses and skirts.',
    features: ['High-waist smoothing panel', 'Sculpting knit', 'Anti-roll waistband', 'Bonded no-VPL hem'],
    seoTitle: "Smoothing High-Waist Shaping Short | Shapewear", seoDescription: 'A high-waist smoothing shaping short for the midsection and thigh — the invisible base layer under dresses and skirts.',
  },
  {
    name: 'Halo Seamless Sports Bra', slug: 'halo-seamless-bra', skuCode: 'HALOBRA', category: 'tops',
    collections: ['performance-essentials', 'studio-and-yoga'], activity: 'yoga', material: 'performance-knit',
    colors: ['Onyx', 'Chalk', 'Soft Sage', 'Sandstone'], priceNpr: 490000, priceHkd: 34000, stockNepal: 14, stockHongKong: 12,
    description: 'Second-skin, medium-support bra knit in one piece for zero chafe — from the mat to the street.',
    features: ['Seamless one-piece knit', 'Removable cups', 'Medium support (B-D)', 'Squat-proof underband'],
    seoTitle: "Halo Seamless Sports Bra | Women's Activewear", seoDescription: 'A seamless medium-support sports bra with removable cups and a stay-put band — buttery-soft and squat-proof.', badge: 'Best Seller',
  },
  {
    name: 'Longline Ribbed Bra', slug: 'longline-ribbed-bra', skuCode: 'LONGLINEBRA', category: 'tops',
    collections: ['studio-and-yoga', 'loungewear'], activity: 'yoga', material: 'ribbed-modal',
    colors: ['Onyx', 'Sandstone', 'Soft Sage', 'Chalk'], priceNpr: 520000, priceHkd: 36000, stockNepal: 12, stockHongKong: 10,
    description: 'A ribbed longline bra with a flattering scoop and wide band — support with a little more coverage.',
    features: ['Longline silhouette', 'Soft rib knit', 'Removable cups', 'Wide supportive band'],
    seoTitle: "Longline Ribbed Bra | Women's", seoDescription: 'A ribbed longline bra with a scoop neck and wide band — a little more coverage in a luxe matte rib.',
  },
  {
    name: 'Halter Longline Top', slug: 'halter-longline-top', skuCode: 'HALTERTOP', category: 'tops',
    collections: ['performance-essentials', 'studio-and-yoga'], activity: 'train', material: 'performance-knit',
    colors: ['Sandstone', 'Onyx', 'Espresso', 'Soft Sage'], priceNpr: 520000, priceHkd: 36000, stockNepal: 12, stockHongKong: 10,
    description: 'A backless halter longline with a built-in shelf bra — a sculpted, going-out take on the sports top.',
    features: ['Halter neck, open back', 'Built-in shelf bra', 'Longline hem', 'Smooth performance knit'],
    seoTitle: "Halter Longline Top | Women's", seoDescription: 'A backless halter longline top with a built-in shelf bra — a sculpted, elevated take on the sports top.',
  },
  {
    name: 'Rib Tube Top', slug: 'rib-tube-top', skuCode: 'TUBETOP', category: 'tops',
    collections: ['loungewear', 'new-arrivals'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Onyx', 'Chalk', 'Sandstone', 'Soft Sage'], priceNpr: 390000, priceHkd: 28000, stockNepal: 16, stockHongKong: 12,
    description: 'A fitted ribbed tube top with silicone grip and a built-in shelf — strapless polish that stays put.',
    features: ['Strapless tube', 'Silicone grip band', 'Built-in shelf', 'Soft rib knit'],
    seoTitle: "Rib Tube Top | Women's", seoDescription: 'A fitted ribbed tube top with a silicone grip band and built-in shelf — strapless, elevated and stay-put.',
  },
  {
    name: 'Wrap Crop Top', slug: 'wrap-crop-top', skuCode: 'WRAPTOP', category: 'tops',
    collections: ['studio-and-yoga'], activity: 'yoga', material: 'performance-knit',
    colors: ['Onyx', 'Soft Sage', 'Sandstone', 'Chalk'], priceNpr: 490000, priceHkd: 34000, stockNepal: 12, stockHongKong: 10,
    description: 'A cropped long-sleeve wrap that ties at the waist — the studio layer that finishes a look.',
    features: ['Wrap-and-tie front', 'Cropped long sleeve', 'Smooth performance knit', 'Thumbholes'],
    seoTitle: "Wrap Crop Top | Women's Yoga", seoDescription: 'A cropped long-sleeve wrap top that ties at the waist — the elevated studio layer over any bra or set.',
  },
  {
    name: 'Ribbed Scoop Tank', slug: 'ribbed-scoop-tank', skuCode: 'RIBTANK', category: 'tops',
    collections: ['performance-essentials', 'loungewear'], activity: 'train', material: 'ribbed-modal',
    colors: ['Chalk', 'Onyx', 'Sandstone', 'Soft Sage'], priceNpr: 420000, priceHkd: 30000, stockNepal: 16, stockHongKong: 12,
    description: 'A fitted ribbed scoop tank with a built-in shelf — the elevated layer that works on its own.',
    features: ['Fitted rib knit', 'Built-in shelf bra', 'Scoop neck', 'Longline hem'],
    seoTitle: "Ribbed Scoop Tank | Women's", seoDescription: 'A fitted ribbed scoop tank with a built-in shelf bra — a sculpted, elevated layer in a luxe matte rib.',
  },
  {
    name: 'Cropped Rib Cardigan', slug: 'cropped-rib-cardigan', skuCode: 'RIBCARD', category: 'tops',
    collections: ['loungewear'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Sandstone', 'Chalk', 'Espresso', 'Soft Sage'], priceNpr: 790000, priceHkd: 54000, stockNepal: 10, stockHongKong: 8,
    description: 'A cropped ribbed cardigan with a slim placket — the soft top layer for a matching set.',
    features: ['Cropped fit', 'Button placket', 'Soft rib knit', 'Ribbed cuffs'],
    seoTitle: "Cropped Rib Cardigan | Women's", seoDescription: 'A cropped ribbed cardigan with a slim button placket — the soft, elevated layer over a matching set.',
  },
  {
    name: 'Oversized Lounge Hoodie', slug: 'oversized-lounge-hoodie', skuCode: 'OVERHOOD', category: 'tops',
    collections: ['loungewear', 'outerwear-and-layers'], activity: 'lounge', material: 'brushed-fleece',
    colors: ['Espresso', 'Chalk', 'Sandstone', 'Onyx'], priceNpr: 890000, priceHkd: 62000, stockNepal: 12, stockHongKong: 10,
    description: 'An oversized brushed-fleece hoodie with a dropped shoulder and boxy crop — cocoon-soft, elevated ease.',
    features: ['Oversized boxy fit', 'Brushed interior', 'Dropped shoulder', 'Ribbed hem'],
    seoTitle: "Oversized Lounge Hoodie | Women's", seoDescription: 'An oversized brushed-fleece hoodie with a dropped shoulder and boxy crop — cocoon-soft, elevated off-duty ease.', badge: 'New',
  },
  {
    name: 'Cropped Half-Zip', slug: 'cropped-half-zip', skuCode: 'CROPZIP', category: 'tops', photoHint: 'cropped half-zip pullover activewear top',
    collections: ['outerwear-and-layers', 'studio-and-yoga'], activity: 'run', material: 'performance-knit',
    colors: ['Slate', 'Onyx', 'Soft Sage', 'Chalk'], priceNpr: 690000, priceHkd: 48000, stockNepal: 10, stockHongKong: 8,
    description: 'A cropped funnel-neck half-zip in a smooth performance knit — the polished layer for cool starts.',
    features: ['Cropped funnel neck', 'Smooth performance knit', 'Thumbholes', 'Zip garage'],
    seoTitle: "Cropped Half-Zip Pullover | Women's", seoDescription: 'A cropped funnel-neck half-zip in a smooth performance knit — a polished, second-skin layer for cool starts.',
  },
  {
    name: 'Luxe Bomber Jacket', slug: 'luxe-bomber-jacket', skuCode: 'LUXEBOMBER', category: 'tops',
    collections: ['outerwear-and-layers', 'new-arrivals'], activity: 'travel', material: 'recycled-nylon',
    colors: ['Onyx', 'Sandstone', 'Slate', 'Espresso'], priceNpr: 1290000, priceHkd: 89000, stockNepal: 8, stockHongKong: 6,
    description: 'A cropped bomber in a smooth recycled shell with ribbed trims and zip pockets — the polished layer over any look.',
    features: ['Cropped silhouette', 'Water-resistant shell', 'Ribbed collar & cuffs', 'Zip pockets'],
    seoTitle: "Luxe Cropped Bomber Jacket | Women's", seoDescription: 'A cropped bomber in a smooth water-resistant recycled shell with ribbed trims — the polished layer over any look.', badge: 'New',
  },
  {
    name: 'Contour High-Rise Legging', slug: 'contour-high-rise-legging', skuCode: 'CONTOURLEG', category: 'bottoms',
    collections: ['studio-and-yoga', 'new-arrivals'], activity: 'yoga', material: 'recycled-nylon',
    colors: ['Onyx', 'Slate', 'Soft Sage', 'Sandstone', 'Espresso'], priceNpr: 690000, priceHkd: 48000, stockNepal: 16, stockHongKong: 14,
    description: 'Naked-feel 7/8 legging with a sculpting high-rise waistband and interlock seams — no dig, no see-through.',
    features: ['Naked-feel handfeel', 'Sculpting high rise', 'Squat-proof', 'Hidden waistband pocket'],
    seoTitle: "Contour High-Rise 7/8 Legging | Women's", seoDescription: 'A naked-feel high-rise 7/8 legging that sculpts and stays put — squat-proof, no-dig and never see-through.', badge: 'Best Seller',
  },
  {
    name: 'Flared High-Rise Legging', slug: 'flared-high-rise-legging', skuCode: 'FLARELEG', category: 'bottoms',
    collections: ['studio-and-yoga', 'new-arrivals'], activity: 'yoga', material: 'performance-knit',
    colors: ['Onyx', 'Espresso', 'Slate', 'Chalk'], priceNpr: 720000, priceHkd: 50000, stockNepal: 12, stockHongKong: 10,
    description: 'A high-rise flare that skims the thigh and opens to a floor-sweeping hem — the leg-lengthening everyday flare.',
    features: ['Crossover high rise', 'Flare leg', 'Buttery knit', 'Four-way stretch'],
    seoTitle: "Flared High-Rise Legging | Women's Flares", seoDescription: 'A high-rise flare legging that skims and lengthens to a floor-sweeping hem — buttery, four-way stretch.', badge: 'New',
  },
  {
    name: 'High-Rise Stirrup Legging', slug: 'high-rise-stirrup-legging', skuCode: 'STIRRUPLEG', category: 'bottoms',
    collections: ['studio-and-yoga', 'new-arrivals'], activity: 'yoga', material: 'performance-knit',
    colors: ['Onyx', 'Slate', 'Espresso', 'Sandstone'], priceNpr: 720000, priceHkd: 50000, stockNepal: 12, stockHongKong: 10,
    description: 'A high-rise stirrup legging with a sleek foot loop — a ballet-flat-ready take on the second-skin tight.',
    features: ['Stirrup foot loop', 'Sculpting high rise', 'Buttery knit', 'Squat-proof'],
    seoTitle: "High-Rise Stirrup Legging | Women's", seoDescription: 'A high-rise stirrup legging with a sleek foot loop — a ballet-inspired, second-skin tight that lengthens the leg.', badge: 'New',
  },
  {
    name: 'Ribbed Seamless Legging', slug: 'ribbed-seamless-legging', skuCode: 'RIBLEG', category: 'bottoms',
    collections: ['performance-essentials'], activity: 'train', material: 'performance-knit',
    colors: ['Onyx', 'Sandstone', 'Slate', 'Soft Sage'], priceNpr: 690000, priceHkd: 48000, stockNepal: 14, stockHongKong: 12,
    description: 'A ribbed seamless high-rise legging with contour panelling that sculpts through every rep.',
    features: ['Ribbed seamless knit', 'Contour panelling', 'High rise', 'Squat-proof'],
    seoTitle: "Ribbed Seamless Legging | Women's", seoDescription: 'A ribbed seamless high-rise legging with sculpting contour panels — squat-proof support with a luxe texture.',
  },
  {
    name: 'Capri Legging', slug: 'capri-legging', skuCode: 'CAPRILEG', category: 'bottoms',
    collections: ['performance-essentials'], activity: 'train', material: 'recycled-nylon',
    colors: ['Onyx', 'Slate', 'Sandstone', 'Soft Sage'], priceNpr: 620000, priceHkd: 43000, stockNepal: 12, stockHongKong: 10,
    description: 'A cropped high-rise capri that hits below the knee — the breezy, practical length for warm-weather training.',
    features: ['Below-knee crop', 'Sculpting high rise', 'Squat-proof', 'Waistband pocket'],
    seoTitle: "Capri Legging | Women's", seoDescription: 'A cropped high-rise capri legging that hits below the knee — squat-proof and breezy for warm-weather training.',
  },
  {
    name: 'Sculpt Bike Short', slug: 'sculpt-bike-short', skuCode: 'SCULPTSHORT', category: 'bottoms',
    collections: ['performance-essentials'], activity: 'train', material: 'recycled-nylon',
    colors: ['Onyx', 'Slate', 'Soft Sage', 'Sandstone'], priceNpr: 450000, priceHkd: 32000, stockNepal: 16, stockHongKong: 12,
    description: 'A 5-inch naked-feel bike short with a high-rise contour band and a hidden pocket — squat-proof, no ride-up.',
    features: ['5-inch inseam', 'Squat-proof', 'Waistband pocket', 'No ride-up'],
    seoTitle: "Sculpt High-Rise Bike Short | Women's", seoDescription: 'A naked-feel 5-inch bike short with a sculpting high-rise band and hidden pocket — squat-proof with zero ride-up.',
  },
  {
    name: 'Utility Cargo Pant', slug: 'utility-cargo-pant', skuCode: 'CARGOPANT', category: 'bottoms',
    collections: ['loungewear', 'new-arrivals'], activity: 'travel', material: 'recycled-nylon',
    colors: ['Sandstone', 'Onyx', 'Slate', 'Espresso'], priceNpr: 890000, priceHkd: 62000, stockNepal: 10, stockHongKong: 8,
    description: 'A relaxed woven cargo with a drawcord waist and roomy patch pockets — the elevated utility trouser.',
    features: ['Relaxed wide leg', 'Drawcord waist', 'Cargo patch pockets', 'Wrinkle-resistant woven'],
    seoTitle: "Utility Cargo Pant | Women's", seoDescription: 'A relaxed woven cargo pant with a drawcord waist and roomy patch pockets — the elevated, everyday utility trouser.', badge: 'New',
  },
  {
    name: 'Cotton-Jersey Flare', slug: 'cotton-jersey-flare', skuCode: 'JERSEYFLARE', category: 'bottoms',
    collections: ['loungewear'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Chalk', 'Onyx', 'Sandstone', 'Soft Sage'], priceNpr: 690000, priceHkd: 48000, stockNepal: 12, stockHongKong: 10,
    description: 'A soft cotton-jersey flare with a fold-over waist — the off-duty flare that drapes and moves.',
    features: ['Fold-over waist', 'Flare leg', 'Soft cotton jersey', 'Floor-grazing length'],
    seoTitle: "Cotton-Jersey Flare Pant | Women's", seoDescription: 'A soft cotton-jersey flare with a fold-over waist — the drapey, off-duty flare for lounge and street.',
  },
  {
    name: 'Wide-Leg Lounge Pant', slug: 'wide-leg-lounge-pant', skuCode: 'WIDEPANT', category: 'bottoms',
    collections: ['loungewear'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Sandstone', 'Onyx', 'Espresso', 'Chalk'], priceNpr: 690000, priceHkd: 48000, stockNepal: 12, stockHongKong: 10,
    description: 'A fluid ribbed wide-leg pant with a fold-over waist — the elevated off-duty trouser that drapes and moves.',
    features: ['Fluid wide leg', 'Soft rib knit', 'Fold-over waist', 'Floor-grazing length'],
    seoTitle: "Ribbed Wide-Leg Lounge Pant | Women's", seoDescription: 'A fluid ribbed wide-leg lounge pant with a fold-over waist — elevated, drapey off-duty softness.',
  },
  {
    name: 'Court Tennis Dress', slug: 'court-tennis-dress', skuCode: 'COURTDRESS', category: 'dresses',
    collections: ['performance-essentials', 'new-arrivals'], activity: 'train', material: 'recycled-nylon',
    colors: ['Chalk', 'Onyx', 'Soft Sage', 'Sandstone'], priceNpr: 890000, priceHkd: 62000, stockNepal: 10, stockHongKong: 8,
    description: 'A built-in tennis dress with a shelf bra and bike-short liner — court-ready coverage that moves as one.',
    features: ['Built-in shelf bra', 'Bonded bike-short liner', 'A-line skort skirt', 'Sweat-wicking'],
    seoTitle: "Court Tennis Dress | Women's", seoDescription: 'A tennis dress with a built-in shelf bra and bike-short liner — court-ready coverage that moves as one piece.', badge: 'New',
  },
  {
    name: 'Lounge Rib Slip Dress', slug: 'lounge-rib-slip-dress', skuCode: 'RIBSLIP', category: 'dresses',
    collections: ['loungewear', 'new-arrivals'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Sandstone', 'Onyx', 'Espresso', 'Soft Sage'], priceNpr: 790000, priceHkd: 54000, stockNepal: 10, stockHongKong: 8,
    description: 'A body-skimming ribbed slip dress with a built-in shelf — the one-and-done that goes from sofa to street.',
    features: ['Body-skimming rib', 'Built-in shelf bra', 'Adjustable straps', 'Midi length'],
    seoTitle: "Lounge Rib Slip Dress | Women's", seoDescription: 'A body-skimming ribbed slip dress with a built-in shelf bra — the elevated one-and-done from sofa to street.', badge: 'Best Seller',
  },
  {
    name: 'Lounge Rib Long-Sleeve Dress', slug: 'lounge-rib-ls-dress', skuCode: 'RIBLSDRESS', category: 'dresses',
    collections: ['loungewear'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Espresso', 'Onyx', 'Sandstone', 'Chalk'], priceNpr: 890000, priceHkd: 62000, stockNepal: 10, stockHongKong: 8,
    description: 'A long-sleeve ribbed maxi that skims and drapes — cosy coverage with a sculpted line.',
    features: ['Long sleeve', 'Body-skimming rib', 'Crew neck', 'Maxi length'],
    seoTitle: "Lounge Rib Long-Sleeve Dress | Women's", seoDescription: 'A long-sleeve ribbed maxi dress that skims and drapes — cosy, sculpted coverage in a luxe matte rib.',
  },
  {
    name: 'Satin Bias Slip Dress', slug: 'satin-bias-slip-dress', skuCode: 'SATINSLIP', category: 'dresses',
    collections: ['loungewear', 'new-arrivals'], activity: 'lounge', material: 'satin',
    colors: ['Sandstone', 'Onyx', 'Espresso', 'Chalk'], priceNpr: 990000, priceHkd: 69000, stockNepal: 8, stockHongKong: 8,
    description: 'A bias-cut satin slip with a cowl neck and fluid drape — the elevated evening layer.',
    features: ['Bias-cut drape', 'Cowl neck', 'Adjustable straps', 'Matte-satin finish'],
    seoTitle: "Satin Bias Slip Dress | Women's", seoDescription: 'A bias-cut satin slip dress with a cowl neck and fluid drape — the elevated evening layer in a matte satin.', badge: 'New',
  },
  {
    name: 'Sculpt Sleeveless Unitard', slug: 'sculpt-sleeveless-unitard', skuCode: 'SCULPTUNI', category: 'sets', photoHint: 'sleeveless full-length fitted activewear unitard',
    collections: ['shape-and-sculpt', 'studio-and-yoga'], activity: 'yoga', material: 'sculpt-knit',
    colors: ['Onyx', 'Espresso', 'Soft Sage', 'Sandstone'], priceNpr: 890000, priceHkd: 62000, stockNepal: 10, stockHongKong: 8,
    description: 'A sculpting sleeveless unitard with a built-in shelf bra and 7/8 length — one clean, second-skin line.',
    features: ['One-piece', 'Built-in shelf bra', 'Scoop back', 'Squat-proof 7/8 length'],
    seoTitle: "Sculpt Sleeveless Unitard | One-Piece", seoDescription: 'A sculpting sleeveless unitard with a built-in shelf bra and 7/8 length — second-skin support in one clean line.',
  },
  {
    name: 'Ribbed Halter Unitard', slug: 'ribbed-halter-unitard', skuCode: 'HALTERUNI', category: 'sets', photoHint: 'halter-neck full-length fitted activewear unitard',
    collections: ['studio-and-yoga', 'new-arrivals'], activity: 'yoga', material: 'performance-knit',
    colors: ['Espresso', 'Onyx', 'Sandstone', 'Soft Sage'], priceNpr: 890000, priceHkd: 62000, stockNepal: 10, stockHongKong: 8,
    description: 'A ribbed halter unitard with an open back and 7/8 length — a sculpted one-piece for studio to street.',
    features: ['Halter neck, open back', 'Ribbed sculpt knit', 'Built-in shelf bra', '7/8 length'],
    seoTitle: "Ribbed Halter Unitard | One-Piece", seoDescription: 'A ribbed halter unitard with an open back and 7/8 length — a sculpted, second-skin one-piece from studio to street.', badge: 'New',
  },
  {
    name: 'Luxe Wide-Leg Jumpsuit', slug: 'luxe-wide-leg-jumpsuit', skuCode: 'LUXEJUMP', category: 'sets', photoHint: 'wide-leg full-length jumpsuit',
    collections: ['loungewear', 'new-arrivals'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Sandstone', 'Onyx', 'Espresso', 'Soft Sage'], priceNpr: 1190000, priceHkd: 82000, stockNepal: 8, stockHongKong: 8,
    description: 'A ribbed halter jumpsuit with a wide leg and open back — an effortless one-and-done from lounge to dinner.',
    features: ['One-piece jumpsuit', 'Halter neck, open back', 'Wide leg', 'Soft rib knit'],
    seoTitle: "Luxe Wide-Leg Jumpsuit | Women's", seoDescription: 'A ribbed halter wide-leg jumpsuit with an open back — an effortless, elevated one-and-done from lounge to dinner.', badge: 'New',
  },
  {
    name: 'Serenity Yoga Set', slug: 'serenity-yoga-set', skuCode: 'SERENITYSET', category: 'sets', photoHint: 'matching yoga set of sports bra and leggings',
    collections: ['studio-and-yoga'], activity: 'yoga', material: 'performance-knit',
    colors: ['Soft Sage', 'Onyx', 'Sandstone', 'Chalk'], priceNpr: 990000, priceHkd: 69000, stockNepal: 10, stockHongKong: 8,
    description: 'Deep-V longline bra and matching high-rise 7/8 — a second-skin set that moves as one.',
    features: ['Matching set', 'Deep-V longline bra', 'High-rise legging', 'Removable pads'],
    seoTitle: "Serenity Deep-V Yoga Set | Bra + Legging", seoDescription: 'A matching yoga set — deep-V longline bra with a high-rise 7/8 legging in a buttery second-skin knit.', badge: 'Best Seller',
  },
  {
    name: 'Sculpt Seamless Set', slug: 'sculpt-seamless-set', skuCode: 'SCULPTSET', category: 'sets', photoHint: 'matching seamless set of sports bra and leggings',
    collections: ['performance-essentials'], activity: 'train', material: 'performance-knit',
    colors: ['Onyx', 'Slate', 'Soft Sage', 'Sandstone'], priceNpr: 990000, priceHkd: 69000, stockNepal: 10, stockHongKong: 8,
    description: 'A ribbed seamless workout set — a medium-support bra with a 5-inch contour short for the gym floor.',
    features: ['Matching set', 'Ribbed seamless knit', 'Medium support', 'Squat-proof short'],
    seoTitle: "Sculpt Ribbed Seamless Set | Bra + Short", seoDescription: 'A ribbed seamless workout set — medium-support bra and squat-proof 5-inch contour short, built for the gym floor.',
  },
  {
    name: 'Ribbed Lounge Set', slug: 'ribbed-lounge-set', skuCode: 'RIBSET', category: 'sets', photoHint: 'matching ribbed knit lounge set, top and trousers',
    collections: ['loungewear'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Sandstone', 'Chalk', 'Espresso', 'Soft Sage'], priceNpr: 1090000, priceHkd: 75000, stockNepal: 8, stockHongKong: 8,
    description: 'A ribbed long-sleeve and wide-leg set in matching luxe modal — the elevated stay-in, go-out uniform.',
    features: ['Matching set', 'Soft rib knit', 'Fitted long-sleeve top', 'Wide-leg pant'],
    seoTitle: "Ribbed Lounge Set | Long-Sleeve + Wide-Leg", seoDescription: 'A ribbed long-sleeve and wide-leg lounge set in luxe modal — the elevated, matching stay-in, go-out uniform.',
  },
  {
    name: 'Rib Short Lounge Set', slug: 'rib-short-lounge-set', skuCode: 'RIBSHORTSET', category: 'sets', photoHint: 'matching ribbed lounge set, tank top and shorts',
    collections: ['loungewear'], activity: 'lounge', material: 'ribbed-modal',
    colors: ['Chalk', 'Sandstone', 'Onyx', 'Soft Sage'], priceNpr: 790000, priceHkd: 54000, stockNepal: 10, stockHongKong: 8,
    description: 'A ribbed tank and boxer-short set — the softest matching two-piece for downtime.',
    features: ['Matching set', 'Ribbed tank with shelf', 'Boxer short', 'Soft rib knit'],
    seoTitle: "Rib Short Lounge Set | Tank + Short", seoDescription: 'A ribbed tank and boxer-short lounge set — the softest, elevated matching two-piece for downtime.',
  },
  {
    name: 'Triangle Bikini Set', slug: 'triangle-bikini-set', skuCode: 'TRIBIKINI', category: 'swim', photoHint: 'triangle-top two-piece bikini swimsuit',
    collections: ['new-arrivals'], activity: 'swim', material: 'swim-tech',
    colors: ['Onyx', 'Sandstone', 'Espresso', 'Chalk'], priceNpr: 690000, priceHkd: 48000, stockNepal: 12, stockHongKong: 10,
    description: 'A classic triangle bikini with tie-side bottoms in a smooth, quick-dry swim knit — mix-and-match ready.',
    features: ['Adjustable triangle top', 'Tie-side bottom', 'Quick-dry, chlorine-resistant', 'Full opacity lining'],
    seoTitle: "Triangle Bikini Set | Women's Swim", seoDescription: 'A classic triangle bikini with tie-side bottoms in a smooth, quick-dry swim knit — adjustable and mix-and-match ready.', badge: 'New',
  },
  {
    name: 'Halter Bikini Set', slug: 'halter-bikini-set', skuCode: 'HALTERBIKINI', category: 'swim', photoHint: 'halter-top two-piece bikini swimsuit',
    collections: ['new-arrivals'], activity: 'swim', material: 'swim-tech',
    colors: ['Espresso', 'Onyx', 'Sandstone', 'Soft Sage'], priceNpr: 690000, priceHkd: 48000, stockNepal: 12, stockHongKong: 10,
    description: 'A supportive halter bikini with a scoop top and cheeky bottom — a little more coverage through the neck.',
    features: ['Halter scoop top', 'Removable cups', 'Cheeky bottom', 'Quick-dry swim knit'],
    seoTitle: "Halter Bikini Set | Women's Swim", seoDescription: 'A supportive halter bikini with a scoop top and cheeky bottom — a little more hold in a smooth, quick-dry knit.',
  },
  {
    name: 'Scoop-Neck One-Piece', slug: 'scoop-neck-one-piece', skuCode: 'SCOOPONEPIECE', category: 'swim', photoHint: 'scoop-neck one-piece swimsuit',
    collections: ['new-arrivals'], activity: 'swim', material: 'swim-tech',
    colors: ['Onyx', 'Sandstone', 'Espresso', 'Chalk'], priceNpr: 890000, priceHkd: 62000, stockNepal: 10, stockHongKong: 8,
    description: 'A sculpting scoop-neck one-piece with an open back — clean lines and full coverage in a smooth swim knit.',
    features: ['Sculpting one-piece', 'Scoop neck, open back', 'Removable cups', 'Quick-dry, full opacity'],
    seoTitle: "Scoop-Neck One-Piece Swimsuit | Women's", seoDescription: 'A sculpting scoop-neck one-piece with an open back — clean lines and full coverage in a smooth, quick-dry swim knit.', badge: 'New',
  },
];

/** The production catalogue — 20 curated products, each with two shared gallery shots assigned
 * deterministically from the pool (per-colour galleries in COLORS supply the rest). */
export const PRODUCTS: PersonaProduct[] = PRODUCTS_BASE.map((product, index) => ({
  ...product,
  images: [u(SHOT_POOL[(index * 2) % SHOT_POOL.length]), u(SHOT_POOL[(index * 2 + 1) % SHOT_POOL.length])],
}));
