import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassRow, ClassInsert, PriceMode } from '@/types/database';

export type CenterClassFormData = {
  id?: string;
  center_id: string;
  title: string;
  description: string;
  price_mode: PriceMode;
  price_fixed: string;
  price_min: string;
  price_max: string;
  duration_minutes: string;
  day_of_week: ClassRow['day_of_week'];
  start_time: string;
  specific_date: string;  // "YYYY-MM-DD" for one-off classes
  end_date: string;       // optional end date for multi-day
  location: string;
  registration_url: string;
  max_spots: string;
  spots_booked: number;
  sort_order: number;
  status: 'draft' | 'published';
};

export function useMyCenterClasses(centerId: string | null) {
  return useQuery<ClassRow[]>({
    queryKey: ['my-center-classes', centerId],
    enabled: !!centerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !centerId) return [];

      const { data, error } = await supabase
        .from('classes')
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

export function useSaveCenterClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CenterClassFormData) => {
      if (!supabase) throw new Error('Supabase not configured');

      const payload: ClassInsert = {
        center_id: formData.center_id,
        practitioner_id: '' as any, // classes table still has this column but we don't use it for centers
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price_mode: formData.price_mode,
        price_fixed: formData.price_fixed ? parseFloat(formData.price_fixed) : null,
        price_min: formData.price_min ? parseFloat(formData.price_min) : null,
        price_max: formData.price_max ? parseFloat(formData.price_max) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes, 10) : null,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time || null,
        specific_date: formData.specific_date || null,
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
          .from('classes')
          .update(payload)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('classes')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-center-classes'] });
    },
  });
}

export function useDeleteCenterClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-center-classes'] });
    },
  });
}
