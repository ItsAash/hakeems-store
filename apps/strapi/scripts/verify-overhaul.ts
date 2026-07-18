/**
 * Read-only post-seed verification for the storefront overhaul: confirms the colorway
 * galleries and the new dynamic-zone sections landed. Run: pnpm tsx scripts/verify-overhaul.ts
 */
import { compileStrapi, createStrapi } from '@strapi/strapi';

async function main() {
  const { distDir } = await compileStrapi();
  const app = await createStrapi({ distDir }).load();
  app.log.level = 'error';

  const productPages = await app.documents('api::product-page.product-page').findMany({
    populate: { panels: true, colorways: { populate: '*' } } as any,
    status: 'published',
  });
  for (const page of productPages as any[]) {
    const colorways = (page.colorways ?? [])
      .map((c: any) => `${c.colorName} ${c.colorHex} (${c.gallery?.length ?? 0} imgs)`)
      .join(' | ');
    console.log(`product-page ${page.productSlug}: panels=${page.panels?.length ?? 0}, colorways: ${colorways}`);
  }

  for (const channel of ['nepal', 'hongkong'] as const) {
    const page: any = await app.documents('api::page.page').findFirst({
      filters: { slug: 'home', channel },
      populate: { sections: { populate: '*' } } as any,
      status: 'published',
    });
    console.log(`home[${channel}] sections: ${(page?.sections ?? []).map((s: any) => s.__component).join(', ')}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
