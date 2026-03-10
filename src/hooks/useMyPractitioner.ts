import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
      if (error) throw error;
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
  accepts_new_clients: boolean;
};

export function useSavePractitioner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: PractitionerFormData) => {
      if (!supabase || !user) throw new Error('Not authenticated');

      const payload: Partial<PractitionerInsert> = {
        owner_id: user.id,
        name: formData.name.trim(),
        island: formData.island || 'big_island',
        modalities: formData.modalities.filter(Boolean),
        bio: formData.bio.trim() || null,
        what_to_expect: formData.what_to_expect.trim() || null,
        city: formData.city.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website_url: formData.website_url.trim() || null,
        external_booking_url: formData.external_booking_url.trim() || null,
        accepts_new_clients: formData.accepts_new_clients,
        status: 'draft',
      };

      const { data: existing } = await supabase
        .from('practitioners')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('practitioners')
          .update(payload)
          .eq('id', existing.id)
          .eq('owner_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('practitioners')
          .insert(payload as PractitionerInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-practitioner'] });
    },
  });
}

/** Upload a profile photo using the authenticated user's session */
export async function uploadMyPhoto(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // Validate file type (only allow common image formats)
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.`);
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error(`File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
  }

  // Sanitize extension to prevent path traversal
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `practitioners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('practitioner-images')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('practitioner-images').getPublicUrl(path);
  return data.publicUrl;
}
