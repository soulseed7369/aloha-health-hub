import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimize';
import type { CenterRow, CenterLocationRow, WorkingHours, CenterInsert } from '@/types/database';

// ─── Centers ──────────────────────────────────────────────────────────────────

export function useMyCenters() {
  const { user } = useAuth();

  return useQuery<CenterRow[]>({
    queryKey: ['my-centers', user?.id],
    enabled: !!user && !!supabase,
    queryFn: async () => {
      if (!supabase || !user) return [];

      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('owner_id', user.id)
        .neq('status', 'archived')
        .order('name');

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export type CenterFormData = {
  name: string;
  center_type: CenterRow['center_type'];
  description: string;
  island: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website_url: string;
  external_website_url: string;
  accepts_new_clients?: boolean;
  modalities?: string[];
  avatar_url?: string | null;
  photos?: string[];
  video_url?: string | null;  // YouTube or Vimeo URL
  session_type?: 'in_person' | 'online' | 'both';
  social_links?: { instagram?: string; facebook?: string; linkedin?: string; x?: string; substack?: string } | null;
  working_hours?: { [key: string]: Array<{ open: string; close: string }> | null } | null;
};

export function useAddCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CenterFormData) => {
      if (!supabase || !user) throw new Error('Not authenticated');

      const { error } = await supabase.from('centers').insert({
        owner_id: user.id,
        name: formData.name.trim(),
        center_type: formData.center_type,
        description: formData.description.trim() || null,
        city: formData.city.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website_url: formData.website_url.trim() || null,
        external_website_url: formData.external_website_url.trim() || null,
        accepts_new_clients: formData.accepts_new_clients ?? true,
        island: formData.island || 'big_island',
        status: 'draft',
        modalities: formData.modalities?.filter(Boolean) ?? [],
        session_type: formData.session_type ?? 'in_person',
        social_links: formData.social_links ?? {},
        working_hours: formData.working_hours ?? {},
        avatar_url: formData.avatar_url ?? null,
        photos: formData.photos ?? [],
        video_url: formData.video_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-centers'] });
    },
  });
}

export function useSaveCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CenterFormData) => {
      if (!supabase || !user) throw new Error('Not authenticated');

      const payload: Record<string, unknown> = {
        owner_id: user.id,
        name: formData.name.trim(),
        center_type: formData.center_type,
        description: formData.description.trim() || null,
        island: formData.island || 'big_island',
        city: formData.city.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website_url: formData.website_url.trim() || null,
        external_website_url: formData.external_website_url.trim() || null,
        ...(formData.accepts_new_clients !== undefined && { accepts_new_clients: formData.accepts_new_clients }),
        ...(formData.modalities !== undefined && { modalities: formData.modalities.filter(Boolean) }),
        ...(formData.avatar_url !== undefined && { avatar_url: formData.avatar_url }),
        ...(formData.photos !== undefined && { photos: formData.photos }),
        // Video URL
        ...(formData.video_url !== undefined && { video_url: formData.video_url?.trim() || null }),
        ...(formData.session_type !== undefined && { session_type: formData.session_type }),
        ...(formData.social_links !== undefined && { social_links: formData.social_links }),
        ...(formData.working_hours !== undefined && { working_hours: formData.working_hours }),
      };

      const { data: existing } = await supabase
        .from('centers')
        .select('id, status')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existing) {
        // DON'T overwrite status or tier on existing centers
        const { error } = await supabase
          .from('centers')
          .update(payload)
          .eq('id', existing.id)
          .eq('owner_id', user.id);
        if (error) throw error;
      } else {
        // Only set status: 'draft' for brand-new centers
        const { error } = await supabase
          .from('centers')
          .insert({ ...payload, status: 'draft' } as CenterInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-centers'] });
    },
  });
}

export function useDeleteCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (centerId: string) => {
      if (!supabase || !user) throw new Error('Not authenticated');

      // Soft delete — set status to archived
      const { error } = await supabase
        .from('centers')
        .update({ status: 'archived' })
        .eq('id', centerId)
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-centers'] });
    },
  });
}

// ─── Center Locations ─────────────────────────────────────────────────────────

/** Fetch all locations for a specific center. */
export function useCenterLocations(centerId: string | null) {
  return useQuery<CenterLocationRow[]>({
    queryKey: ['center-locations', centerId],
    enabled: !!centerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !centerId) return [];
      const { data, error } = await supabase
        .from('center_locations')
        .select('*')
        .eq('center_id', centerId)
        .order('sort_order')
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export type LocationFormData = {
  name: string;
  island: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  working_hours: WorkingHours;
  is_primary: boolean;
};

export const emptyLocationForm: LocationFormData = {
  name: '',
  island: 'big_island',
  city: '',
  address: '',
  phone: '',
  email: '',
  working_hours: {},
  is_primary: false,
};

/** Add a new location to a center. */
export function useAddCenterLocation(centerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: LocationFormData) => {
      if (!supabase) throw new Error('Not authenticated');

      // If marking as primary, demote any existing primary first
      if (form.is_primary) {
        await supabase
          .from('center_locations')
          .update({ is_primary: false })
          .eq('center_id', centerId)
          .eq('is_primary', true);
      }

      const { error } = await supabase.from('center_locations').insert({
        center_id: centerId,
        name: form.name.trim() || null,
        island: form.island,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        working_hours: form.working_hours,
        is_primary: form.is_primary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-locations', centerId] });
    },
  });
}

/** Update an existing location. */
export function useUpdateCenterLocation(centerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, form }: { id: string; form: LocationFormData }) => {
      if (!supabase) throw new Error('Not authenticated');

      // Demote existing primary before promoting this one
      if (form.is_primary) {
        await supabase
          .from('center_locations')
          .update({ is_primary: false })
          .eq('center_id', centerId)
          .eq('is_primary', true)
          .neq('id', id);
      }

      const { error } = await supabase
        .from('center_locations')
        .update({
          name: form.name.trim() || null,
          island: form.island,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          working_hours: form.working_hours,
          is_primary: form.is_primary,
        })
        .eq('id', id)
        .eq('center_id', centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-locations', centerId] });
    },
  });
}

/** Delete a location. */
export function useDeleteCenterLocation(centerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('center_locations')
        .delete()
        .eq('id', locationId)
        .eq('center_id', centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-locations', centerId] });
    },
  });
}

/** Set a location as the primary one (demotes any existing primary). */
export function useSetPrimaryLocation(centerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      if (!supabase) throw new Error('Not authenticated');

      // Demote all, then promote target
      await supabase
        .from('center_locations')
        .update({ is_primary: false })
        .eq('center_id', centerId);

      const { error } = await supabase
        .from('center_locations')
        .update({ is_primary: true })
        .eq('id', locationId)
        .eq('center_id', centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-locations', centerId] });
    },
  });
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────

/**
 * Upload a center photo using the authenticated user's session.
 * Automatically optimizes to WebP before upload.
 */
export async function uploadCenterPhoto(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // optimizeImage handles validation + WebP conversion + resize
  const optimized = await optimizeImage(file);

  const ext = optimized.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const path = `centers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('images')
    .upload(path, optimized, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data.publicUrl;
}
