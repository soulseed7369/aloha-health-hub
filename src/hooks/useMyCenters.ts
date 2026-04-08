import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimize';
import { assertNoDuplicateByEmail } from '@/lib/duplicateDetection';
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

export type SaveCenterInput = CenterFormData & {
  /**
   * Escape hatch for the duplicate-detection dialog: if true, skip the
   * `assertNoDuplicateByEmail` check and insert anyway. Set only after
   * the user has explicitly chosen "Create new anyway" in the duplicate
   * dialog. The insert will be flagged for admin review via
   * `listing_flags` (reason='duplicate').
   */
  overrideDuplicate?: boolean;
};

export function useSaveCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveCenterInput) => {
      if (!supabase || !user) throw new Error('Not authenticated');
      const { overrideDuplicate, ...formData } = input;

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

      // Oldest-row-wins for users who already have duplicates (see #5).
      // .maybeSingle() would throw PGRST116 after the "create anyway"
      // escape hatch leaves a user with 2+ owned centers.
      const { data: existingRows } = await supabase
        .from('centers')
        .select('id, status, tier')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      const existing = existingRows?.[0] ?? null;

      if (existing) {
        // DON'T overwrite status or tier on existing centers
        const { error } = await supabase
          .from('centers')
          .update(payload)
          .eq('id', existing.id)
          .eq('owner_id', user.id);
        if (error) throw error;

        // After save: sync modality ranks to listing_modalities join table
        // This enforces tier-based search limits (free: top 2, premium: top 5, featured: all)
        try {
          const tier = existing.tier || 'free';
          const modalities = formData.modalities?.filter(Boolean) ?? [];

          // Delete existing modality mappings for this center
          await supabase
            .from('listing_modalities')
            .delete()
            .eq('listing_id', existing.id)
            .eq('listing_type', 'center');

          // Re-insert with rank-based limit enforcement
          if (modalities.length > 0) {
            // Refresh session and get fresh token for edge function auth
            const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
            const session = refreshData?.session;
            if (refreshErr || !session) {
              throw new Error('Session refresh failed — please try again');
            }

            const { error: invokeError } = await supabase.functions.invoke('sync-modality-ranks', {
              body: {
                listing_id: existing.id,
                listing_type: 'center',
                modalities,
                tier,
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            if (invokeError) {
              throw invokeError;
            }
          }
        } catch (err) {
          // Log but don't fail the save — modality sync is best-effort
          // (center profile is already saved; search indexing may be delayed)
          console.warn('Failed to sync modality ranks for center:', err);
        }
      } else {
        // Dedup: before inserting a brand-new row, check whether a
        // listing with this email already exists. See `tasks/todo.md`
        // ("Duplicate Listings on Claim") — this is the primary fix for
        // the Ohana Bali Spa class of bug. Throws DuplicateListingError
        // which the profile editor catches to show a claim-or-override
        // dialog. Fails open if the lookup itself errors.
        if (!overrideDuplicate) {
          await assertNoDuplicateByEmail('centers', formData.email, user.id);
        }

        // Only set status: 'draft' for brand-new centers
        const { data: inserted, error } = await supabase
          .from('centers')
          .insert({ ...payload, status: 'draft' } as CenterInsert)
          .select('id')
          .single();
        if (error) throw error;

        // If the user bypassed the duplicate dialog, file a listing_flags
        // row so admin can review and merge if needed.
        if (overrideDuplicate && inserted?.id) {
          try {
            await supabase.from('listing_flags').insert({
              listing_id: inserted.id,
              listing_type: 'center',
              listing_name: payload.name as string,
              reason: 'duplicate',
              reporter_email: user.email ?? null,
              details: 'User bypassed duplicate-email dialog in profile editor (create-anyway override)',
            });
          } catch (flagErr) {
            console.warn('Failed to file duplicate flag:', flagErr);
          }
        }

        // After creating new center: fetch tier and sync modality ranks.
        // Use the freshly-inserted id directly to avoid .maybeSingle() on a
        // user who may already have duplicates (see #5).
        try {
          const { data: newCenter } = inserted?.id
            ? await supabase
                .from('centers')
                .select('id, tier')
                .eq('id', inserted.id)
                .maybeSingle()
            : { data: null };

          if (newCenter) {
            const tier = newCenter.tier || 'free';
            const modalities = formData.modalities?.filter(Boolean) ?? [];
            if (modalities.length > 0) {
              // Refresh session and get fresh token for edge function auth
              const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
              const session = refreshData?.session;
              if (refreshErr || !session) {
                throw new Error('Session refresh failed — please try again');
              }

              const { error: invokeError } = await supabase.functions.invoke('sync-modality-ranks', {
                body: {
                  listing_id: newCenter.id,
                  listing_type: 'center',
                  modalities,
                  tier,
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });
              if (invokeError) {
                throw invokeError;
              }
            }
          }
        } catch (err) {
          // Log but don't fail the save — center is already created
          console.warn('Failed to sync modality ranks on new center:', err);
        }
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
    .from('practitioner-images')
    .upload(path, optimized, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('practitioner-images').getPublicUrl(path);
  return data.publicUrl;
}
