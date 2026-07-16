/**
 * Pre-generates every product+colour image into the local cache (scripts/data/generated-images),
 * so the Vendure seed can upload them fast and offline.
 *
 * Run:  pnpm images        (root)   — or   pnpm --filter @hakeems/vendure exec tsx ../../scripts/generate-catalog-images.ts
 * Env:  CATALOG_IMAGE_PROVIDER=pollinations|loremflickr   (default pollinations)
 *       CATALOG_IMAGE_CONCURRENCY=5                        (parallel downloads)
 *
 * Idempotent: images already present (and valid) in the cache are skipped, so re-runs only
 * fill gaps. To regenerate from scratch, delete scripts/data/generated-images.
 */
import { PRODUCTS } from './data/persona';
import { CACHE_DIR, IMAGE_PROVIDER, ImageSpec, loadImageBytes, productImageSpecs } from './data/images';

// Pollinations rate-limits bursts, so keep concurrency low; the pipeline's retries/back-off
// recover any throttled request. 3 is a good balance of speed and reliability.
const CONCURRENCY = Number(process.env.CATALOG_IMAGE_CONCURRENCY) || 3;
const LIMIT = Number(process.env.CATALOG_IMAGE_LIMIT) || 0; // 0 = all (used for quick validation)

async function main() {
  // Collect a de-duplicated set of specs (a product's gallery == its primary colour's specs).
  const specsByName = new Map<string, ImageSpec>();
  for (const product of PRODUCTS) {
    const { byColorCode } = productImageSpecs(product);
    for (const specs of Object.values(byColorCode)) {
      for (const spec of specs) specsByName.set(spec.fileName, spec);
    }
  }
  const specs = LIMIT > 0 ? [...specsByName.values()].slice(0, LIMIT) : [...specsByName.values()];

  console.log(`Image pipeline: provider=${IMAGE_PROVIDER}  target=${specs.length} images  concurrency=${CONCURRENCY}`);
  console.log(`Cache: ${CACHE_DIR}\n`);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // One pass over a list of specs. Failures are cheap (few attempts) because a self-healing loop
  // re-runs them after a cooldown — far faster than expensive per-image retries when the provider
  // is rate-limiting, since a throttled minute poisons every retry anyway.
  async function pass(todo: ImageSpec[], passNo: number): Promise<ImageSpec[]> {
    let done = 0;
    const remaining: ImageSpec[] = [];
    const queue = [...todo];
    async function worker() {
      for (let spec = queue.shift(); spec; spec = queue.shift()) {
        const bytes = await loadImageBytes(spec, { attempts: 2, writeCache: true });
        done++;
        if (!bytes) {
          remaining.push(spec);
          console.log(`  p${passNo} [${done}/${todo.length}] ✗ ${spec.fileName}`);
        } else {
          console.log(`  p${passNo} [${done}/${todo.length}] ✓ ${(bytes.length / 1024).toFixed(0)}KB  ${spec.fileName}`);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
    return remaining;
  }

  const MAX_PASSES = 8;
  let todo = specs;
  for (let passNo = 1; passNo <= MAX_PASSES && todo.length; passNo++) {
    console.log(`\n── Pass ${passNo}: ${todo.length} to fetch ──`);
    const remaining = await pass(todo, passNo);
    console.log(`   pass ${passNo}: ${todo.length - remaining.length} ok, ${remaining.length} left`);
    todo = remaining;
    if (todo.length && passNo < MAX_PASSES) {
      console.log('   cooling down 30s before retrying the stragglers…');
      await sleep(30_000);
    }
  }

  const total = specs.length;
  console.log(`\nDone. ${total - todo.length}/${total} images cached, ${todo.length} still failing.`);
  if (todo.length) {
    console.log('Persistent failures (re-run `pnpm images` later):');
    for (const spec of todo) console.log('  - ' + spec.fileName);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
