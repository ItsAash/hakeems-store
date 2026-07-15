# Phase 2 — Curated Women's Activewear Catalog (for review)

Premium women's activewear for **Hakeems**, benchmarked to Athleta / Alo Yoga / Lululemon quality.
Names, copy and imagery are **original** — the Alibaba links were used only as *category/quality*
references (workout sets, naked-feel leggings, seamless one-pieces, deep-V yoga sets, brushed sets).
No brand names or trademarks are copied. Once approved, Phase 3 codifies this into structured data
(`persona.ts` / seed) and Phase 5 imports it.

> ⚠️ Replaces the current `seed.ts` sketch, which reused trademarked Athleta/Gap product names
> (Salutation, Ultimate, Elation, Farallon, Rainier, Brooklyn, GapFit). Those are dropped.

---

## Shared taxonomy (already scaffolded in `persona.ts`)

**Colours (palette of 6)** — swatch dot + a 3-shot gallery each (front / fabric macro / on-model):
`Onyx #1c1c1c` · `Chalk #f4f1ea` · `Soft Sage #a7b0a0` · `Sandstone #d8c6a5` · `Espresso #4b3a2f` · `Slate #3f4042`

**Sizes:** Apparel `XS · S · M · L · XL · XXL` — (accessories/one-piece: `One Size` where noted)

**Collections (5):** New Arrivals · Performance Essentials · Studio & Yoga · Outerwear & Layers · Loungewear

**Activity facet:** Run · Train · Yoga · Travel   **Material facet:** Recycled Nylon · Organic Cotton Blend · Performance Knit · Brushed Fleece

**Categories:** Tops · Bottoms · Sets · Accessories

**SKU scheme:** `HKM-<STYLE>-<COLOR>-<SIZE>` e.g. `HKM-HALOBRA-ONYX-M`

**Pricing:** two channels — **NPR** (Nepal) and **HKD** (Hong Kong), stored in minor units.

**Images:** each product ships **4–8 images** — a per-colour gallery of **front · fabric macro · on-model**
(so switching a colour swatch swaps the whole gallery via Vendure variants, Phase 3), plus shared detail shots.

### Care by material (referenced per product)
- **Recycled Nylon (naked-feel):** 76% recycled nylon / 24% elastane. Machine wash cold, inside out, with like colours. No fabric softener or bleach. Line/hang dry. Do not iron.
- **Performance Knit (seamless):** 88% recycled polyester / 12% elastane. Machine wash cold, gentle. Line dry. No softener.
- **Organic Cotton Blend:** 60% organic cotton / 33% modal / 7% elastane. Machine wash cold. Tumble dry low. Warm iron if needed.
- **Brushed Fleece:** 66% organic cotton / 30% recycled poly / 4% elastane, brushed interior. Wash cold inside out. Tumble dry low. Do not iron brushed face.

---

## The 20 products

Format per item — **#. Title** `slug` · Category · Collection(s) · Activity/Material · Colours · Price (NPR/HKD) · Stock/variant

### Tops (7)

**1. Halo Seamless Sports Bra** `halo-seamless-bra` · Tops · Studio & Yoga, New Arrivals · Yoga/Train · Performance Knit
Colours: Onyx, Chalk, Soft Sage, Sandstone · **NPR 4,900 / HKD 340** · stock 14/variant · *Best Seller*
Second-skin, medium-support bra knit in one piece for zero chafe. Removable pads, scoop back.
Features: seamless knit · removable cups · medium support (B–D) · sweat-wicking · squat-proof band.
Tags: sports bra, seamless, medium support, yoga, studio.

**2. Ridgeline High-Support Bra** `ridgeline-high-support-bra` · Tops · Performance Essentials · Run/Train · Recycled Nylon
Colours: Onyx, Slate, Sandstone, Chalk · **NPR 5,900 / HKD 390** · stock 12/variant
Encapsulated high-impact bra with adjustable straps and a wide underband for run-day lock-in.
Features: high support (up to DD) · adjustable straps · encapsulated cups · mesh back panel · reflective trim.
Tags: sports bra, high impact, running, adjustable.

**3. Airflow Racerback Tank** `airflow-racerback-tank` · Tops · Performance Essentials · Train/Run · Performance Knit
Colours: Chalk, Onyx, Soft Sage, Slate · **NPR 3,900 / HKD 280** · stock 16/variant
Featherweight perforated tank with a drop racerback and a relaxed, breathable drape.
Features: laser-cut ventilation · relaxed fit · quick-dry · anti-odour finish.
Tags: tank, racerback, breathable, training.

