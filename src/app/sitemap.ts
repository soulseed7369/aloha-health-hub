import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { getAllModalitySlugs, VALID_ISLANDS } from '@/lib/modality-slugs';

/**
 * Dynamic sitemap generation.
 * Generates ~190 URLs:
 * - 1 homepage
 * - 4 island pages
 * - 4 * 44 = 176 modality landing pages (island + modality combos)
 * - 3 static pages (about, articles, help-center)
 * - 2 service pages (list-your-practice, website-packages, concierge)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;
  const modalitySlugs = getAllModalitySlugs();

  const urls: MetadataRoute.Sitemap = [];

  // Homepage
  urls.push({
    url: baseUrl,
    changefreq: 'weekly',
    priority: 1.0,
  });

  // Island pages
  VALID_ISLANDS.forEach((island) => {
    urls.push({
      url: `${baseUrl}/${island}`,
      changefreq: 'weekly',
      priority: 0.9,
    });
  });

  // Modality landing pages (island + modality combos)
  VALID_ISLANDS.forEach((island) => {
    modalitySlugs.forEach((modality) => {
      urls.push({
        url: `${baseUrl}/${island}/${modality}`,
        changefreq: 'weekly',
        priority: 0.7,
      });
    });
  });

  // Static/service pages
  const staticPages = [
    { path: '/about', priority: 0.8 },
    { path: '/articles', priority: 0.8 },
    { path: '/help-center', priority: 0.7 },
    { path: '/list-your-practice', priority: 0.8 },
    { path: '/website-packages', priority: 0.8 },
    { path: '/concierge', priority: 0.7 },
    { path: '/privacy-policy', priority: 0.5 },
    { path: '/terms-of-service', priority: 0.5 },
  ];

  staticPages.forEach(({ path, priority }) => {
    urls.push({
      url: `${baseUrl}${path}`,
      changefreq: 'monthly',
      priority: priority as MetadataRoute.Sitemap[0]['priority'],
    });
  });

  return urls;
}
