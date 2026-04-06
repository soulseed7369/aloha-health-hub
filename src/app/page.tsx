import type { Metadata } from 'next';
import BigIslandContent from './big-island/BigIslandContent';

export const metadata: Metadata = {
  title: "Hawaiʻi Wellness — Find Holistic Health Practitioners Across All Islands",
  description:
    "Hawaiʻi's holistic health directory — find certified practitioners and wellness centers for yoga, massage, acupuncture, reiki & more across all islands.",
  openGraph: {
    title: "Hawaiʻi Wellness — Find Holistic Health Practitioners Across All Islands",
    description:
      "Hawaiʻi's holistic health directory — find certified practitioners and wellness centers across all islands.",
    images: ['/big_island_pololu.webp'],
  },
};

export default function HomePage() {
  return <BigIslandContent />;
}
