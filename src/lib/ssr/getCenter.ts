import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { CenterProfile } from '@/hooks/useCenter'
import type { CenterRow } from '@/types/database'

const CENTER_TYPE_LABELS: Record<string, string> = {
  spa: 'Spa',
  wellness_center: 'Wellness Center',
  clinic: 'Clinic',
  retreat_center: 'Retreat Center',
  yoga_studio: 'Yoga Studio'
}

export async function getCenter(id: string): Promise<CenterProfile | null> {
  const supabase = createServerSupabaseClient()

  if (!supabase) return null

  const { data: row, error } = await supabase
    .from('centers')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    centerType: row.center_type,
    centerTypeLabel: CENTER_TYPE_LABELS[row.center_type] ?? row.center_type,
    profileImage: row.avatar_url || '',
    photos: row.photos ?? [],
    about: row.description ?? null,
    modalities: row.modalities ?? [],
    amenities: row.amenities ?? [],
    address: row.address,
    city: row.city,
    island: row.island ?? 'big_island',
    location: [row.city, row.island].filter(Boolean).join(', '),
    phone: null,  // omitted from SSR — revealed client-side via /api/contact
    email: null,  // omitted from SSR — revealed client-side via /api/contact
    website: row.website_url,
    externalBookingUrl: row.external_website_url ?? null,
    lat: row.lat,
    lng: row.lng,
    tier: row.tier,
    ownerId: row.owner_id,
    sessionType: row.session_type ?? null,
    verified: !!(row.email_verified_at || row.phone_verified_at),
    testimonials: row.testimonials ?? [],
    workingHours: row.working_hours ?? null,
    socialLinks: row.social_links ?? null,
    acceptsNewClients: row.accepts_new_clients ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  }
}
