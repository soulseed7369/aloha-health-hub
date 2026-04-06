/**
 * Adapters: convert raw Supabase DB rows into the component-friendly shapes
 * expected by the existing UI cards (Provider, Center, RetreatEvent, Article).
 *
 * This layer keeps the card components unchanged while we migrate from
 * mock data to real Supabase data.
 */

import { parseISO, format } from 'date-fns';
import type { PractitionerRow, CenterRow, ArticleRow } from '@/types/database';
import type { Provider, Center, Article } from '@/data/mockData';

// ─── Placeholder images (used when no image is stored in DB) ─────────────────

// Empty string → cards use their AvatarFallback (initials) instead of a stock photo
const PLACEHOLDER_PRACTITIONER = '';
const PLACEHOLDER_CENTER       = '';
// Articles use a real cover image slot, keep stock fallback
const PLACEHOLDER_ARTICLE      = '/no%20image%20stock.jpg';

// ─── Center type display labels ───────────────────────────────────────────────

const CENTER_TYPE_LABELS: Record<CenterRow['center_type'], string> = {
  spa: 'Spa',
  wellness_center: 'Wellness Center',
  yoga_studio: 'Yoga Studio',
  clinic: 'Clinic',
  retreat_center: 'Retreat Center',
  fitness_center: 'Fitness Center',
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
  // business_name = free text; business.name = joined from business_id FK
  const businessName = row.business_name || row.business?.name || undefined;

  // Name priority:
  //   1. first_name + last_name  — explicit personal name fields, highest trust
  //   2. display_name            — manual override, but skip if it matches business name
  //                                (pipeline sometimes writes business name here by mistake)
  //   3. name                    — legacy / pipeline-ingested fallback
  const sanitisedDisplayName =
    row.display_name && row.display_name !== businessName ? row.display_name : null;
  const displayName =
    (row.first_name
      ? [row.first_name, row.last_name].filter(Boolean).join(' ')
      : null) ||
    sanitisedDisplayName ||
    row.name;

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
    externalBookingUrl: row.external_booking_url ?? undefined,
    island: row.island ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    verified: !!(row as any).email_verified_at || !!(row as any).phone_verified_at,
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
    description: row.description ?? undefined,
    centerType: row.center_type ?? undefined,
    centerTypeLabel: CENTER_TYPE_LABELS[row.center_type] ?? row.center_type ?? undefined,
    island: row.island ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    photos: (row as any).photos ?? undefined,
    bio: (row as any).bio ?? undefined,
    workingHours: (row as any).working_hours ?? undefined,
    acceptsNewClients: (row as any).accepts_new_clients ?? undefined,
    verified: !!(row as any).email || !!(row as any).phone,
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
