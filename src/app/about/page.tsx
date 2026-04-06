import type { Metadata } from 'next';
import { canonicalUrl, SITE_NAME } from '@/lib/siteConfig';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: `About – ${SITE_NAME}`,
  description:
    'Learn about Hawaiʻi Wellness: our mission to connect island communities with certified wellness practitioners and holistic healing centers.',
  canonical: canonicalUrl('/about'),
  openGraph: {
    title: `About – ${SITE_NAME}`,
    description:
      'Our mission to connect island communities with certified wellness practitioners and holistic healing centers.',
    url: canonicalUrl('/about'),
    type: 'website',
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
