/**
 * Central site configuration.
 *
 * Override the primary domain at build/deploy time by setting:
 *   VITE_SITE_URL=https://hawaiiwellness.net
 * in your Vercel environment variables (or .env file locally).
 *
 * All canonical tags, OG URLs, JSON-LD, sitemap, and robots.txt
 * should derive the domain from here — never hardcode it elsewhere.
 */

export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://hawaiiwellness.net'
).replace(/\/$/, '');

export const SITE_NAME = 'Hawaiʻi Wellness';

export const SITE_DESCRIPTION =
  "Hawaiʻi's holistic health directory — find certified practitioners, wellness centers, and retreats across all islands.";

export const SITE_EMAIL = 'aloha@hawaiiwellness.net';

/** Canonical URL for a given path (no trailing slash). */
export function canonicalUrl(path = ''): string {
  const clean = path.replace(/\/$/, '') || '/';
  return `${SITE_URL}${clean === '/' ? '' : clean}${clean === '/' ? '' : ''}`;
}
