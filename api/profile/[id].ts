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
  const { data: p, error } = await supabase
    .from('practitioners')
    .select(`
      id, name, bio, modalities, city, island, address,
      website_url, external_booking_url,
      lat, lng, photo_url, tier, session_type,
      accepts_new_clients
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error || !p) return res.status(404).send('Not found');

  const profileUrl = `${SITE}/profile/${p.id}`;
  const islandName = ISLAND_LABEL[p.island] ?? 'Hawaiʻi';
  const topModality = escapeHtml(p.modalities?.[0] ?? 'Wellness');
  const title = `${escapeHtml(p.name)} — ${topModality} in ${escapeHtml(p.city ?? islandName)} | Hawaiʻi Wellness`;
  const desc = escapeHtml((p.bio ?? '').substring(0, 155));

  // MedicalBusiness schema (no telephone, no email)
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['MedicalBusiness', 'LocalBusiness'],
    name: p.name,
    description: p.bio ?? undefined,
    url: profileUrl,
    image: p.photo_url ?? undefined,
    address: p.address ? {
      '@type': 'PostalAddress',
      streetAddress: p.address,
      addressLocality: p.city,
      addressRegion: 'HI',
      addressCountry: 'US',
    } : undefined,
    geo: p.lat && p.lng ? {
      '@type': 'GeoCoordinates',
      latitude: p.lat, longitude: p.lng,
    } : undefined,
    areaServed: `${p.city ?? ''}, ${islandName}, Hawaii`,
    knowsAbout: p.modalities ?? [],
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${profileUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${profileUrl}">
  <meta property="og:type" content="profile">
  ${p.photo_url ? `<meta property="og:image" content="${p.photo_url}">` : ''}
  <meta name="geo.region" content="US-HI">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <h1>${escapeHtml(p.name)}</h1>
  <p>${topModality} practitioner in ${escapeHtml(p.city ?? islandName)}, Hawaiʻi</p>
  ${p.bio ? `<p>${escapeHtml(p.bio)}</p>` : ''}
  ${p.modalities?.length ? `<p>Specialties: ${p.modalities.map(escapeHtml).join(', ')}</p>` : ''}
  ${p.city ? `<p>Location: ${escapeHtml(p.city)}, ${escapeHtml(islandName)}</p>` : ''}
  ${p.session_type ? `<p>Sessions: ${escapeHtml(p.session_type.replace('_', ' '))}</p>` : ''}
  ${p.website_url ? `<p><a href="${p.website_url}">Visit website</a></p>` : ''}
  ${p.external_booking_url ? `<p><a href="${p.external_booking_url}">Book a session</a></p>` : ''}
  <p><a href="${SITE}/directory">Browse all practitioners</a></p>
  <p>© Hawaiʻi Wellness — <a href="${SITE}">hawaiiwellness.net</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  res.send(html);
}
