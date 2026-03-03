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

const PLACEHOLDER_STOCK = '/no%20image%20stock.jpg';
const PLACEHOLDER_PRACTITIONER = PLACEHOLDER_STOCK;
const PLACEHOLDER_CENTER       = PLACEHOLDER_STOCK;
const PLACEHOLDER_RETREAT      = PLACEHOLDER_STOCK;
const PLACEHOLDER_ARTICLE      = PLACEHOLDER_STOCK;

// ─── Center type display labels ───────────────────────────────────────────────

const CENTER_TYPE_LABELS: Record<CenterRow['center_type'], string> = {
  spa: 'Spa',
  wellness_center: 'Wellness Center',
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

  return {
    id: row.id,
    name: displayName,
    businessName: row.business?.name ?? undefined,
    image: row.avatar_url || PLACEHOLDER_PRACTITIONER,
    type: 'practitioner' as const,
    modality: [...new Set(row.modalities)].join(', ') || 'Wellness Practitioner',
    location: row.city || row.region || row.island,
    rating: 5.0,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
}

// ─── centerRowToCenter ────────────────────────────────────────────────────────

/**
 * Convert a centers DB row to the Center shape used by CenterCard.
 */
export function centerRowToCenter(row: CenterRow): Center {
  const modalityLabel = row.modalities?.length
    ? [...new Set(row.modalities)].join(', ')
    : CENTER_TYPE_LABELS[row.center_type] ?? row.center_type;
  return {
    id: row.id,
    name: row.name,
    image: row.avatar_url || PLACEHOLDER_CENTER,
    modality: modalityLabel,
    location: row.city || row.region || row.island,
    rating: 5.0,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    services: [],
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
    title: row.title,
    image: row.cover_image_url || PLACEHOLDER_ARTICLE,
    excerpt: row.excerpt || '',
    author: "Hawa'i Wellness", // author field not in v1 schema
    date: dateLabel,
    category,
  };
}
