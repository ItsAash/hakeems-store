/**
 * Read-only post-seed audit: every product-page's colorways/galleries must match
 * mapping.json exactly — same colorway set, same gallery sizes, correct hexes, no
 * stale/orphaned entries. Exits 1 on any mismatch.
 *
 * Run: npx tsx scripts/verify-catalog.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileStrapi, createStrapi } from '@strapi/strapi';

const ATHLETA_DIR = path.resolve(process.cwd(), '../../scraped-data/athleta');

async function main() {
  const mapping: any[] = JSON.parse(fs.readFileSync(path.join(ATHLETA_DIR, 'mapping.json'), 'utf8'));
  const byHandle = new Map(mapping.map((p) => [p.handle, p]));

  const { distDir } = await compileStrapi();
  const app = await createStrapi({ distDir }).load();
  app.log.level = 'error';

  const pages: any[] = await app.documents('api::product-page.product-page').findMany({
    populate: { colorways: { populate: '*' }, panels: true } as any,
    status: 'published',
    pagination: { limit: 500 },
  } as any);

  const problems: string[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    seen.add(page.productSlug);
    const expected = byHandle.get(page.productSlug);
    if (!expected) {
      problems.push(`ORPHAN product-page: ${page.productSlug} (not in mapping)`);
      continue;
    }
    const expectedColors = new Map(expected.colorways.map((c: any) => [c.name, c]));
    const actualColors = new Map((page.colorways ?? []).map((c: any) => [c.colorName, c]));
    for (const [name, exp] of expectedColors) {
      const act: any = actualColors.get(name);
      if (!act) { problems.push(`${page.productSlug}: MISSING colorway "${name}"`); continue; }
      if (act.colorHex !== (exp as any).hex)
        problems.push(`${page.productSlug}/${name}: hex ${act.colorHex} != mapping ${(exp as any).hex}`);
      const galleryCount = (act.gallery ?? []).length;
      if (galleryCount !== (exp as any).images.length)
        problems.push(`${page.productSlug}/${name}: gallery ${galleryCount} imgs != mapping ${(exp as any).images.length}`);
      const missingMedia = (act.gallery ?? []).filter((m: any) => !m?.url).length;
      if (missingMedia > 0) problems.push(`${page.productSlug}/${name}: ${missingMedia} gallery entries without media`);
    }
    for (const name of actualColors.keys()) {
      if (!expectedColors.has(name)) problems.push(`${page.productSlug}: EXTRA colorway "${name}" not in mapping`);
    }
  }
  for (const p of mapping) {
    if (!seen.has(p.handle)) problems.push(`MISSING product-page for ${p.handle}`);
  }

  const totalColorways = pages.reduce((n, p) => n + (p.colorways?.length ?? 0), 0);
  const totalImages = pages.reduce(
    (n, p) => n + (p.colorways ?? []).reduce((m: number, c: any) => m + (c.gallery?.length ?? 0), 0),
    0,
  );
  console.log(`product-pages: ${pages.length}, colorways: ${totalColorways}, gallery images: ${totalImages}`);
  if (problems.length) {
    console.error(`\n${problems.length} PROBLEMS:\n` + problems.join('\n'));
    process.exit(1);
  }
  console.log('Catalog audit: all colorway/gallery relationships match the mapping. ✓');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
