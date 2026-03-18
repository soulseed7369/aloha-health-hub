import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type FlagReason = 'closed' | 'inaccurate' | 'duplicate';
export type FlagStatus = 'pending' | 'reviewed' | 'dismissed';

export interface ListingFlag {
  id: string;
  listing_type: 'practitioner' | 'center';
  listing_id: string;
  listing_name: string | null;
  reason: FlagReason;
  details: string | null;
  reporter_email: string | null;
  status: FlagStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitFlagPayload {
  listing_type: 'practitioner' | 'center';
  listing_id: string;
  listing_name: string;
  reason: FlagReason;
  details?: string;
  reporter_email?: string;
}

/** Submit a flag report — available to any visitor (no auth required). */
export function useSubmitFlag() {
  return useMutation({
    mutationFn: async (payload: SubmitFlagPayload) => {
      if (!supabase) throw new Error('Supabase not configured');

      // Input validation
      const VALID_REASONS = ['closed', 'inaccurate', 'duplicate', 'spam', 'inappropriate'];
      if (!VALID_REASONS.includes(payload.reason)) {
        throw new Error('Invalid reason');
      }
      if (payload.details && payload.details.length > 1000) {
        throw new Error('Details must be under 1000 characters');
      }

      const { error } = await supabase.from('listing_flags').insert(payload);
      if (error) throw error;
    },
  });
}

// ── Admin hooks ────────────────────────────────────────────────────────────

/** Fetch all flags, optionally filtered by status. */
export function useAdminFlags(status?: FlagStatus) {
  return useQuery<ListingFlag[]>({
    queryKey: ['admin-flags', status ?? 'all'],
    queryFn: async () => {
      if (!supabase) return [];
      let q = supabase
        .from('listing_flags')
        .select('*')
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Update a flag's status (and optional admin notes). */
export function useUpdateFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status: FlagStatus;
      admin_notes?: string;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('listing_flags')
        .update({ status, ...(admin_notes !== undefined ? { admin_notes } : {}) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flags'] });
    },
  });
}

/** Delete a flag record entirely. */
export function useDeleteFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('listing_flags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flags'] });
    },
  });
}
