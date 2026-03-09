import { useEffect } from 'react';
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/siteConfig';

/**
 * Lightweight per-route SEO tag manager.
 * Sets <title>, <meta description>, <link rel="canonical">, and Open Graph tags.
 * No external dependency — works with Vite SPA + Googlebot JS rendering.
 *
 * @param title        Page-level title (site name appended automatically)
 * @param description  Meta description (falls back to site default)
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    // ── Title ──────────────────────────────────────────────────────────────
    const fullTitle = title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // ── Meta description ───────────────────────────────────────────────────
    const desc = description ?? SITE_DESCRIPTION;
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', desc);

    // ── Canonical ──────────────────────────────────────────────────────────
    const canonicalHref = `${SITE_URL}${window.location.pathname === '/' ? '' : window.location.pathname}`;
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalHref);

    // ── Open Graph ─────────────────────────────────────────────────────────
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalHref);

    // ── Cleanup: restore defaults on unmount ───────────────────────────────
    return () => {
      document.title = `${SITE_NAME} — Holistic Health Directory`;
    };
  }, [title, description]);
}
