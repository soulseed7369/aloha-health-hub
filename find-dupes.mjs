// Read-only duplicate finder for centers & practitioners.
// Uses service role key from .env. No writes.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/sessions/exciting-jolly-gates/mnt/hawaii-wellness/.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function norm(s) {
  return (s ?? '').toString().trim().toLowerCase();
}

async function findDupes(table) {
  console.log(`\n==== ${table.toUpperCase()} ====`);
  const { data, error } = await sb
    .from(table)
    .select('id, name, email, website_url, island, city, owner_id, status, created_at')
    .neq('status', 'archived')
    .order('created_at', { ascending: true });
  if (error) {
    console.error(`  ERROR: ${error.message}`);
    return;
  }
  console.log(`  Total active rows: ${data.length}`);

  // Group by lower(name) + island
  const byName = new Map();
  for (const r of data) {
    const k = `${norm(r.name)}|${r.island ?? ''}`;
    if (!k.startsWith('|')) {
      if (!byName.has(k)) byName.set(k, []);
      byName.get(k).push(r);
    }
  }
  const nameDupes = [...byName.values()].filter((v) => v.length > 1);

  // Group by lower(email)
  const byEmail = new Map();
  for (const r of data) {
    const k = norm(r.email);
    if (k) {
      if (!byEmail.has(k)) byEmail.set(k, []);
      byEmail.get(k).push(r);
    }
  }
  const emailDupes = [...byEmail.values()].filter((v) => v.length > 1);

  // Group by normalized website (strip protocol + trailing slash + www)
  const byWebsite = new Map();
  for (const r of data) {
    let k = norm(r.website_url)
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
    if (k) {
      if (!byWebsite.has(k)) byWebsite.set(k, []);
      byWebsite.get(k).push(r);
    }
  }
  const webDupes = [...byWebsite.values()].filter((v) => v.length > 1);

  console.log(`  Duplicate groups by (lower(name), island): ${nameDupes.length}`);
  console.log(`  Duplicate groups by lower(email):          ${emailDupes.length}`);
  console.log(`  Duplicate groups by normalized website:    ${webDupes.length}`);

  // Union: any row that appears in any dup group
  const dupRowIds = new Set();
  for (const g of [...nameDupes, ...emailDupes, ...webDupes]) {
    for (const r of g) dupRowIds.add(r.id);
  }
  console.log(`  Total rows touched by any duplicate group: ${dupRowIds.size}`);

  // Show the name-based dup groups with their details
  if (nameDupes.length > 0) {
    console.log(`\n  --- ${table} dup groups by name+island ---`);
    for (const g of nameDupes.slice(0, 30)) {
      console.log(`\n  [${g[0].name} / ${g[0].island}]`);
      for (const r of g) {
        console.log(
          `    ${r.id}  owner=${r.owner_id ? r.owner_id.slice(0, 8) : 'NULL    '}  status=${r.status.padEnd(9)}  created=${r.created_at?.slice(0, 10)}  email=${r.email ?? '-'}`,
        );
      }
    }
    if (nameDupes.length > 30) console.log(`\n  ... and ${nameDupes.length - 30} more`);
  }

  // Show email-only dupes that weren't already shown by name
  const nameShownIds = new Set(nameDupes.flat().map((r) => r.id));
  const emailOnly = emailDupes.filter((g) => !g.every((r) => nameShownIds.has(r.id)));
  if (emailOnly.length > 0) {
    console.log(`\n  --- ${table} dup groups by email (not caught by name) ---`);
    for (const g of emailOnly.slice(0, 20)) {
      console.log(`\n  [email=${g[0].email}]`);
      for (const r of g) {
        console.log(
          `    ${r.id}  owner=${r.owner_id ? r.owner_id.slice(0, 8) : 'NULL    '}  name="${r.name}"  island=${r.island}  status=${r.status}  created=${r.created_at?.slice(0, 10)}`,
        );
      }
    }
  }

  // Users who own 2+ rows (the specific create-then-claim bug signature)
  const byOwner = new Map();
  for (const r of data) {
    if (r.owner_id) {
      if (!byOwner.has(r.owner_id)) byOwner.set(r.owner_id, []);
      byOwner.get(r.owner_id).push(r);
    }
  }
  const multiOwner = [...byOwner.entries()].filter(([, v]) => v.length > 1);
  console.log(`\n  Users owning 2+ active ${table}: ${multiOwner.length}`);
  for (const [uid, rows] of multiOwner.slice(0, 20)) {
    console.log(`    owner ${uid.slice(0, 8)}:`);
    for (const r of rows) {
      console.log(
        `      ${r.id}  name="${r.name}"  island=${r.island}  status=${r.status}  created=${r.created_at?.slice(0, 10)}`,
      );
    }
  }
}

await findDupes('centers');
await findDupes('practitioners');

// Highlight the Ohana Bali Spa case specifically
console.log('\n==== Ohana Bali Spa specific ====');
const { data: ohana } = await sb
  .from('centers')
  .select('*')
  .ilike('name', '%ohana bali%');
console.log(JSON.stringify(ohana, null, 2));
