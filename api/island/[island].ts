import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const SITE = 'https://hawaiiwellness.net';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ISLAND_META: Record<string, { label: string; slug: string; desc: string; cities: string }> = {
  big_island: {
    label: 'Big Island',
    slug: 'big-island',
    desc: 'Explore wellness practitioners and centers on the Big Island of Hawaiʻi. Find acupuncturists, massage therapists, yoga instructors, and energy healers across Kona, Hilo, Waimea, and Pahoa.',
    cities: 'Kailua-Kona, Hilo, Waimea, Pahoa, Captain Cook, Keaau',
  },
  maui: {
    label: 'Maui',
    slug: 'maui',
    desc: "Discover holistic health providers on Maui. Browse practitioners specializing in meditation, Lomilomi, breathwork, and traditional healing in Lahaina, Kihei, Makawao, and Paia.",
    cities: 'Lahaina, Kihei, Wailea, Makawao, Paia, Haiku, Kula',
  },
  oahu: {
    label: 'Oʻahu',
    slug: 'oahu',
    desc: "Find wellness services on Oʻahu. Connect with practitioners in Honolulu, Waikiki, Kailua, Kaneohe, and across the island.",
    cities: 'Honolulu, Waikiki, Kailua, Kaneohe, Pearl City, Haleiwa',
  },
  kauai: {
    label: 'Kauaʻi',
    slug: 'kauai',
    desc: "Explore wellness practitioners on Kauaʻi. Discover holistic health, yoga, meditation, and natural healing in Lihue, Kapaa, Hanalei, and Poipu.",
    cities: 'Lihue, Kapaa, Hanalei, Princeville, Poipu, Koloa',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { island } = req.query;
  if (!island || typeof island !== 'string' || !ISLAND_META[island]) {
    return res.status(400).send('Invalid island');
  }

  const { data: practitioners } = await supabase
    .from('practitioners')
    .select('id, name, modalities, city, tier')
    .eq('status', 'published')
    .eq('island', island)
    .order('tier', { ascending: false })
    .order('name', { ascending: true })
    .limit(20);

  const meta = ISLAND_META[island];
  const url = `${SITE}/${meta.slug}`;
  const title = `${meta.label} Wellness Practitioners & Centers | Hawaiʻi Wellness`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description: meta.desc,
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Directory', item: `${SITE}/directory` },
        { '@type': 'ListItem', position: 3, name: meta.label, item: url },
      ],
    },
    itemListElement: (practitioners || []).slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: p.name,
        url: `${SITE}/profile/${p.id}`,
      },
    })),
  };

  const practitionerList = (practitioners || [])
    .map(p => `<li><a href="/profile/${p.id}">${escapeHtml(p.name)}</a>${p.modalities?.[0] ? ` — ${escapeHtml(p.modalities[0])}` : ''}${p.city ? `, ${escapeHtml(p.city)}` : ''}</li>`)
    .join('\n      ');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(meta.desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(meta.desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/hawaii-wellness-logo-OG.png">
  <meta name="geo.region" content="US-HI">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <nav><a href="${SITE}">Home</a> / <a href="${SITE}/directory">Directory</a> / ${escapeHtml(meta.label)}</nav>
  <h1>${escapeHtml(meta.label)} Wellness Directory</h1>
  <p>${escapeHtml(meta.desc)}</p>
  <p>Serving: ${escapeHtml(meta.cities)}</p>
  <h2>Practitioners on ${escapeHtml(meta.label)}</h2>
  <ul>
      ${practitionerList}
  </ul>
  <p><a href="${SITE}/directory?island=${island}">Browse full ${escapeHtml(meta.label)} directory</a></p>
  <p><a href="${SITE}">Hawaiʻi Wellness</a> — Hawaii's holistic health directory</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200');
  res.send(html);
}
