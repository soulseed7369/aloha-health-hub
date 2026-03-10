/**
 * Adapters: convert raw Supabase DB rows into the component-friendly shapes
 * expected by the existing UI cards (Provider, Center, RetreatEvent, Article).
 *
 * This layer keeps the card components unchanged while we migrate from
 * mock data to real Supabase data.
 */

import { differenceInDays, parseISO, format } from 'date-fns';
import type { PractitionerRow, CenterRow, RetreatRow, ArticleRow } from '@/types/database';
import type { Provider, Center, RetreatEvent, Article } from '@/data/mockData';

// ─── Placeholder images (used when no image is stored in DB) ─────────────────

// Empty string → cards use their AvatarFallback (initials) instead of a stock photo
const PLACEHOLDER_PRACTITIONER = '';
const PLACEHOLDER_CENTER       = '';
// Retreats and articles use a real cover image slot, keep stock fallback for those
const PLACEHOLDER_RETREAT      = '/no%20image%20stock.jpg';
const PLACEHOLDER_ARTICLE      = '/no%20image%20stock.jpg';

// ─── Center type display labels ───────────────────────────────────────────────

const CENTER_TYPE_LABELS: Record<CenterRow['center_type'], string> = {
  spa: 'Spa',
  wellness_center: 'Wellness Center',
  yoga_studio: 'Yoga Studio',
  clinic: 'Clinic',
  retreat_center: 'Retreat Center',
};

// ─── practitionerRowToProvider ───────────────────────────────────────────────

/**
 * Convert a practitioners DB row to the Provider shape used by ProviderCard
 * and DirectoryMap.
 */
// Extended row type that includes the optional business join
type PractitionerRowWithBusiness = PractitionerRow & {
  business?: { id: string; name: string } | null;
};

export function practitionerRowToProvider(row: PractitionerRowWithBusiness): Provider {
  // Prefer display_name, then first + last, then legacy name
  const displayName =
    row.display_name ||
    (row.first_name
      ? [row.first_name, row.last_name].filter(Boolean).join(' ')
      : null) ||
    row.name;

  // business_name = free text; business.name = joined from business_id FK
  const businessName = row.business_name || row.business?.name || undefined;

  const modalitiesArr = [...new Set(row.modalities ?? [])].filter(Boolean);
  return {
    id: row.id,
    name: displayName,
    businessName,
    image: row.avatar_url || PLACEHOLDER_PRACTITIONER,
    type: 'practitioner' as const,
    modality: modalitiesArr.join(', ') || 'Wellness Practitioner',
    modalities: modalitiesArr.length > 0 ? modalitiesArr : undefined,
    sessionType: row.session_type ?? undefined,
    acceptsNewClients: row.accepts_new_clients ?? undefined,
    bio: row.bio ?? undefined,
    location: row.city || row.region || row.island,
    rating: 5.0,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    tier: (row.tier as 'free' | 'premium' | 'featured') ?? 'free',
  };
}

// ─── centerRowToCenter ────────────────────────────────────────────────────────

/**
 * Convert a centers DB row to the Center shape used by CenterCard.
 */
export function centerRowToCenter(row: CenterRow): Center {
  const modalitiesArr = [...new Set(row.modalities ?? [])].filter(Boolean);
  const modalityLabel = modalitiesArr.length
    ? modalitiesArr.join(', ')
    : CENTER_TYPE_LABELS[row.center_type] ?? row.center_type;
  return {
    id: row.id,
    name: row.name,
    image: row.avatar_url || PLACEHOLDER_CENTER,
    modality: modalityLabel,
    modalities: modalitiesArr.length > 0 ? modalitiesArr : undefined,
    location: row.city || row.region || row.island,
    rating: 5.0,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    services: [],
    tier: (row.tier as 'free' | 'premium' | 'featured') ?? 'free',
  };
}

/**
 * Convert a centers DB row to the Provider shape for DirectoryMap.
 */
export function centerRowToProvider(row: CenterRow): Provider {
  const modalityLabel = row.modalities?.length
    ? [...new Set(row.modalities)].join(', ')
    : CENTER_TYPE_LABELS[row.center_type] ?? row.center_type;
  return {
    id: row.id,
    name: row.name,
    image: PLACEHOLDER_CENTER,
    type: 'center' as const,
    modality: modalityLabel,
    location: row.city || row.region || row.island,
    rating: 5.0,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
}

// ─── retreatRowToRetreatEvent ─────────────────────────────────────────────────

/**
 * Convert a retreats DB row to the RetreatEvent shape used by RetreatEventCard
 * and the Retreats page filter logic.
 */
export function retreatRowToRetreatEvent(row: RetreatRow): RetreatEvent {
  const startDate = row.start_date; // already "YYYY-MM-DD"
  const endDate = row.end_date;

  let durationDays = 1;
  try {
    durationDays = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1);
  } catch {
    // leave default
  }

  let priceLabel: string | undefined;
  if (row.starting_price != null) {
    priceLabel = `$${row.starting_price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  return {
    id: row.id,
    title: row.title,
    image: row.cover_image_url || PLACEHOLDER_RETREAT,
    location: row.venue_name
      ? `${row.venue_name}${row.city ? `, ${row.city}` : ''}`
      : row.city || row.region || "Hawai'i Island",
    area: row.region || row.city || "Hawai'i Island",
    type: 'Retreat',
    startDate,
    endDate,
    durationDays,
    feature: row.description
      ? row.description.split('.')[0].trim().slice(0, 60)
      : 'Transformative wellness experience',
    price: priceLabel,
  };
}

// ─── articleRowToArticle ──────────────────────────────────────────────────────

/**
 * Convert an articles DB row to the Article shape used by ArticleCard.
 */
export function articleRowToArticle(row: ArticleRow): Article {
  let dateLabel = '';
  try {
    if (row.published_at) {
      dateLabel = format(parseISO(row.published_at), 'MMM d, yyyy');
    }
  } catch {
    // leave empty
  }

  const category = row.tags.length > 0 ? row.tags[0] : 'Wellness';

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    image: row.cover_image_url || PLACEHOLDER_ARTICLE,
    excerpt: row.excerpt || '',
    author: row.author || "Hawai'i Wellness",
    date: dateLabel,
    category,
    body: row.body || undefined,
    featured: row.featured,
  };
}
