import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMyPractitioner } from './useMyPractitioner';
import type { PractitionerTestimonialRow } from '@/types/database';

export function usePractitionerTestimonials(practitionerId: string | null) {
  return useQuery<PractitionerTestimonialRow[]>({
    queryKey: ['practitioner-testimonials', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];

      const { data, error } = await supabase
        .from('practitioner_testimonials')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Provider testimonial CRUD mutations ─────────────────────────────────────

export const useMyTestimonials = () => {
  const { data: practitioner } = useMyPractitioner();

  return useQuery<PractitionerTestimonialRow[]>({
    queryKey: ['my-testimonials', practitioner?.id],
    enabled: !!practitioner?.id && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitioner?.id) return [];

      const { data, error } = await supabase
        .from('practitioner_testimonials')
        .select('*')
        .eq('practitioner_id', practitioner.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAddMyTestimonial = () => {
  const queryClient = useQueryClient();
  const { data: practitioner } = useMyPractitioner();

  return useMutation({
    mutationFn: async (testimonial: {
      author: string;
      text: string;
      author_location?: string;
      testimonial_date?: string;
      status?: 'draft' | 'published';
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      if (!practitioner?.id) throw new Error('No practitioner found');

      const { data, error } = await supabase
        .from('practitioner_testimonials')
        .insert({
          practitioner_id: practitioner.id,
          ...testimonial,
          status: testimonial.status ?? 'draft',
          sort_order: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-testimonials', practitioner?.id] });
    },
  });
};

export const useUpdateMyTestimonial = () => {
  const queryClient = useQueryClient();
  const { data: practitioner } = useMyPractitioner();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      author?: string;
      text?: string;
      author_location?: string;
      testimonial_date?: string;
      status?: 'draft' | 'published';
      sort_order?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      if (!practitioner?.id) throw new Error('No practitioner found');

      const { error } = await supabase
        .from('practitioner_testimonials')
        .update(updates)
        .eq('id', id)
        .eq('practitioner_id', practitioner.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-testimonials', practitioner?.id] });
    },
  });
};

export const useDeleteMyTestimonial = () => {
  const queryClient = useQueryClient();
  const { data: practitioner } = useMyPractitioner();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      if (!practitioner?.id) throw new Error('No practitioner found');

      const { error } = await supabase
        .from('practitioner_testimonials')
        .delete()
        .eq('id', id)
        .eq('practitioner_id', practitioner.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-testimonials', practitioner?.id] });
    },
  });
};
