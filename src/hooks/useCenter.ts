import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CenterRow, CenterLocationRow } from '@/types/database';

const CENTER_TYPE_LABELS: Record<string, string> = {
  spa: 'Spa',
  wellness_center: 'Wellness Center',
  clinic: 'Clinic',
  retreat_center: 'Retreat Center',
  yoga_studio: 'Yoga Studio',
};

export interface CenterProfile {
  id: string;
  name: string;
  centerType: string;
  centerTypeLabel: string;
  profileImage: string;
  photos: string[];
  about: string | null;
  modalities: string[];
  amenities: string[];
  address: string | null;
  city: string | null;
  island: string;
  location: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  externalBookingUrl: string | null;
  lat: number | null;
  lng: number | null;
  tier: string;
  ownerId: string | null;
  sessionType: string | null;
  verified: boolean;
  testimonials: Array<{ author: string; text: string; date: string }>;
  workingHours: CenterRow['working_hours'] | null;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    x?: string;
    substack?: string;
  } | null;
}

// Empty string so CenterDetail can render initials fallback instead of a stock photo
const PLACEHOLDER_CENTER = '';

function rowToProfile(row: CenterRow): CenterProfile {
  return {
    id: row.id,
    name: row.name,
    centerType: row.center_type,
    centerTypeLabel: CENTER_TYPE_LABELS[row.center_type] ?? row.center_type,
    profileImage: row.avatar_url || PLACEHOLDER_CENTER,
    photos: row.photos ?? [],
    about: row.description ?? null,
    modalities: row.modalities ?? [],
    amenities: row.amenities ?? [],
    address: row.address,
    city: row.city,
    island: row.island,
    location: [row.city, row.island].filter(Boolean).join(', '),
    phone: row.phone,
    email: row.email,
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
  };
}

/** Public fetch of all locations for a center — no auth needed. */
export function usePublicCenterLocations(centerId: string | undefined) {
  return useQuery<CenterLocationRow[]>({
    queryKey: ['public-center-locations', centerId],
    enabled: !!centerId && !!supabase,
    queryFn: async () => {
      if (!centerId || !supabase) return [];
      const { data, error } = await supabase
        .from('center_locations')
        .select('*')
        .eq('center_id', centerId)
        .order('is_primary', { ascending: false })
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCenter(id: string | undefined) {
  return useQuery<CenterProfile | null>({
    queryKey: ['center', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id || !supabase) return null;

      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data ? rowToProfile(data) : null;
    },
    staleTime: 1000 * 60 * 5,
  });
}
