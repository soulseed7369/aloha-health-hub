import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { PractitionerProfile } from '@/hooks/usePractitioner'
import type { PractitionerRow } from '@/types/database'

export async function getPractitioner(id: string): Promise<PractitionerProfile | null> {
  const supabase = createServerSupabaseClient()

  if (!supabase) return null

  const { data: row, error } = await supabase
    .from('practitioners')
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
    businessName: (row as any).business_name ?? null,
    title: row.modalities.join(', ') || 'Wellness Practitioner',
    island: row.island ?? null,
    profileImage: row.avatar_url || '',
    verified: !!(row as any).email_verified_at || !!(row as any).phone_verified_at,
    acceptingClients: row.accepts_new_clients,
    location: [row.city, row.island].filter(Boolean).join(', '),
    address: row.address,
    phone: null,  // omitted from SSR — revealed client-side via /api/contact
    email: null,  // omitted from SSR — revealed client-side via /api/contact
    website: row.website_url,
    externalBookingUrl: row.external_booking_url,
    bookingLabel: row.booking_label ?? null,
    discoveryCallUrl: row.discovery_call_url ?? null,
    lat: row.lat,
    lng: row.lng,
    about: row.bio,
    whatToExpect: row.what_to_expect ?? null,
    services: row.modalities,
    modalities: row.modalities,
    gallery: (() => {
      const allPhotos = (row.photos ?? []).filter(Boolean)
      const profileIdx = row.profile_photo_index ?? 0
      return allPhotos.filter((_, i) => i !== profileIdx)
    })(),
    tier: row.tier,
    ownerId: row.owner_id,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    responseTime: row.response_time ?? null,
    testimonials: row.testimonials ?? [],
    socialLinks: row.social_links ?? null,
    workingHours: row.working_hours ?? null,
    servicesList: (row as any).services_list ?? [],
    bookingEnabled: row.booking_enabled ?? false,
    messagingEnabled: row.messaging_enabled ?? false,
    discoveryCallEnabled: row.discovery_call_enabled ?? false
  }
}
