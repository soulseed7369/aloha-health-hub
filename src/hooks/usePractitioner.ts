import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { profileData } from '@/data/mockData';
import type { PractitionerRow } from '@/types/database';

/**
 * Profile shape used by ProfileDetail page.
 * Superset of PractitionerRow with display-only fields filled in.
 */
export interface PractitionerProfile {
  id: string;
  name: string;
  businessName: string | null;  // practice / business name shown under practitioner name
  title: string;
  island: string | null;   // 'big_island' | 'maui' | 'oahu' | 'kauai'
  profileImage: string;
  verified: boolean;
  acceptingClients: boolean;
  location: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  externalBookingUrl: string | null;
  bookingLabel: string | null;  // custom button label (premium/featured only)
  lat: number | null;
  lng: number | null;
  about: string | null;
  whatToExpect: string | null;
  services: string[];
  modalities: string[];
  gallery: string[];
  tier: string;
  ownerId: string | null;
  updatedAt: string | null;
  testimonials: Array<{ author: string; text: string; date: string }>;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    x?: string;
    substack?: string;
  } | null;
}

const PLACEHOLDER_COVER =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=400&fit=crop';
const PLACEHOLDER_PROFILE =
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop';

function rowToProfile(row: PractitionerRow): PractitionerProfile {
  return {
    id: row.id,
    name: row.name,
    businessName: (row as any).business_name ?? null,
    title: row.modalities.join(', ') || 'Wellness Practitioner',
    island: row.island ?? null,
    profileImage: row.avatar_url || PLACEHOLDER_PROFILE,
    verified: false, // not stored in v1 schema
    acceptingClients: row.accepts_new_clients,
    location: [row.city, row.island].filter(Boolean).join(', '),
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website_url,
    externalBookingUrl: row.external_booking_url,
    bookingLabel: row.booking_label ?? null,
    lat: row.lat,
    lng: row.lng,
    about: row.bio,
    whatToExpect: row.what_to_expect ?? null,
    services: row.modalities,
    modalities: row.modalities,
    gallery: [],
    tier: row.tier,
    ownerId: row.owner_id,
    updatedAt: row.updated_at ?? null,
    testimonials: row.testimonials ?? [],
    socialLinks: row.social_links ?? null,
  };
}

/**
 * Returns a single practitioner by ID as a PractitionerProfile.
 * Falls back to profileData mock when Supabase is not configured.
 */
export function usePractitioner(id: string | undefined) {
  return useQuery<PractitionerProfile | null>({
    queryKey: ['practitioner', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;

      // Fall back to mock data (note: mock only has one profile)
      if (!supabase) {
        return {
          id: profileData.id,
          name: profileData.name,
          businessName: null,
          title: profileData.title,
          island: 'big_island',
          profileImage: profileData.profileImage,
          verified: profileData.verified,
          acceptingClients: profileData.acceptingClients,
          location: profileData.location,
          address: profileData.address,
          phone: profileData.phone,
          email: profileData.email,
          website: profileData.website,
          externalBookingUrl: null,
          bookingLabel: null,
          lat: profileData.lat,
          lng: profileData.lng,
          about: profileData.about,
          whatToExpect: null,
          services: profileData.services,
          modalities: profileData.services,
          gallery: profileData.gallery,
          tier: 'free',
          ownerId: null,
          updatedAt: null,
          testimonials: [],
          socialLinks: null,
        };
      }

      const { data, error } = await supabase
        .from('practitioners')
        .select('*')
        .eq('id', id)
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
