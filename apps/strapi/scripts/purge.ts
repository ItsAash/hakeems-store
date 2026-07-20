/**
 * Strapi content purge — clears all authored content and uploaded media so the seed can rebuild
 * from a clean slate. Boots Strapi's core (no HTTP server), like the seed. Safe to run before the
 * Medusa seed, since collection-pages are recreated by Medusa's collection-sync subscriber.
 *
 * SAFETY: dry-run by default. Pass `--execute` to actually delete.
 *
 * Run with: pnpm --filter @lopho/strapi purge -- --execute
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';
import type { Core, UID } from '@strapi/strapi';

const EXECUTE = process.argv.includes('--execute');

const CONTENT_TYPES: UID.ContentType[] = [
  'api::page.page',
  'api::legal-page.legal-page',
  'api::collection-page.collection-page',
  'api::brand-story.brand-story',
  'api::site-nav.site-nav',
  'api::site-setting.site-setting',
];

async function main() {
  const { distDir } = await compileStrapi();
  const app: Core.Strapi = await createStrapi({ distDir }).load();
  app.log.level = 'error';

  const counts: Record<string, number> = {};
  for (const uid of CONTENT_TYPES) {
    counts[uid] = await app.db.query(uid).count({});
  }
  const files = await app.db.query('plugin::upload.file').findMany({ select: ['id'] });

  console.log('Strapi purge plan:');
  for (const uid of CONTENT_TYPES) console.log(`  ${uid}: ${counts[uid]}`);
  console.log(`  media files: ${files.length}`);

  if (!EXECUTE) {
    console.log('\nDry run — pass --execute to delete. Nothing was changed.');
    process.exit(0);
  }

  for (const uid of CONTENT_TYPES) {
    if (counts[uid] > 0) {
      await app.db.query(uid).deleteMany({ where: {} });
      console.log(`Cleared ${uid} (${counts[uid]})`);
    }
  }

  // Remove media through the upload service so the underlying files (disk/provider) are cleaned
  // up too, not just the DB rows.
  const uploadService = app.plugin('upload').service('upload');
  for (const file of files) {
    const full = await app.db.query('plugin::upload.file').findOne({ where: { id: file.id } });
    if (full) await uploadService.remove(full);
  }
  console.log(`Removed ${files.length} media files`);
  console.log('Strapi purge complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
