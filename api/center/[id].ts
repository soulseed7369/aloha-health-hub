import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE = 'https://hawaiiwellness.net';
const ISLAND_LABEL: Record<string, string> = {
  big_island: 'Big Island', maui: 'Maui', oahu: 'Oʻahu', kauai: 'Kauaʻi',
};
const CENTER_TYPE_LABEL: Record<string, string> = {
  spa: 'Spa', wellness_center: 'Wellness Center', clinic: 'Clinic',
  retreat_center: 'Retreat Center', fitness_center: 'Fitness Center',
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).send('Missing id');

  // Select ONLY non-PII fields
  const { data: c, error } = await supabase
    .from('centers')
    .select(`
      id, name, description, modalities, city, island, address,
      website_url, center_type, working_hours,
      lat, lng, photo_url, tier, session_type
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !c) return res.status(404).send('Not found');

  const centerUrl = `${SITE}/center/${c.id}`;
  const islandName = ISLAND_LABEL[c.island] ?? 'Hawaiʻi';
  const centerTypeLabel = escapeHtml(CENTER_TYPE_LABEL[c.center_type] ?? 'Wellness Center');
  const topModality = escapeHtml(c.modalities?.[0] ?? 'Wellness');
  const title = `${escapeHtml(c.name)} — ${centerTypeLabel} in ${escapeHtml(c.city ?? islandName)} | Hawaiʻi Wellness`;
  const desc = escapeHtml((c.description ?? '').substring(0, 155));

  // HealthAndBeautyBusiness schema (no telephone, no email)
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['HealthAndBeautyBusiness', 'LocalBusiness'],
    name: c.name,
    description: c.description ?? undefined,
    url: centerUrl,
    image: c.photo_url ?? undefined,
    address: c.address ? {
      '@type': 'PostalAddress',
      streetAddress: c.address,
      addressLocality: c.city,
      addressRegion: 'HI',
      addressCountry: 'US',
    } : undefined,
    geo: c.lat && c.lng ? {
      '@type': 'GeoCoordinates',
      latitude: c.lat, longitude: c.lng,
    } : undefined,
    areaServed: `${c.city ?? ''}, ${islandName}, Hawaii`,
    knowsAbout: c.modalities ?? [],
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${centerUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${centerUrl}">
  <meta property="og:type" content="place">
  ${c.photo_url ? `<meta property="og:image" content="${c.photo_url}">` : ''}
  <meta name="geo.region" content="US-HI">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <h1>${escapeHtml(c.name)}</h1>
  <p>${centerTypeLabel} in ${escapeHtml(c.city ?? islandName)}, Hawaiʻi</p>
  ${c.description ? `<p>${escapeHtml(c.description)}</p>` : ''}
  ${c.modalities?.length ? `<p>Services: ${c.modalities.map(escapeHtml).join(', ')}</p>` : ''}
  ${c.city ? `<p>Location: ${escapeHtml(c.city)}, ${escapeHtml(islandName)}</p>` : ''}
  ${c.session_type ? `<p>Sessions: ${escapeHtml(c.session_type.replace('_', ' '))}</p>` : ''}
  ${c.website_url ? `<p><a href="${c.website_url}">Visit website</a></p>` : ''}
  <p><a href="${SITE}/directory">Browse all wellness centers</a></p>
  <p>© Hawaiʻi Wellness — <a href="${SITE}">hawaiiwellness.net</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  res.send(html);
}
