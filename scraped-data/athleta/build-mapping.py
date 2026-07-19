#!/usr/bin/env python3
"""
Builds mapping.json — the reviewed, single input for catalog seeding (Strapi + Medusa).

Reads every colorway's metadata.json + images and emits, per style:
  handle, title, category, sizes (documented per-category convention — the dataset only
  has size COUNTS), cleaned description, description-derived PDP panels (FOR/FEEL/FAVE),
  colorways [{ name (display), folder, hex (pixel-derived), prices, ordered images }].

Hex derivation: for each image, take the median color of non-background pixels in a
center crop (background = near-white studio sweep); the colorway hex is the median of
its images' medians. Data-derived — no hexes are invented.

Run:  python3 build-mapping.py   (from scraped-data/athleta)
"""
import json, os, re, glob, statistics
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))

CATEGORY_MAP = {
    'Bottoms': 'bottoms',
    'Tops': 'tops',
    'Bras': 'bras',
    'Athleta Girl': 'bras',
    'Jackets': 'jackets',
    'Accessories': 'accessories',
}
# D3 documented convention: the dataset carries size COUNTS only, so seed variants use a
# standard run per category. One-size items are sized 'One Size'.
ONE_SIZE_STYLES = {'03', '05', '06', '07', '08'}
SIZE_RUNS = {
    'bras': ['XS', 'S', 'M', 'L', 'XL'],
    'tops': ['XS', 'S', 'M', 'L', 'XL'],
    'bottoms': ['XS', 'S', 'M', 'L', 'XL'],
    'jackets': ['XS', 'S', 'M', 'L', 'XL'],
    'accessories': ['One Size'],
}

NPR_RATE, HKD_RATE = 135.0, 7.8

def is_skin(q):
    r, g, b = q
    return r > 95 and g > 40 and b > 20 and r > g > b and (r - b) > 15 and (max(q) - min(q)) > 15

# The garment of interest sits in a category-dependent region of an on-model frame:
# bottoms live in the leg zone, tops/bras/jackets on the torso, accessories centered.
# (Verified against actual images — a fixed center crop reads the *paired* garment on
# outfit shots, e.g. the black cami worn over the Abalone pant.)
REGION = {
    'bottoms': (0.30, 0.52, 0.70, 0.88),
    'tops': (0.28, 0.22, 0.72, 0.55),
    'jackets': (0.28, 0.22, 0.72, 0.55),
    'bras': (0.30, 0.22, 0.70, 0.52),
    'accessories': (0.30, 0.30, 0.70, 0.70),
}
BG_MIN = 238  # studio sweep is ~245+; keep white garments (folded shading 200–235) readable

def image_median(path, category):
    im = Image.open(path).convert('RGB').resize((80, 106))
    w, h = im.size
    x0, y0, x1, y1 = REGION[category]
    crop = im.crop((int(w*x0), int(h*y0), int(w*x1), int(h*y1)))
    px = list(crop.getdata())
    cpx = [q for q in px if min(q) <= BG_MIN and not is_skin(q)]
    if len(cpx) < 40:  # skin-toned products (Mocha Latte) / CLEAR pouch — relax masks
        cpx = [q for q in px if min(q) <= BG_MIN] or px
    return tuple(int(statistics.median(c[i] for c in cpx)) for i in range(3))

def derive_hex(paths, category):
    """Component-wise median of per-image medians — one outlier frame (a layered jacket,
    a detail crop) can't set the swatch."""
    meds = [image_median(p, category) for p in paths]
    r, g, b = (int(statistics.median(m[i] for m in meds)) for i in range(3))
    return f'#{r:02X}{g:02X}{b:02X}'

# Named-color sanity pass: the vendor's own color NAME corrects the pixel read only when
# they unambiguously disagree (tiny garments — mesh shorts, bras — can leave the region
# dominated by skin or a layered piece). This maps the vendor's name, it invents nothing:
# a swatch labelled "Black" must never render blue.
NAME_PRIORS = {
    'black': ('#1A1A1B', 'dark'),
    'navy': ('#1B2436', 'dark'),
    'white': ('#F0EFEC', 'light'),
    'bone': ('#E3DED6', 'light'),
    'clear': ('#E5E3E0', 'light'),
    'heather': ('#BDBBBA', 'light'),
}

