import 'dotenv/config';

/**
 * Vendure catalogue purge — deletes all products, collections, facets and assets via the Admin
 * API so the seed can rebuild from a clean slate. Channels, zones, tax, shipping and payment
 * config are left intact (they are infrastructure, not catalogue). Idempotent and paginated.
 *
 * SAFETY: dry-run by default. Pass `--execute` to actually delete. Normally invoked by the
 * root orchestrator (scripts/seed-production.ts), which owns the target-DB safety gate.
 */

const ADMIN_API_URL = process.env.VENDURE_ADMIN_API_URL || 'http://localhost:3000/admin-api';
const USERNAME = process.env.SUPERADMIN_USERNAME || 'superadmin';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin';
const EXECUTE = process.argv.includes('--execute');

let authToken = '';

type GraphQLResult<T> = { data?: T; errors?: Array<{ message: string }> };

async function adminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const token = res.headers.get('vendure-auth-token');
  if (token) authToken = token;
  const json = (await res.json()) as GraphQLResult<T>;
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data as T;
}

async function login() {
  await adminFetch(
    `mutation Login($u: String!, $p: String!) {
      login(username: $u, password: $p) { ... on CurrentUser { id } ... on ErrorResult { message } }
    }`,
    { u: USERNAME, p: PASSWORD },
  );
}

/** Collect every id from a paginated Admin list query (100 at a time). */
async function collectIds(
  field: string,
  extra = '',
  keep: (item: { id: string; [k: string]: unknown }) => boolean = () => true,
): Promise<string[]> {
  const ids: string[] = [];
  let skip = 0;
  for (;;) {
    const data = await adminFetch<Record<string, { items: Array<{ id: string }>; totalItems: number }>>(
      `query List($skip: Int!) { ${field}(options: { take: 100, skip: $skip }) { items { id ${extra} } totalItems } }`,
      { skip },
    );
    const page = data[field];
    ids.push(...page.items.filter(keep).map((i) => i.id));
    skip += 100;
    if (skip >= page.totalItems) break;
  }
  return ids;
}

async function main() {
  await login();

  const productIds = await collectIds('products');
  // The root collection has no parent and cannot be deleted; every real collection is nested
  // under it, so keeping only those with a parent excludes the root.
  const collectionIds = await collectIds('collections', 'parent { id }', (c) => c.parent != null);
  const facetIds = await collectIds('facets');
  const assetIds = await collectIds('assets');

  console.log('Vendure purge plan:');
  console.log(`  products:    ${productIds.length}`);
  console.log(`  collections: ${collectionIds.length} (excluding root)`);
  console.log(`  facets:      ${facetIds.length}`);
  console.log(`  assets:      ${assetIds.length}`);

  if (!EXECUTE) {
    console.log('\nDry run — pass --execute to delete. Nothing was changed.');
    return;
  }

  if (collectionIds.length) {
    await adminFetch(`mutation Del($ids: [ID!]!) { deleteCollections(ids: $ids) { result message } }`, { ids: collectionIds });
    console.log(`Deleted ${collectionIds.length} collections`);
  }
  if (productIds.length) {
    await adminFetch(`mutation Del($ids: [ID!]!) { deleteProducts(ids: $ids) { result message } }`, { ids: productIds });
    console.log(`Deleted ${productIds.length} products`);
  }
  if (facetIds.length) {
    await adminFetch(`mutation Del($ids: [ID!]!) { deleteFacets(ids: $ids, force: true) { result message } }`, { ids: facetIds });
    console.log(`Deleted ${facetIds.length} facets`);
  }
  if (assetIds.length) {
    await adminFetch(`mutation Del($ids: [ID!]!) { deleteAssets(input: { assetIds: $ids, force: true }) { result message } }`, {
      ids: assetIds,
    });
    console.log(`Deleted ${assetIds.length} assets`);
  }
  console.log('Vendure purge complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
