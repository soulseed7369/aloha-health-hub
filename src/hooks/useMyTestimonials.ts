import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PractitionerTestimonialRow, PractitionerTestimonialInsert } from '@/types/database';

export function useMyTestimonials(practitionerId: string | null) {
  return useQuery<PractitionerTestimonialRow[]>({
    queryKey: ['my-testimonials', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];
      const { data, error } = await supabase
        .from('practitioner_testimonials')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch testimonials:', error);
        return [];
      }
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function useAddMyTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PractitionerTestimonialInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('practitioner_testimonials')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-testimonials'] });
    },
  });
}

export function useUpdateMyTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PractitionerTestimonialRow> & { id: string }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('practitioner_testimonials')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-testimonials'] });
    },
  });
}

export function useDeleteMyTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('practitioner_testimonials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-testimonials'] });
    },
  });
}
