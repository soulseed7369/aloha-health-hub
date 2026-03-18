import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PriceMode } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CenterEventRow {
  id: string;
  center_id: string;
  title: string;
  description: string | null;
  event_date: string | null;       // ISO date "YYYY-MM-DD"
  start_time: string | null;       // "HH:mm:ss"
  end_time: string | null;
  duration_minutes: number | null;
  price_mode: PriceMode;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  image_url: string | null;
  location: string | null;         // override location string
  registration_url: string | null;
  max_attendees: number | null;
  attendees_booked: number;
  is_recurring: boolean;
  recurrence_rule: string | null;  // 'weekly', 'monthly', 'every tue/thu', etc.
  sort_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export type EventFormData = {
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  price_mode: PriceMode;
  price_fixed: string;
  price_min: string;
  price_max: string;
  location: string;
  registration_url: string;
  max_attendees: string;
  is_recurring: boolean;
  recurrence_rule: string;
  status: 'draft' | 'published';
};

export const emptyEventForm: EventFormData = {
  title: '',
  description: '',
  event_date: '',
  start_time: '',
  end_time: '',
  price_mode: 'fixed',
  price_fixed: '',
  price_min: '',
  price_max: '',
  location: '',
  registration_url: '',
  max_attendees: '',
  is_recurring: false,
  recurrence_rule: '',
  status: 'published',
};

function formToInsert(form: EventFormData, centerId: string) {
  return {
    center_id:        centerId,
    title:            form.title.trim(),
    description:      form.description.trim() || null,
    event_date:       form.event_date || null,
    start_time:       form.start_time || null,
    end_time:         form.end_time   || null,
    price_mode:       form.price_mode,
    price_fixed:      form.price_fixed  ? parseFloat(form.price_fixed)  : null,
    price_min:        form.price_min    ? parseFloat(form.price_min)    : null,
    price_max:        form.price_max    ? parseFloat(form.price_max)    : null,
    location:         form.location.trim()          || null,
    registration_url: form.registration_url.trim()  || null,
    max_attendees:    form.max_attendees ? parseInt(form.max_attendees, 10) : null,
    is_recurring:     form.is_recurring,
    recurrence_rule:  form.recurrence_rule.trim()   || null,
    status:           form.status,
  };
}

// ─── Owner hooks (dashboard) ──────────────────────────────────────────────────

/** All events for all centers owned by the current user — scoped to one center. */
export function useCenterEvents(centerId: string | null) {
  const { user } = useAuth();

  return useQuery<CenterEventRow[]>({
    queryKey: ['center-events', centerId],
    enabled: !!centerId && !!user && !!supabase,
    queryFn: async () => {
      if (!supabase || !centerId) return [];
      const { data, error } = await supabase
        .from('center_events')
        .select('*')
        .eq('center_id', centerId)
        .order('event_date', { ascending: true, nullsFirst: false })
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function useAddCenterEvent(centerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: EventFormData) => {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('center_events')
        .insert(formToInsert(form, centerId));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-events', centerId] });
      queryClient.invalidateQueries({ queryKey: ['public-center-events', centerId] });
    },
  });
}

export function useUpdateCenterEvent(centerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, form }: { id: string; form: EventFormData }) => {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('center_events')
        .update(formToInsert(form, centerId))
        .eq('id', id)
        .eq('center_id', centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-events', centerId] });
      queryClient.invalidateQueries({ queryKey: ['public-center-events', centerId] });
    },
  });
}

export function useDeleteCenterEvent(centerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!supabase) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('center_events')
        .delete()
        .eq('id', eventId)
        .eq('center_id', centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-events', centerId] });
      queryClient.invalidateQueries({ queryKey: ['public-center-events', centerId] });
    },
  });
}

// ─── Public hook (profile page) ───────────────────────────────────────────────

/** Upcoming published events for a center — no auth needed. */
export function usePublicCenterEvents(centerId: string | undefined) {
  return useQuery<CenterEventRow[]>({
    queryKey: ['public-center-events', centerId],
    enabled: !!centerId && !!supabase,
    queryFn: async () => {
      if (!centerId || !supabase) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('center_events')
        .select('*')
        .eq('center_id', centerId)
        .eq('status', 'published')
        .or(`event_date.gte.${today},event_date.is.null`)
        .order('event_date', { ascending: true, nullsFirst: false })
        .order('sort_order')
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Amenities update ─────────────────────────────────────────────────────────

export function useUpdateCenterAmenities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ centerId, amenities }: { centerId: string; amenities: string[] }) => {
      if (!supabase || !user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('centers')
        .update({ amenities })
        .eq('id', centerId)
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: (_d, { centerId }) => {
      queryClient.invalidateQueries({ queryKey: ['my-centers'] });
      queryClient.invalidateQueries({ queryKey: ['center', centerId] });
    },
  });
}
