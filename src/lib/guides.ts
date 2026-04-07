/**
 * guides.ts — Central metadata registry for all Hawaii Wellness guide pages.
 *
 * Single source of truth for slug, title, description, og:image, and nav data.
 * Import from here in GuidesHub, individual guide pages, sitemap generation,
 * and any future dashboard "featured in guide" widgets.
 */

export interface GuideEntry {
  /** URL slug — maps to /guides/<slug> */
  slug: string;
  /** Short display title for cards and nav */
  title: string;
  /** Full SEO title (used in <title> tag) */
  seoTitle: string;
  /** Meta description (155 chars max) */
  description: string;
  /** og:image path (relative to /public) */
  ogImage: string;
  /** Cover image path for the hub card (relative to /public) */
  coverImage: string;
  /** Cover image alt text */
  coverAlt: string;
  /** Brief teaser shown on the hub card */
  teaser: string;
  /** Published date (ISO 8601) */
  publishedAt: string;
  /** Last updated date (ISO 8601) */
  updatedAt: string;
  /** Estimated read time in minutes */
  readMinutes: number;
  /** True when the guide is live; false = coming soon */
  published: boolean;
  /** Category label for future filtering */
  category: string;
  /** Key stats shown on hub card e.g. ["44 Modalities", "4 Islands"] */
  stats: string[];
}

export const GUIDES: GuideEntry[] = [
  {
    slug: "wellness-modalities-hawaii",
    title: "Wellness Modalities in Hawaiʻi",
    seoTitle: "The Complete Guide to Wellness Modalities in Hawaiʻi (2026)",
    description:
      "Explore all 44 wellness modalities practiced across Hawaiʻi — from Lomilomi and Lāʻau Lapaʻau to EMDR, somatic therapy, and sound healing. Find the right healing path for you.",
    ogImage: "/og-wellness-modalities.jpg",
    coverImage: "/complete-health-modalities-guide2-titled.jpg",
    coverAlt: "The Complete Guide to Wellness Modalities in Hawaiʻi — Pololū Valley, Big Island",
    teaser:
      "Your definitive resource for holistic healing across the Hawaiian Islands — 44 modalities, 9 categories, island-by-island practitioner guidance.",
    publishedAt: "2026-04-06",
    updatedAt: "2026-04-06",
    readMinutes: 22,
    published: true,
    category: "Wellness",
    stats: ["44 Modalities", "4 Islands", "22 min read"],
  },
  {
    slug: "finding-a-wellness-practitioner-hawaii",
    title: "Finding a Wellness Practitioner in Hawaiʻi",
    seoTitle: "How to Find the Right Wellness Practitioner in Hawaiʻi (2026)",
    description:
      "A practical guide to finding, vetting, and working with holistic health practitioners across Oʻahu, Maui, the Big Island, and Kauaʻi.",
    ogImage: "/og-wellness-modalities.jpg",
    coverImage: "/complete-health-modalities-guide.jpg",
    coverAlt: "Hawaii wellness practitioner guide",
    teaser: "How to find, vet, and book the right healer for your needs across all four Hawaiian Islands.",
    publishedAt: "2026-05-01",
    updatedAt: "2026-05-01",
    readMinutes: 12,
    published: false,
    category: "Wellness",
    stats: ["Practical Tips", "All 4 Islands"],
  },
  {
    slug: "hawaiian-healing-traditions",
    title: "Hawaiian Healing Traditions",
    seoTitle: "Hawaiian Healing Traditions: Lomilomi, Lāʻau Lapaʻau & Hoʻoponopono (2026)",
    description:
      "An in-depth look at Native Hawaiian healing practices — Lomilomi massage, Lāʻau Lapaʻau plant medicine, Hoʻoponopono forgiveness practice, and more.",
    ogImage: "/og-wellness-modalities.jpg",
    coverImage: "/complete-health-modalities-guide.jpg",
    coverAlt: "Hawaiian healing traditions guide",
    teaser: "Explore the rich tradition of Native Hawaiian healing — from Lomilomi to Hoʻoponopono and beyond.",
    publishedAt: "2026-06-01",
    updatedAt: "2026-06-01",
    readMinutes: 16,
    published: false,
    category: "Hawaiian Healing",
    stats: ["Native Traditions", "Cultural Context"],
  },
];

/** Returns only published guides */
export function getPublishedGuides(): GuideEntry[] {
  return GUIDES.filter((g) => g.published);
}

/** Returns a guide by slug, or undefined */
export function getGuideBySlug(slug: string): GuideEntry | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/**
 * Maps canonical modality labels → anchor IDs in the wellness modalities guide.
 * Used by Directory and IslandHome to link contextually into the guide.
 */
export const MODALITY_GUIDE_ANCHORS: Record<string, string> = {
  "Massage":                         "massage",
  "Chiropractic":                    "chiropractic",
  "Network Chiropractic":            "chiropractic",
  "Craniosacral":                    "craniosacral",
  "Physical Therapy":                "physical-therapy",
  "Osteopathic":                     "osteopathic",
  "Watsu / Water Therapy":           "watsu",
  "Reiki":                           "reiki",
  "Sound Healing":                   "sound-healing",
  "Energy Healing":                  "energy-healing",
  "Family Constellation":            "family-constellation",
  "Psychotherapy":                   "psychotherapy",
  "Counseling":                      "psychotherapy",
  "Trauma-Informed Care":            "psychotherapy",
  "Somatic Therapy":                 "somatic-therapy",
  "Nervous System Regulation":       "nervous-system",
  "Hypnotherapy":                    "hypnotherapy",
  "Meditation":                      "meditation",
  "Breathwork":                      "breathwork",
  "Acupuncture":                     "acupuncture",
  "TCM (Traditional Chinese Medicine)": "tcm",
  "Ayurveda":                        "ayurveda",
  "Naturopathic":                    "naturopathic",
  "Functional Medicine":             "functional-medicine",
  "Herbalism":                       "herbalism",
  "Yoga":                            "yoga",
  "Fitness":                         "fitness",
  "Lomilomi / Hawaiian Healing":     "lomilomi",
  "Hawaiian Healing":                "lomilomi",
  "Nature Therapy":                  "nature-therapy",
  "Art Therapy":                     "art-therapy",
  "Nutrition":                       "nutrition",
  "Longevity":                       "longevity",
  "Life Coaching":                   "life-coaching",
  "Soul Guidance":                   "soul-guidance",
  "Astrology":                       "astrology",
  "Psychic":                         "psychic",
  "Ritualist":                       "psychic",
  "Women's Health":                  "womens-health",
  "Birth Doula":                     "birth-doula",
  "Midwife":                         "midwifery",
  "Alternative Therapy":             "energy-healing",
  "IV Therapy":                      "longevity",
};

/** Returns the full guide URL for a given modality label, or null if unmapped. */
export function getModalityGuideUrl(modality: string): string | null {
  const anchor = MODALITY_GUIDE_ANCHORS[modality];
  return anchor ? `/guides/wellness-modalities-hawaii#${anchor}` : null;
}
