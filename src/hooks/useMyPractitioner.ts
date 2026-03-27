import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimize';
import type { PractitionerRow, PractitionerInsert } from '@/types/database';

export function useMyPractitioner() {
  const { user } = useAuth();
  return useQuery<PractitionerRow | null>({
    queryKey: ['my-practitioner', user?.id],
    enabled: !!user && !!supabase,
    queryFn: async () => {
      if (!supabase || !user) return null;
      const { data, error } = await supabase
        .from('practitioners')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) {
        console.error('Failed to fetch practitioner profile:', error);
        return null;
      }
      return data ?? null;
    },
    staleTime: 1000 * 30,
  });
}

export type PractitionerFormData = {
  name: string;
  island: string;
  modalities: string[];
  bio: string;
  what_to_expect: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website_url: string;
  external_booking_url: string;
  booking_label: string;
  accepts_new_clients: boolean;
  avatar_url?: string | null;
  photos?: string[];
  profile_photo_index?: number;
  video_url?: string | null;  // YouTube or Vimeo URL
  response_time: string;  // '' | 'within_hours' | 'within_day' | 'within_2_3_days' | 'within_week'
  // Privacy & CTA toggles (Offerings & Events feature)
  booking_enabled: boolean;
  messaging_enabled: boolean;
  discovery_call_enabled: boolean;
  discovery_call_url: string;
  // Social links, working hours (Premium/Featured), and services list
  social_links?: { instagram?: string; facebook?: string; linkedin?: string; x?: string; substack?: string } | null;
  working_hours?: { [key: string]: Array<{ open: string; close: string }> | null } | null;
  services_list?: Array<{ name: string; description?: string; price?: string }>;
};

export function useSavePractitioner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: PractitionerFormData) => {
      if (!supabase || !user) throw new Error('Not authenticated');

      // Core fields that exist in the base practitioners table (always safe to write)
      const payload: Record<string, unknown> = {
        owner_id: user.id,
        name: formData.name.trim(),
        island: formData.island || 'big_island',
        modalities: formData.modalities.filter(Boolean),
        bio: formData.bio.trim() || null,
        city: formData.city.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website_url: formData.website_url.trim() || null,
        external_booking_url: formData.external_booking_url.trim() || null,
        accepts_new_clients: formData.accepts_new_clients,
        ...(formData.avatar_url !== undefined && { avatar_url: formData.avatar_url }),
        ...(formData.photos !== undefined && { photos: formData.photos }),
        ...(formData.profile_photo_index !== undefined && { profile_photo_index: formData.profile_photo_index }),
        // Video URL
        ...(formData.video_url !== undefined && { video_url: formData.video_url?.trim() || null }),
        // Extended fields (added by later migrations — safe if columns exist)
        what_to_expect: formData.what_to_expect?.trim() || null,
        booking_label: formData.booking_label?.trim() || null,
        response_time: formData.response_time?.trim() || null,
        booking_enabled: formData.booking_enabled ?? true,
        messaging_enabled: formData.messaging_enabled ?? true,
        discovery_call_enabled: formData.discovery_call_enabled ?? false,
        discovery_call_url: formData.discovery_call_url?.trim() || null,
        // Social links, working hours (Premium/Featured), and services list
        ...(formData.social_links !== undefined && { social_links: formData.social_links }),
        ...(formData.working_hours !== undefined && { working_hours: formData.working_hours }),
        ...(formData.services_list !== undefined && { services_list: formData.services_list }),
      };

      const { data: existing } = await supabase
        .from('practitioners')
        .select('id, status')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existing) {
        // DON'T overwrite status or tier on existing listings — those are
        // managed by admin/Stripe, not the provider's profile form
        const { error } = await supabase
          .from('practitioners')
          .update(payload)
          .eq('id', existing.id)
          .eq('owner_id', user.id);
        if (error) throw error;
      } else {
        // Only set status: 'draft' for brand-new listings
        const { error } = await supabase
          .from('practitioners')
          .insert({ ...payload, status: 'draft' } as PractitionerInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-practitioner'] });
    },
  });
}

/**
 * Upload a photo using the authenticated user's session.
 * Automatically optimizes to WebP before upload.
 */
export async function uploadMyPhoto(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // optimizeImage handles validation + WebP conversion + resize
  const optimized = await optimizeImage(file);

  const ext = optimized.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const path = `practitioners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('practitioner-images')
    .upload(path, optimized, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('practitioner-images').getPublicUrl(path);
  return data.publicUrl;
}
