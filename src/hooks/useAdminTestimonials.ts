/**
 * useAdminTestimonials.ts
 *
 * Admin-only mutations for testimonial management.
 * Requires admin email to match ADMIN_EMAILS list.
 *
 * Option B: Copy-editing (direct text fix by admin, no client re-submission)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Payload for admin to copy-edit full_text and/or highlight
 */
interface AdminEditTestimonialPayload {
  testimonialId: string;
  fullText?: string | null;
  highlight?: string | null;
}

/**
 * Admin: copy-edit testimonial text (full_text and/or highlight).
 *
 * Use this when the admin wants to fix typos or wording directly.
 * No need to ask the client to re-submit — the changes go live immediately
 * on the published testimonial.
 *
 * Calls the admin-edit-testimonial Edge Function.
 * Requires user email to be in ADMIN_EMAILS (src/lib/admin.ts).
 *
 * Example:
 *   const editTestimonial = useAdminEditTestimonial();
 *   editTestimonial.mutate({
 *     testimonialId: 'xxx',
 *     fullText: 'Fixed version of the full testimonial...',
 *     highlight: 'Short quote',
 *   });
 */
export function useAdminEditTestimonial() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: AdminEditTestimonialPayload) => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get current session to ensure token is fresh
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Session expired — please sign in again');
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke(
        'admin-edit-testimonial',
        { body: payload }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to edit testimonial');
      }

      if (data?.error) {
        console.error('Admin edit error:', data.error);
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all testimonial-related queries so they refetch
      queryClient.invalidateQueries({
        queryKey: ['verified-testimonials'],
      });
      queryClient.invalidateQueries({
        queryKey: ['my-testimonials'],
      });
    },
  });
}
