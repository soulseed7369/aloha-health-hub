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

// Strip all HTML tags — safe for SSR/crawler output (no DOM required)
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Allow only safe display tags, strip everything else
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*on\w+="[^"]*"/gi, '')
    .replace(/\s*on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') return res.status(400).send('Missing slug');

  const { data: article, error } = await supabase
    .from('articles')
    .select('id, slug, title, body, published_at, status, author')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !article) return res.status(404).send('Article not found');

  const articleUrl = `${SITE}/articles/${article.slug}`;
  const pubDate = article.published_at ? new Date(article.published_at).toISOString() : null;
  const plainText = stripHtml(article.body ?? '');
  const description = escapeHtml(plainText.substring(0, 155));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description,
    url: articleUrl,
    datePublished: pubDate,
    author: { '@type': 'Person', name: article.author || 'Hawaiʻi Wellness' },
    publisher: {
      '@type': 'Organization',
      name: 'Hawaiʻi Wellness',
      logo: { '@type': 'ImageObject', url: `${SITE}/hawaii-wellness-logo-OG.png`, width: 1200, height: 630 },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE}/articles` },
        { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
      ],
    },
  };

  const sanitizedBody = sanitizeHtml(article.body ?? '');

  const pubFormatted = pubDate
    ? new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(article.title)} | Hawaiʻi Wellness</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${articleUrl}">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${articleUrl}">
  <meta property="og:image" content="${SITE}/hawaii-wellness-logo-OG.png">
  ${pubDate ? `<meta property="article:published_time" content="${pubDate}">` : ''}
  <meta property="article:author" content="${escapeHtml(article.author || 'Hawaiʻi Wellness')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${SITE}/hawaii-wellness-logo-OG.png">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <nav><a href="${SITE}">Home</a> / <a href="${SITE}/articles">Articles</a> / ${escapeHtml(article.title)}</nav>
  <article>
    <h1>${escapeHtml(article.title)}</h1>
    ${pubFormatted ? `<p><time datetime="${pubDate}">${pubFormatted}</time>${article.author ? ` · ${escapeHtml(article.author)}` : ''}</p>` : ''}
    <div>${sanitizedBody}</div>
  </article>
  <p><a href="${SITE}/articles">← All articles</a></p>
  <p><a href="${SITE}/directory">Browse practitioners</a> · <a href="${SITE}">Hawaiʻi Wellness</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200');
  res.send(html);
}
