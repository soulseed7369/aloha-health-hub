import type { Metadata } from 'next';
import { getArticles } from '@/lib/ssr';
import { SITE_NAME, canonicalUrl } from '@/lib/siteConfig';
import ArticlesListClient from './ArticlesListClient';

export const metadata: Metadata = {
  title: `Wellness Articles – ${SITE_NAME}`,
  description:
    'Explore wellness guides, healing traditions, island life insights, and practitioner profiles from Hawaiʻi Wellness.',
  canonical: canonicalUrl('/articles'),
  openGraph: {
    title: `Wellness Articles – ${SITE_NAME}`,
    description:
      'Explore wellness guides, healing traditions, island life insights, and practitioner profiles.',
    url: canonicalUrl('/articles'),
    type: 'website',
    images: ['/og-articles.webp'],
  },
};

export default async function ArticlesPage() {
  const articles = await getArticles();

  // JSON-LD: CollectionPage
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Wellness Articles',
    url: canonicalUrl('/articles'),
    description: 'Wellness guides, healing traditions, and community insights from Hawaiʻi Wellness.',
    itemListElement: articles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.excerpt,
        image: article.image,
        author: { '@type': 'Person', name: article.author || 'Hawaiʻi Wellness' },
        datePublished: article.date,
        url: canonicalUrl(`/articles/${article.slug}`),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticlesListClient articles={articles} />
    </>
  );
}