def luminance(hexstr):
    r, g, b = int(hexstr[1:3], 16), int(hexstr[3:5], 16), int(hexstr[5:7], 16)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def apply_name_prior(name, hexstr):
    first_token = name.split('/')[0].strip().lower()
    for token, (prior, kind) in NAME_PRIORS.items():
        if token in first_token:
            lum = luminance(hexstr)
            if kind == 'dark' and lum > 90:
                return prior, True
            if kind == 'light' and lum < 150:
                return prior, True
    return hexstr, False

def clean_description(desc):
    return re.sub(r'\s*Product #\d+\s*$', '', desc or '').strip()

def split_panels(desc):
    """FOR/FEEL/FAVE segments → PDP panels; absent pattern → no panels (D4: nothing invented)."""
    m = re.match(r'FOR:\s*(.*?)\s*FEEL:\s*(.*?)\s*FAVE:\s*(.*)$', desc, re.S)
    if not m:
        return desc, []
    for_txt, feel, fave = (s.strip() for s in m.groups())
    fave_items = re.sub(r'\s{2,}', '\n', fave)
    panels = [
        {'title': 'Fabric & Feel', 'content': feel},
        {'title': 'Why We Love It', 'content': fave_items},
    ]
    return for_txt, panels

def npr(usd): return int(round(usd * NPR_RATE / 10.0) * 10)
def hkd(usd): return int(round(usd * HKD_RATE))

styles = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d)) and d[0].isdigit())
mapping = []
for s in styles:
    idx = s.split('_')[0]
    colorways = []
    meta0 = None
    entries = []
    for c in sorted(os.listdir(os.path.join(ROOT, s))):
        cdir = os.path.join(ROOT, s, c)
        mp = os.path.join(cdir, 'metadata.json')
        if not os.path.isdir(cdir) or not os.path.exists(mp):
            continue
        m = json.load(open(mp))
        meta0 = meta0 or m
        entries.append((c, m))
    top_cat = meta0['category'].split('>')[0].strip()
    category = CATEGORY_MAP[top_cat]
    for c, m in entries:
        images = [os.path.join(s, c, f) for f in m['image_files']]
        usd = m['price']
        raw_hex = derive_hex([os.path.join(ROOT, i) for i in images], category)
        hexval, corrected = apply_name_prior(m['color'], raw_hex)
        if corrected:
            print(f"  name-prior correction: {s}/{c} '{m['color']}' pixel={raw_hex} -> {hexval}")
        colorways.append({
            'name': m['color'],
            'folder': c,
            'hex': hexval,
            'priceUsd': usd,
            'priceNpr': npr(usd),
            'priceHkd': hkd(usd),
            'images': images,
        })
    sizes = ['One Size'] if idx in ONE_SIZE_STYLES else SIZE_RUNS[category]
    desc = clean_description(meta0['description'])
    short_desc, panels = split_panels(desc)
    title = meta0['product_name']
    handle = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    mapping.append({
        'style_folder': s,
        'index': idx,
        'handle': handle,
        'title': title,
        'category': category,
        'sizes': sizes,
        'description': short_desc,
        'fullDescription': desc,
        'panels': panels,
        'rating': meta0.get('rating'),
        'ratingCount': meta0.get('rating_count'),
        'skuStyle': meta0.get('sku_style'),
        'colorways': colorways,
    })

# Deterministic merchandising (documented): spotlight = 6 richest-colorway styles;
# new-arrivals = the 6 highest-index styles (latest scraped).
by_colors = sorted(mapping, key=lambda p: -len(p['colorways']))
spotlight = {p['handle'] for p in by_colors[:6]}
newest = {p['handle'] for p in sorted(mapping, key=lambda p: -int(p['index']))[:6]}
for p in mapping:
    p['collections'] = [p['category']] + (['spotlight'] if p['handle'] in spotlight else []) + (
        ['new-arrivals'] if p['handle'] in newest else [])

out = os.path.join(ROOT, 'mapping.json')
json.dump(mapping, open(out, 'w'), indent=1)
print(f'wrote {out}: {len(mapping)} products, {sum(len(p["colorways"]) for p in mapping)} colorways, '
      f'{sum(len(c["images"]) for p in mapping for c in p["colorways"])} images')
for p in mapping:
    cw = ', '.join(f"{c['name']} {c['hex']}" for c in p['colorways'][:5])
    more = f" (+{len(p['colorways'])-5})" if len(p['colorways']) > 5 else ''
    print(f"{p['handle'][:40]:42} {p['category']:12} {p['collections']} sizes={len(p['sizes'])} | {cw}{more}")
