import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase
    .from('practitioners')
    .select('id, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  if (error || !data) {
    res.status(500).send('Error generating sitemap');
    return;
  }

  const urls = data.map(p => `
  <url>
    <loc>https://hawaiiwellness.net/api/profile/${p.id}</loc>
    <lastmod>${p.updated_at?.substring(0, 10) ?? '2026-03-01'}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  res.send(xml);
}
