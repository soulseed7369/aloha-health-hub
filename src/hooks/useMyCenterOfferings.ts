import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimize';
import type { OfferingRow, OfferingInsert, PriceMode } from '@/types/database';

export type CenterOfferingFormData = {
  id?: string;
  center_id: string;
  title: string;
  description: string;
  offering_type: OfferingRow['offering_type'];
  price_mode: PriceMode;
  price_fixed: string;
  price_min: string;
  price_max: string;
  image_url: string;
  start_date: string;
  end_date: string;
  location: string;
  registration_url: string;
  max_spots: string;
  spots_booked: number;
  sort_order: number;
  status: 'draft' | 'published';
};

export function useMyCenterOfferings(centerId: string | null) {
  return useQuery<OfferingRow[]>({
    queryKey: ['my-center-offerings', centerId],
    enabled: !!centerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !centerId) return [];

      const { data, error } = await supabase
        .from('offerings')
        .select('*')
        .eq('center_id', centerId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function useSaveCenterOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CenterOfferingFormData) => {
      if (!supabase) throw new Error('Supabase not configured');

      const payload: OfferingInsert = {
        center_id: formData.center_id,
        practitioner_id: null as any, // offerings table still has this column but we don't use it for centers
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        offering_type: formData.offering_type,
        price_mode: formData.price_mode,
        price_fixed: formData.price_fixed ? parseFloat(formData.price_fixed) : null,
        price_min: formData.price_min ? parseFloat(formData.price_min) : null,
        price_max: formData.price_max ? parseFloat(formData.price_max) : null,
        image_url: formData.image_url || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        location: formData.location.trim() || null,
        registration_url: formData.registration_url.trim() || null,
        max_spots: formData.max_spots ? parseInt(formData.max_spots, 10) : null,
        spots_booked: formData.spots_booked,
        sort_order: formData.sort_order,
        status: formData.status,
      };

      if (formData.id) {
        const { error } = await supabase
          .from('offerings')
          .update(payload)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('offerings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-center-offerings'] });
    },
  });
}

export function useDeleteCenterOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');

      const { error } = await supabase
        .from('offerings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-center-offerings'] });
    },
  });
}

export async function uploadCenterOfferingImage(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // Optimize: resize + convert to WebP
  const optimized = await optimizeImage(file);

  const ext = optimized.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const path = `centers/offerings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('images')
    .upload(path, optimized, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data.publicUrl;
}
