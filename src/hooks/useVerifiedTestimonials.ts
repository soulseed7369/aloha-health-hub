import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { VerifiedTestimonialRow, PractitionerRow } from '@/types/database';

/**
 * Fetch published verified testimonials for a practitioner (public).
 * No authentication required.
 */
export function useVerifiedTestimonials(practitionerId: string | null) {
  return useQuery<VerifiedTestimonialRow[]>({
    queryKey: ['verified-testimonials', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];
      const { data, error } = await supabase
        .from('verified_testimonials')
        .select('id, practitioner_id, invite_status, client_display_name, client_island, full_text, highlight, practitioner_response, responded_at, submitted_at, published_at, created_at, updated_at')
        .eq('practitioner_id', practitionerId)
        .eq('invite_status', 'published')
        .order('submitted_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch verified testimonials:', error);
        return [];
      }
      // Sort by "most helpful": highlight present → longer text → newest
      return (data ?? []).sort((a, b) => {
        const aHas = a.highlight ? 1 : 0;
        const bHas = b.highlight ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        const aLen = (a.full_text ?? '').split(/\s+/).length;
        const bLen = (b.full_text ?? '').split(/\s+/).length;
        if (bLen !== aLen) return bLen - aLen;
        return new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime();
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export interface TestimonialInviteData {
  testimonial: VerifiedTestimonialRow;
  practitioner: { id: string; name: string; avatar_url: string | null };
}

/**
 * Fetch testimonial invite by token (for the client submission page, no auth).
 * Joins with practitioner data to display context.
 */
export function useTestimonialInvite(token: string | null) {
  return useQuery<TestimonialInviteData | null>({
    queryKey: ['testimonial-invite', token],
    enabled: !!token && !!supabase,
    queryFn: async () => {
      if (!supabase || !token) return null;

      // Fetch the invite
      const { data: invite, error: inviteError } = await supabase
        .from('verified_testimonials')
        .select('*')
        .eq('invite_token', token)
        .maybeSingle();

      if (inviteError || !invite) {
        console.error('Failed to fetch testimonial invite:', inviteError);
        return null;
      }

      // Fetch the practitioner for context
      const { data: practitioner, error: practError } = await supabase
        .from('practitioners')
        .select('id, name, avatar_url')
        .eq('id', invite.practitioner_id)
        .maybeSingle();

      if (practError || !practitioner) {
        console.error('Failed to fetch practitioner:', practError);
        return null;
      }

      return {
        testimonial: invite,
        practitioner: {
          id: practitioner.id,
          name: practitioner.name,
          avatar_url: practitioner.avatar_url,
        },
      };
    },
    staleTime: 0, // Don't cache invite data — always fresh
  });
}

/**
 * Fetch all testimonial invites for a practitioner (dashboard, requires auth).
 * Returns all statuses (pending, submitted, published, flagged, expired).
 */
export function useMyTestimonialInvites(practitionerId: string | null) {
  const { user } = useAuth();
  return useQuery<VerifiedTestimonialRow[]>({
    queryKey: ['my-testimonial-invites', practitionerId, user?.id],
    enabled: !!practitionerId && !!user && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];
      const { data, error } = await supabase
        .from('verified_testimonials')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch testimonial invites:', error);
        return [];
      }
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

interface SendTestimonialInvitePayload {
  practitionerId: string;
  clientEmail: string;
}

/**
 * Send a testimonial invite.
 * Calls the create-testimonial-invite Edge Function.
 */
export function useSendTestimonialInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: SendTestimonialInvitePayload) => {
      if (!supabase || !user) throw new Error('Not authenticated');

      // Refresh session to ensure valid token
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Session expired — please sign in again');

      // Use supabase.functions.invoke — handles apikey, auth, and CORS correctly
      const { data, error } = await supabase.functions.invoke(
        'create-testimonial-invite',
        { body: payload }
      );

      if (error) {
        throw new Error(error.message || 'Failed to send testimonial invite');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ['my-testimonial-invites', payload.practitionerId, user?.id],
      });
    },
  });
}

interface RespondToTestimonialPayload {
  testimonialId: string;
  response: string;
}

/**
 * Respond to a testimonial.
 * Updates practitioner_response and responded_at.
 */
export function useRespondToTestimonial() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: RespondToTestimonialPayload) => {
      if (!supabase || !user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verified_testimonials')
        .update({
          practitioner_response: payload.response,
          responded_at: new Date().toISOString(),
        })
        .eq('id', payload.testimonialId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all testimonial-related queries to refetch
      queryClient.invalidateQueries({
        queryKey: ['my-testimonial-invites'],
      });
      queryClient.invalidateQueries({
        queryKey: ['verified-testimonials'],
      });
    },
  });
}
