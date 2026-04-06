/**
 * Modality slug mapping for URL generation and validation.
 * Synced with MODALITIES_LIST in DashboardProfile.tsx and AdminPanel.tsx (44 total).
 */

export type ModalitySlug =
  | 'acupuncture'
  | 'alternative-therapy'
  | 'art-therapy'
  | 'astrology'
  | 'ayurveda'
  | 'birth-doula'
  | 'breathwork'
  | 'chiropractic'
  | 'counseling'
  | 'craniosacral'
  | 'dentistry'
  | 'energy-healing'
  | 'family-constellation'
  | 'fitness'
  | 'functional-medicine'
  | 'hawaiian-healing'
  | 'herbalism'
  | 'hypnotherapy'
  | 'iv-therapy'
  | 'life-coaching'
  | 'lomilomi'
  | 'longevity'
  | 'massage'
  | 'meditation'
  | 'midwife'
  | 'nature-therapy'
  | 'naturopathic'
  | 'nervous-system-regulation'
  | 'network-chiropractic'
  | 'nutrition'
  | 'osteopathic'
  | 'physical-therapy'
  | 'psychic'
  | 'psychotherapy'
  | 'reiki'
  | 'ritualist'
  | 'somatic-therapy'
  | 'soul-guidance'
  | 'sound-healing'
  | 'tcm'
  | 'trauma-informed-care'
  | 'watsu'
  | 'womens-health'
  | 'yoga';

export type IslandSlug = 'big-island' | 'maui' | 'oahu' | 'kauai';

export type IslandDb = 'big_island' | 'maui' | 'oahu' | 'kauai';

/**
 * Maps URL slugs to canonical database modality names.
 * Matches the MODALITIES_LIST from DashboardProfile.tsx and AdminPanel.tsx.
 */
export const MODALITY_SLUG_MAP: Record<ModalitySlug, string> = {
  'acupuncture': 'Acupuncture',
  'alternative-therapy': 'Alternative Therapy',
  'art-therapy': 'Art Therapy',
  'astrology': 'Astrology',
  'ayurveda': 'Ayurveda',
  'birth-doula': 'Birth Doula',
  'breathwork': 'Breathwork',
  'chiropractic': 'Chiropractic',
  'counseling': 'Counseling',
  'craniosacral': 'Craniosacral',
  'dentistry': 'Dentistry',
  'energy-healing': 'Energy Healing',
  'family-constellation': 'Family Constellation',
  'fitness': 'Fitness',
  'functional-medicine': 'Functional Medicine',
  'hawaiian-healing': 'Hawaiian Healing',
  'herbalism': 'Herbalism',
  'hypnotherapy': 'Hypnotherapy',
  'iv-therapy': 'IV Therapy',
  'life-coaching': 'Life Coaching',
  'lomilomi': 'Lomilomi / Hawaiian Healing',
  'longevity': 'Longevity',
  'massage': 'Massage',
  'meditation': 'Meditation',
  'midwife': 'Midwife',
  'nature-therapy': 'Nature Therapy',
  'naturopathic': 'Naturopathic',
  'nervous-system-regulation': 'Nervous System Regulation',
  'network-chiropractic': 'Network Chiropractic',
  'nutrition': 'Nutrition',
  'osteopathic': 'Osteopathic',
  'physical-therapy': 'Physical Therapy',
  'psychic': 'Psychic',
  'psychotherapy': 'Psychotherapy',
  'reiki': 'Reiki',
  'ritualist': 'Ritualist',
  'somatic-therapy': 'Somatic Therapy',
  'soul-guidance': 'Soul Guidance',
  'sound-healing': 'Sound Healing',
  'tcm': 'TCM (Traditional Chinese Medicine)',
  'trauma-informed-care': 'Trauma-Informed Care',
  'watsu': 'Watsu / Water Therapy',
  'womens-health': "Women's Health",
  'yoga': 'Yoga',
};

/**
 * Reverse map: canonical modality name → URL slug.
 */
const MODALITY_TO_SLUG_MAP: Record<string, ModalitySlug> = (() => {
  const map: Record<string, ModalitySlug> = {};
  Object.entries(MODALITY_SLUG_MAP).forEach(([slug, name]) => {
    map[name] = slug as ModalitySlug;
  });
  return map;
})();

/**
 * Valid island slugs (URL-safe).
 */
export const VALID_ISLANDS = ['big-island', 'maui', 'oahu', 'kauai'] as const;

/**
 * Maps URL slugs to database island identifiers.
 */
export const ISLAND_SLUG_TO_DB_MAP: Record<IslandSlug, IslandDb> = {
  'big-island': 'big_island',
  'maui': 'maui',
  'oahu': 'oahu',
  'kauai': 'kauai',
};

/**
 * Maps database island identifiers to URL slugs.
 */
export const ISLAND_DB_TO_SLUG_MAP: Record<IslandDb, IslandSlug> = {
  'big_island': 'big-island',
  'maui': 'maui',
  'oahu': 'oahu',
  'kauai': 'kauai',
};

/**
 * Display names for islands.
 */
export const ISLAND_DISPLAY_NAMES: Record<IslandSlug, string> = {
  'big-island': 'Big Island',
  'maui': 'Maui',
  'oahu': 'Oʻahu',
  'kauai': 'Kauaʻi',
};

/**
 * Convert a URL slug to canonical modality name.
 * Returns undefined if slug is not recognized.
 */
export function slugToModality(slug: string): string | undefined {
  return MODALITY_SLUG_MAP[slug as ModalitySlug];
}

/**
 * Convert a canonical modality name to URL slug.
 * Returns undefined if modality is not recognized.
 */
export function modalityToSlug(modality: string): ModalitySlug | undefined {
  return MODALITY_TO_SLUG_MAP[modality];
}

/**
 * Get all modality slugs.
 */
export function getAllModalitySlugs(): ModalitySlug[] {
  return Object.keys(MODALITY_SLUG_MAP) as ModalitySlug[];
}

/**
 * Get all canonical modality names.
 */
export function getAllModalities(): string[] {
  return Object.values(MODALITY_SLUG_MAP);
}

/**
 * Convert URL island slug to database identifier.
 */
export function islandSlugToDb(slug: string): IslandDb | undefined {
  return ISLAND_SLUG_TO_DB_MAP[slug as IslandSlug];
}

/**
 * Convert database island identifier to URL slug.
 */
export function islandDbToSlug(db: string): IslandSlug | undefined {
  return ISLAND_DB_TO_SLUG_MAP[db as IslandDb];
}

/**
 * Get display name for an island slug.
 */
export function islandDisplayName(slug: string): string | undefined {
  return ISLAND_DISPLAY_NAMES[slug as IslandSlug];
}

/**
 * Check if a string is a valid island slug.
 */
export function isValidIslandSlug(slug: string): slug is IslandSlug {
  return VALID_ISLANDS.includes(slug as IslandSlug);
}

/**
 * Check if a string is a valid modality slug.
 */
export function isValidModalitySlug(slug: string): slug is ModalitySlug {
  return slug in MODALITY_SLUG_MAP;
}