**4. Cloudfeel Seamless Tee** `cloudfeel-seamless-tee` · Tops · Studio & Yoga · Yoga/Travel · Performance Knit
Colours: Soft Sage, Chalk, Sandstone, Espresso, Onyx · **NPR 4,500 / HKD 320** · stock 14/variant
Weightless seamless tee with a slim, layer-ready cut and buttery hand-feel.
Features: seamless body · slim fit · four-way stretch · tag-free.
Tags: tee, seamless, studio, layering.

**5. Everyday Organic Crew Tee** `everyday-organic-crew-tee` · Tops · Loungewear, Performance Essentials · Travel · Organic Cotton Blend
Colours: Chalk, Onyx, Sandstone, Soft Sage · **NPR 3,500 / HKD 250** · stock 18/variant
Soft organic-cotton crew with a clean drape — studio to street.
Features: organic cotton blend · relaxed fit · pre-shrunk · breathable.
Tags: tee, cotton, everyday, loungewear.

**6. Flow Cropped Long-Sleeve** `flow-cropped-long-sleeve` · Tops · Studio & Yoga · Yoga · Performance Knit
Colours: Onyx, Soft Sage, Sandstone, Chalk · **NPR 4,900 / HKD 340** · stock 12/variant
Cropped long-sleeve with thumbholes and a slim second-skin fit for cool-down flows.
Features: cropped hem · thumbholes · seamless cuffs · four-way stretch.
Tags: long sleeve, cropped, yoga, thumbholes.

**7. Summit Half-Zip Base Layer** `summit-half-zip-base-layer` · Tops · Outerwear & Layers · Run/Travel · Recycled Nylon
Colours: Slate, Onyx, Espresso, Chalk · **NPR 6,900 / HKD 480** · stock 10/variant · *New*
Brushed half-zip base layer with a funnel neck for cold starts and transit.
Features: brushed interior · funnel neck · zip garage · thumbholes.
Tags: half-zip, base layer, running, warmth.

### Bottoms (7)

**8. Contour High-Rise 7/8 Legging** `contour-high-rise-legging` · Bottoms · Studio & Yoga, New Arrivals · Yoga/Train · Recycled Nylon
Colours: Onyx, Slate, Soft Sage, Sandstone, Espresso · **NPR 6,900 / HKD 480** · stock 16/variant · *Best Seller*
Naked-feel 7/8 legging with a sculpting high-rise waistband and interlock seams — no dig, no see-through.
Features: naked-feel handfeel · sculpting high rise · squat-proof · hidden waistband pocket · gusset.
Tags: leggings, high rise, naked feel, 7/8, squat proof.

**9. Momentum Pocket Full-Length Legging** `momentum-pocket-legging` · Bottoms · Performance Essentials · Run/Train · Recycled Nylon
Colours: Onyx, Slate, Sandstone, Chalk · **NPR 7,900 / HKD 540** · stock 14/variant
Full-length run legging with deep side drop-in pockets and a lock-tight high-rise.
Features: 2 side pockets + waistband pocket · high rise · sweat-wicking · reflective hits.
Tags: leggings, pockets, running, full length.

**10. Featherlight Bike Short** `featherlight-bike-short` · Bottoms · Performance Essentials · Train · Recycled Nylon
Colours: Onyx, Slate, Soft Sage, Sandstone · **NPR 4,500 / HKD 320** · stock 16/variant
5" naked-feel bike short with a high-rise contour band and a hidden pocket.
Features: 5" inseam · squat-proof · waistband pocket · no ride-up.
Tags: bike short, high rise, training.

**11. Breeze 2-in-1 Running Short** `breeze-2in1-running-short` · Bottoms · Performance Essentials · Run · Recycled Nylon
Colours: Onyx, Chalk, Slate, Espresso · **NPR 4,900 / HKD 340** · stock 12/variant
Lined 2-in-1 running short — supportive inner tight under a breezy woven shell.
Features: built-in liner · zip back pocket · reflective trim · quick-dry shell.
Tags: running short, 2-in-1, lined.

**12. Aura Flare Yoga Pant** `aura-flare-yoga-pant` · Bottoms · Studio & Yoga, New Arrivals · Yoga · Performance Knit
Colours: Onyx, Espresso, Slate, Chalk · **NPR 6,500 / HKD 450** · stock 12/variant · *New*
High-rise flare with a crossover waist and a fluid drape from knee to floor-sweeping hem.
Features: crossover high rise · flare leg · buttery knit · four-way stretch.
Tags: flare, yoga pant, high rise, crossover.

**13. Cozy Fleece Jogger** `cozy-fleece-jogger` · Bottoms · Loungewear · Travel · Brushed Fleece
Colours: Espresso, Onyx, Sandstone, Chalk · **NPR 6,900 / HKD 480** · stock 12/variant
Brushed-fleece jogger with a tapered leg and drop-in pockets — the off-duty default.
Features: brushed interior · tapered leg · zip pockets · ribbed cuff.
Tags: jogger, fleece, loungewear, cosy.

