import type { Metadata } from 'next';
import { canonicalUrl, SITE_NAME } from '@/lib/siteConfig';
import ListYourPracticeClient from './ListYourPracticeClient';

export const metadata: Metadata = {
  title: `List Your Practice – ${SITE_NAME}`,
  description:
    'Join Hawaiʻi Wellness and reach clients seeking your wellness services. Simple setup, flexible pricing, no commitment.',
  canonical: canonicalUrl('/list-your-practice'),
  openGraph: {
    title: `List Your Practice – ${SITE_NAME}`,
    description:
      'Join Hawaiʻi Wellness and reach clients seeking your wellness services. Simple setup, flexible pricing, no commitment.',
    url: canonicalUrl('/list-your-practice'),
    type: 'website',
  },
};

export default function ListYourPracticePage() {
  return <ListYourPracticeClient />;
}
