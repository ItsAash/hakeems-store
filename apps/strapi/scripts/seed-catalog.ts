/**
 * Catalog seeder (Strapi side) — consumes the REVIEWED mapping.json built by
 * scraped-data/athleta/build-mapping.py (see ENTERPRISE_OVERHAUL_LOG.md Part III).
 *
 * 1. Uploads every scraped colorway image to the media library ONCE (idempotent by
 *    deterministic file name `catalog-<style>-<color>-NN.jpg`).
 * 2. Upserts one product-page per product: description-derived panels + one
 *    colorway-gallery per color, gallery = exactly that colorway's images in order.
 * 3. Deletes product-pages whose productSlug is not in the mapping (retired demo catalog).
 * 4. Writes upload-manifest.json (image path -> {id,url}) for the Medusa seeder.
 *
 * Run: pnpm --filter @lopho/strapi seed:catalog   (safe to re-run)
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileStrapi, createStrapi } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

const ATHLETA_DIR = path.resolve(process.cwd(), '../../scraped-data/athleta');

type Colorway = {
  name: string;
  folder: string;
  hex: string;
  priceUsd: number;
  priceNpr: number;
  priceHkd: number;
  images: string[];
};
type MappedProduct = {
  style_folder: string;
  handle: string;
  title: string;
  category: string;
  sizes: string[];
  description: string;
  fullDescription: string;
  panels: Array<{ title: string; content: string }>;
  colorways: Colorway[];
  collections: string[];
};

async function uploadLocalImage(
  strapi: Core.Strapi,
  absPath: string,
  fileName: string,
): Promise<{ id: number; url: string }> {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: fileName } });
  if (existing) return { id: existing.id, url: existing.url };

  const uploadService = strapi.plugin('upload').service('upload');
  const [uploaded] = await uploadService.upload({
    data: {},
    files: {
      filepath: absPath,
      originalFilename: fileName,
      mimetype: 'image/jpeg',
      size: fs.statSync(absPath).size,
    },
  });
  return { id: uploaded.id, url: uploaded.url };
}

async function main() {
  const mappingPath = path.join(ATHLETA_DIR, 'mapping.json');
  const mapping: MappedProduct[] = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  const { distDir } = await compileStrapi();
  const app = await createStrapi({ distDir }).load();
  app.log.level = 'error';

  const manifest: Record<string, { id: number; url: string }> = {};
  let uploadedCount = 0;

  for (const product of mapping) {
    for (const colorway of product.colorways) {
      for (const rel of colorway.images) {
        const abs = path.join(ATHLETA_DIR, rel);
        const fileName = `catalog-${rel.replace(/\//g, '-').toLowerCase()}`;
        manifest[rel] = await uploadLocalImage(app, abs, fileName);
        uploadedCount += 1;
        if (uploadedCount % 50 === 0) console.log(`  media: ${uploadedCount} images processed`);
      }
    }
  }
  console.log(`Media library: ${uploadedCount} catalog images present (deduped by name)`);

  const uid = 'api::product-page.product-page' as const;
  for (const product of mapping) {
    const data: any = {
      productSlug: product.handle,
      panels: product.panels,
      colorways: product.colorways.map((colorway) => ({
        colorName: colorway.name,
        colorHex: colorway.hex,
        gallery: colorway.images.map((rel) => manifest[rel].id),
      })),
    };
    const existing = await app.documents(uid).findFirst({ filters: { productSlug: product.handle }, status: 'draft' });
    let documentId: string;
    if (existing) {
      await app.documents(uid).update({ documentId: existing.documentId, data });
      documentId = existing.documentId;
    } else {
      const created = await app.documents(uid).create({ data });
      documentId = created.documentId;
    }
    await app.documents(uid).publish({ documentId });
  }
  console.log(`Upserted ${mapping.length} product-pages with colorway galleries`);

  // Retire product-pages for products no longer in the catalog (old demo seed).
  const keep = new Set(mapping.map((p) => p.handle));
  const all = await app.documents(uid).findMany({ fields: ['productSlug'], status: 'draft', pagination: { limit: 500 } } as any);
  let removed = 0;
  for (const entry of all as any[]) {
    if (!keep.has(entry.productSlug)) {
      await app.documents(uid).delete({ documentId: entry.documentId });
      removed += 1;
    }
  }
  console.log(`Removed ${removed} stale product-pages`);

  fs.writeFileSync(path.join(ATHLETA_DIR, 'upload-manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('Wrote upload-manifest.json for the Medusa seeder');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
