import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { getListingsByModality } from '@/lib/ssr/getListingsByModality';
import {
  getAllModalitySlugs,
  slugToModality,
  islandDisplayName,
  ISLAND_SLUG_TO_DB_MAP,
} from '@/lib/modality-slugs';
import { SITE_NAME, canonicalUrl } from '@/lib/siteConfig';
import ModalityLandingPage from '@/app/_components/ModalityLandingPage';

const ISLAND_SLUG = 'maui';
const ISLAND_DB = ISLAND_SLUG_TO_DB_MAP[ISLAND_SLUG];
const ISLAND_DISPLAY_NAME = islandDisplayName(ISLAND_SLUG) || 'Maui';

interface Props {
  params: Promise<{ modality: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllModalitySlugs();
  return slugs.map((modality) => ({
    modality,
  }));
}

// Custom meta descriptions for top priority pages — override the template default
const CUSTOM_DESCRIPTIONS: Record<string, string> = {
  yoga: `Find yoga teachers and studios across Maui — beachfront classes in Kihei, lineage teaching in Haiku, and retreat spaces from Paia to Kula.`,
  massage: `Browse massage therapists and spas across Maui — lomilomi, craniosacral, Thai, and deep tissue from Kihei and Makawao to Hana. Book your Maui massage.`,
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const modalityName = slugToModality(resolvedParams.modality);

  if (!modalityName) {
    return {};
  }

  const title = `${modalityName} on ${ISLAND_DISPLAY_NAME}`;
  const description =
    CUSTOM_DESCRIPTIONS[resolvedParams.modality] ??
    `Find certified ${modalityName} practitioners and wellness centers on ${ISLAND_DISPLAY_NAME}. Browse verified providers, compare services, and book sessions directly.`;
  const url = canonicalUrl(`/${ISLAND_SLUG}/${resolvedParams.modality}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      type: 'website',
      images: [`/og-${ISLAND_SLUG}.webp`],
    },
  };
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  const modalityName = slugToModality(resolvedParams.modality);

  if (!modalityName) {
    notFound();
  }

  const { practitioners, centers, totalPractitioners, totalCenters, citiesServed } =
    await getListingsByModality(ISLAND_DB, modalityName);

  // JSON-LD structured data: ItemList of LocalBusiness
  const businesses = [
    ...practitioners.map((p) => ({
      '@type': 'LocalBusiness',
      name: p.name,
      image: p.image || undefined,
      url: `${canonicalUrl()}/profile/${p.id}`,
      address: {
        '@type': 'PostalAddress',
        addressRegion: ISLAND_DB.replace('_', ' ').toUpperCase(),
        addressCountry: 'US',
      },
    })),
    ...centers.map((c) => ({
      '@type': 'LocalBusiness',
      name: c.name,
      image: c.image || undefined,
      url: `${canonicalUrl()}/center/${c.id}`,
      address: {
        '@type': 'PostalAddress',
        addressRegion: ISLAND_DB.replace('_', ' ').toUpperCase(),
        addressCountry: 'US',
      },
    })),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${modalityName} Practitioners and Centers on ${ISLAND_DISPLAY_NAME}`,
    description: `Directory of ${modalityName} practitioners and wellness centers on ${ISLAND_DISPLAY_NAME}`,
    url: canonicalUrl(`/${ISLAND_SLUG}/${resolvedParams.modality}`),
    numberOfItems: businesses.length,
    itemListElement: businesses.map((business, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: business,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ModalityLandingPage
        islandSlug={ISLAND_SLUG}
        islandDisplayName={ISLAND_DISPLAY_NAME}
        modalitySlug={resolvedParams.modality}
        modalityName={modalityName}
        practitioners={practitioners}
        centers={centers}
        totalPractitioners={totalPractitioners}
        totalCenters={totalCenters}
        citiesServed={citiesServed}
      />
    </>
  );
}
