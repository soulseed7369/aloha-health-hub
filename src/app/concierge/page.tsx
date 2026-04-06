import type { Metadata } from 'next';
import { canonicalUrl, SITE_NAME } from '@/lib/siteConfig';
import ConciergeClient from './ConciergeClient';

export const metadata: Metadata = {
  title: `Wellness Concierge – ${SITE_NAME}`,
  description:
    'Our concierge team helps you find the perfect wellness practitioner on Hawaiʻi. Personalized recommendations based on your needs.',
  canonical: canonicalUrl('/concierge'),
  openGraph: {
    title: `Wellness Concierge – ${SITE_NAME}`,
    description:
      'Our concierge team helps you find the perfect wellness practitioner on Hawaiʻi. Personalized recommendations based on your needs.',
    url: canonicalUrl('/concierge'),
    type: 'website',
  },
};

export default function ConciergePage() {
  return <ConciergeClient />;
}
