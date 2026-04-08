// Full dup finder — pages through all rows, bypassing 1000-row default.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('./.env', 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const norm = (s) => (s ?? '').toString().trim().toLowerCase();

// Placeholders to exclude from email dup analysis — pipeline/GMB noise
const PLACEHOLDER_EMAILS = new Set([
  'info@mysite.com', 'info@workstar.com', 'info@example.com', 'info@gmail.com',
  'noreply@gmail.com', 'test@test.com',
]);

async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select('id, name, email, website_url, island, city, phone, owner_id, status, created_at, email_verified_at')
      .neq('status', 'archived')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function normWebsite(w) {
  return norm(w).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').split('?')[0];
}
function normPhone(p) {
  return (p ?? '').toString().replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
}

async function analyze(table) {
  console.log(`\n======== ${table.toUpperCase()} ========`);
  const rows = await fetchAll(table);
  console.log(`  Total active rows: ${rows.length}`);

  const groupBy = (keyFn, label, filter = () => true) => {
    const m = new Map();
    for (const r of rows) {
      if (!filter(r)) continue;
      const k = keyFn(r);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    const dupes = [...m.values()].filter((v) => v.length > 1);
    console.log(`  ${label}: ${dupes.length} dup groups, ${dupes.reduce((s, g) => s + g.length, 0)} rows`);
    return dupes;
  };

  const byName = groupBy((r) => (norm(r.name) && r.island ? `${norm(r.name)}|${r.island}` : null), 'by (lower(name), island)');
  const byEmail = groupBy(
    (r) => norm(r.email) || null,
    'by lower(email) [excluding placeholders]',
    (r) => norm(r.email) && !PLACEHOLDER_EMAILS.has(norm(r.email)),
  );
  const byWebsite = groupBy((r) => normWebsite(r.website_url) || null, 'by normalized website');
  const byPhone = groupBy((r) => normPhone(r.phone) || null, 'by normalized phone', (r) => normPhone(r.phone).length === 10);

  // Union
  const allDupIds = new Set();
  for (const g of [...byName, ...byEmail, ...byWebsite, ...byPhone]) for (const r of g) allDupIds.add(r.id);
  console.log(`  Total rows in ANY dup group: ${allDupIds.size}`);

  // Specifically the "two users own listings for the same business" signature
  console.log(`\n  --- Cross-user duplicates (different owners OR owner+unclaimed) ---`);
  const crossUser = [];
  const seen = new Set();
  for (const g of [...byEmail, ...byWebsite, ...byPhone]) {
    const key = g.map((r) => r.id).sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const owners = new Set(g.map((r) => r.owner_id || 'NULL'));
    if (owners.size > 1) crossUser.push(g);
  }
  console.log(`  ${crossUser.length} cross-owner dup groups`);
  for (const g of crossUser.slice(0, 50)) {
    console.log('');
    for (const r of g) {
      console.log(
        `    ${r.id}  owner=${(r.owner_id ?? 'NULL').slice(0, 8).padEnd(8)}  status=${r.status.padEnd(9)}  name="${r.name}"  email=${r.email ?? '-'}  created=${r.created_at?.slice(0, 10)}`,
      );
    }
  }

  return { rows, allDupIds, crossUser };
}

const cen = await analyze('centers');
const prc = await analyze('practitioners');

// Also look at cross-table dupes (same business present in both centers AND practitioners)
console.log('\n======== CROSS-TABLE (centers + practitioners) ========');
const allRows = [...cen.rows.map((r) => ({ ...r, _t: 'center' })), ...prc.rows.map((r) => ({ ...r, _t: 'practitioner' }))];
const crossEmail = new Map();
for (const r of allRows) {
  const k = norm(r.email);
  if (!k || PLACEHOLDER_EMAILS.has(k)) continue;
  if (!crossEmail.has(k)) crossEmail.set(k, []);
  crossEmail.get(k).push(r);
}
const crossDupes = [...crossEmail.values()].filter((g) => new Set(g.map((r) => r._t)).size > 1);
console.log(`  ${crossDupes.length} email groups that span both tables`);
for (const g of crossDupes.slice(0, 30)) {
  console.log('');
  for (const r of g) {
    console.log(`    [${r._t.padEnd(12)}] ${r.id}  owner=${(r.owner_id ?? 'NULL').slice(0, 8).padEnd(8)}  status=${r.status.padEnd(9)}  name="${r.name}"  email=${r.email}`);
  }
}
