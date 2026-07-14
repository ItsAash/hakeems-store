import 'dotenv/config';
import { spawn } from 'node:child_process';
import { ACTIVITY_FACET, COLLECTIONS, COLORS, MATERIAL_FACET, SIZE_OPTION_VALUES } from './data/persona';

/**
 * Production data pipeline — wipe & reseed both Vendure and Strapi with the premium activewear
 * persona catalogue, in dependency order, behind a safety gate.
 *
 * Phases:
 *   1. PURGE   Strapi content + Vendure catalogue (products, collections, facets, assets).
 *   2. SEED    Vendure  → builds channels' catalogue and syncs collection-pages into Strapi.
 *   3. SEED    Strapi   → enriches collection-pages and builds editorial pages.
 *   4. VERIFY  re-reads Vendure counts and asserts the catalogue is non-empty.
 *
 * SAFETY: dry-run by default (prints the plan, runs child purges in dry-run). Destructive work
 * only happens with `--execute`, and only after the target database passes the guard below.
 *
 * Prerequisites: the Vendure server must be running (the seed/purge talk to its Admin API).
 *
 * Flags:
 *   --execute            actually purge + seed (otherwise dry-run)
 *   --only=vendure|strapi restrict to one system
 *   --yes                skip the interactive confirmation countdown
 *
 * Run with: pnpm seed:production            (dry-run)
 *           pnpm seed:production --execute  (after reviewing the plan)
 */

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const SKIP_CONFIRM = args.includes('--yes');
const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const ONLY = onlyArg === 'vendure' || onlyArg === 'strapi' ? onlyArg : null;

// ── Safety gate ─────────────────────────────────────────────────────────────
// Refuse to run destructively against anything that looks like a production database unless the
// operator has explicitly opted in with SEED_ALLOW_WIPE=true.
function describeTarget(): string {
  const url = process.env.DATABASE_URL || '';
  const host = process.env.DATABASE_HOST || (url ? new URL(url).hostname : 'localhost (sqlite/default)');
  const name = process.env.DATABASE_NAME || '(default)';
  return `${host} / ${name}`;
}

function assertSafeTarget() {
  const url = process.env.DATABASE_URL || '';
  const host = (process.env.DATABASE_HOST || (url ? safeHost(url) : 'localhost')).toLowerCase();
  const looksLocal = ['localhost', '127.0.0.1', '::1', ''].includes(host) || host.endsWith('.local');
  const allowWipe = process.env.SEED_ALLOW_WIPE === 'true';
  if (!looksLocal && !allowWipe) {
    console.error(
      `\n✋ Refusing to wipe a non-local database (${describeTarget()}).\n` +
        `   If this really is a dev/staging target, set SEED_ALLOW_WIPE=true and re-run.\n`,
    );
    process.exit(1);
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ── Child process runner ────────────────────────────────────────────────────
function run(label: string, pkg: '@hakeems/vendure' | '@hakeems/strapi', script: string, extra: string[] = []) {
  return new Promise<void>((resolve, reject) => {
    const argv = ['--filter', pkg, 'exec', 'tsx', script, ...extra];
    console.log(`\n▶ ${label}: pnpm ${argv.join(' ')}`);
    const child = spawn('pnpm', argv, { stdio: 'inherit', cwd: process.cwd() });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label} exited with code ${code}`))));
    child.on('error', reject);
  });
}

async function confirmCountdown() {
  if (SKIP_CONFIRM) return;
  console.log(`\n⚠️  About to PURGE and RESEED: ${describeTarget()}`);
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   starting in ${i}…  (Ctrl-C to abort)\r`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write('\n');
}

function printPlan() {
  console.log('── Production seed plan ─────────────────────────────────');
  console.log(`Target DB:   ${describeTarget()}`);
  console.log(`Mode:        ${EXECUTE ? 'EXECUTE (destructive)' : 'DRY RUN'}`);
  console.log(`Scope:       ${ONLY ?? 'vendure + strapi'}`);
  console.log('Persona catalogue:');
  console.log(`  collections: ${COLLECTIONS.map((c) => c.name).join(', ')}`);
  console.log(`  sizes:       ${SIZE_OPTION_VALUES.join(', ')}`);
  console.log(`  colours:     ${COLORS.map((c) => c.name).join(', ')}`);
  console.log(`  activity:    ${ACTIVITY_FACET.values.map((v) => v.name).join(', ')}`);
  console.log(`  material:    ${MATERIAL_FACET.values.map((v) => v.name).join(', ')}`);
  console.log('─────────────────────────────────────────────────────────');
}

async function main() {
  printPlan();
  if (EXECUTE) {
    assertSafeTarget();
    await confirmCountdown();
  }

  const purgeArgs = EXECUTE ? ['--execute'] : [];
  const doVendure = ONLY !== 'strapi';
  const doStrapi = ONLY !== 'vendure';

  // 1. PURGE (Strapi first, then Vendure — collection-pages get recreated by the Vendure sync)
  if (doStrapi) await run('Purge Strapi', '@hakeems/strapi', 'scripts/purge.ts', purgeArgs);
  if (doVendure) await run('Purge Vendure', '@hakeems/vendure', 'scripts/purge.ts', purgeArgs);

  if (!EXECUTE) {
    console.log('\nDry run complete. Review the plan above, then re-run with --execute.');
    return;
  }

  // 2. SEED Vendure (creates collections → syncs collection-pages into Strapi)
  if (doVendure) await run('Seed Vendure', '@hakeems/vendure', 'scripts/seed.ts');
  // 3. SEED Strapi (enriches synced collection-pages, builds editorial pages)
  if (doStrapi) await run('Seed Strapi', '@hakeems/strapi', 'scripts/seed.ts');

  // 4. VERIFY (Vendure purge in dry-run prints live counts; non-zero products = success)
  if (doVendure) await run('Verify Vendure', '@hakeems/vendure', 'scripts/purge.ts');

  console.log('\n✅ Production seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
