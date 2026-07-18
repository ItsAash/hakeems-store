# Athleta Catalog — Dev Seed Scrape

Source: https://athleta.gap.com

Scope: 20 product styles x their available color variants.
Totals: 20 styles, 99 color variants, 518 images.

## Structure
    NN_PRODUCT_NAME/
        COLOR_NAME/
            COLOR_NAME_01.jpg ...   (full-resolution product images)
            metadata.json           (machine-readable)
            metadata.txt            (human-readable)
    catalog.json / catalog.csv      (flat index of every color variant)

## Metadata fields
product_name, color, parent_color, full_name, category, description, price + currency,
sizes_available, materials, rating, rating_count, sku_style, sku_color, brand, source_url,
image_files, image_source_urls.

NOTE: These are Athleta's / Gap Inc.'s copyrighted assets, scraped for internal dev/demo
catalog seeding only. Do not publish or redistribute.