**14. Journey Travel Ankle Pant** `journey-travel-ankle-pant` · Bottoms · Outerwear & Layers, New Arrivals · Travel · Recycled Nylon
Colours: Slate, Onyx, Sandstone, Espresso · **NPR 7,900 / HKD 540** · stock 10/variant
Wrinkle-shedding travel ankle pant with a stretch waist and zip security pockets.
Features: wrinkle-resistant · hidden zip pockets · stretch waist · tapered ankle.
Tags: travel pant, ankle, wrinkle resistant.

### Sets (4)

**15. Serenity Yoga Set (Bra + Legging)** `serenity-yoga-set` · Sets · Studio & Yoga, New Arrivals · Yoga · Performance Knit
Colours: Soft Sage, Onyx, Sandstone, Chalk · **NPR 9,900 / HKD 690** · stock 10/variant · *Best Seller*
Deep-V longline bra and matching high-rise 7/8 — a second-skin set that moves as one.
Features: matching set · deep-V longline bra · high-rise legging · removable pads.
Tags: yoga set, matching set, deep v, two piece.

**16. Brushed Lounge Set (Long-Sleeve + Legging)** `brushed-lounge-set` · Sets · Loungewear · Travel · Brushed Fleece
Colours: Sandstone, Chalk, Espresso, Soft Sage · **NPR 10,900 / HKD 750** · stock 8/variant
Ultra-soft brushed set — a slouchy long-sleeve with a high-rise legging for rest days and travel.
Features: matching set · brushed hand-feel · slouchy top · high-rise legging.
Tags: lounge set, brushed, soft, two piece.

**17. Sculpt Seamless Set (Bra + Short)** `sculpt-seamless-set` · Sets · Performance Essentials · Train · Performance Knit
Colours: Onyx, Slate, Soft Sage, Sandstone · **NPR 9,900 / HKD 690** · stock 10/variant
Ribbed seamless workout set — a medium-support bra with a 5" contour short for the gym floor.
Features: matching set · ribbed seamless knit · medium support · squat-proof short.
Tags: workout set, seamless, ribbed, gym.

**18. Grace Sleeveless Unitard** `grace-sleeveless-unitard` · Sets · Studio & Yoga, New Arrivals · Yoga/Train · Performance Knit
Colours: Onyx, Espresso, Soft Sage, Sandstone · **NPR 8,900 / HKD 620** · stock 10/variant · *New*
Breathable sleeveless one-piece with a built-in shelf bra and a sculpting 7/8 length.
Features: one-piece · built-in shelf bra · scoop back · squat-proof.
Tags: unitard, one piece, sleeveless, bodysuit.

### Outerwear & Layers (2)

**19. Ascent Hybrid Jacket** `ascent-hybrid-jacket` · Tops (Outerwear) · Outerwear & Layers · Travel/Run · Recycled Nylon
Colours: Onyx, Slate, Sandstone, Espresso · **NPR 12,900 / HKD 890** · stock 8/variant · *New*
Wind-and-water-resistant hybrid shell with stretch side panels and zip pockets — trail to transit.
Features: water-resistant shell · stretch panels · zip hand pockets · adjustable hem.
Tags: jacket, hybrid, water resistant, outerwear.

**20. Ember Brushed Hoodie** `ember-brushed-hoodie` · Tops (Outerwear) · Outerwear & Layers, Loungewear · Travel · Brushed Fleece
Colours: Espresso, Onyx, Chalk, Sandstone · **NPR 8,900 / HKD 620** · stock 10/variant
Heavyweight brushed hoodie with a double-layer hood and kangaroo pocket — cocoon warmth.
Features: brushed interior · double-layer hood · kangaroo pocket · ribbed cuffs.
Tags: hoodie, brushed, warm, loungewear.

---

## Summary

| Metric | Value |
|---|---|
| Products | **20** |
| Tops / Bottoms / Sets / Outerwear | 7 / 7 / 4 / 2 |
| Colours (palette) | 6 (each product uses 4–5) |
| Sizes | XS–XXL |
| Collections | 5 (each product mapped to 1–2) |
| Price range | NPR 3,500–12,900 (HKD 250–890) |
| Images / product | 4–8 (per-colour front/macro/on-model galleries) |
| Badges | Best Seller ×3, New ×5 (drives the card badge + sale UI) |

**Next (Phase 3):** codify these into the structured dataset — Product → Variants (colour × size) →
per-colour image galleries → pricing (NPR/HKD) → inventory → SEO/slugs → tags/facets — extending
`persona.ts` and the seed with original names, ready for Phase 5 import.
