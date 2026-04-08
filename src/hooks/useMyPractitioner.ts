import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimize';
import { assertNoDuplicateByEmail } from '@/lib/duplicateDetection';
import type { PractitionerRow, PractitionerInsert } from '@/types/database';

export function useMyPractitioner() {
  const { user } = useAuth();
  return useQuery<PractitionerRow | null>({
    queryKey: ['my-practitioner', user?.id],
    enabled: !!user && !!supabase,
    queryFn: async () => {
      if (!supabase || !user) return null;
      // Ordered + limited instead of .maybeSingle() — a user can legitimately
      // own 2+ rows (e.g. after the duplicate-dialog "create anyway" escape
      // hatch) and .maybeSingle() would throw PGRST116 in that case. We
      // always return the oldest row as the canonical one so edits stay
      // stable. See `tasks/todo.md` fix #5 ("maybeSingle hygiene").
      const { data, error } = await supabase
        .from('practitioners')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) {
        console.error('Failed to fetch practitioner profile:', error);
        return null;
      }
      return data?.[0] ?? null;
    },
    staleTime: 1000 * 30,
  });
}

export type PractitionerFormData = {
  name: string;
  title: string;
  island: string;
  modalities: string[];
  bio: string;
  what_to_expect: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website_url: string;
  external_booking_url: string;
  booking_label: string;
  accepts_new_clients: boolean;
  avatar_url?: string | null;
  photos?: string[];
  profile_photo_index?: number;
  video_url?: string | null;  // YouTube or Vimeo URL
  response_time: string;  // '' | 'within_hours' | 'within_day' | 'within_2_3_days' | 'within_week'
  // Privacy & CTA toggles (Offerings & Events feature)
  booking_enabled: boolean;
  messaging_enabled: boolean;
  discovery_call_enabled: boolean;
  discovery_call_url: string;
  // Social links, working hours (Premium/Featured), and services list
  social_links?: { instagram?: string; facebook?: string; linkedin?: string; x?: string; substack?: string } | null;
  working_hours?: { [key: string]: Array<{ open: string; close: string }> | null } | null;
  services_list?: Array<{ name: string; description?: string; price?: string }>;
};

export type SavePractitionerInput = PractitionerFormData & {
  /**
   * Escape hatch for the duplicate-detection dialog: if true, skip the
   * `assertNoDuplicateByEmail` check and insert anyway. Set only after
   * the user has explicitly chosen "Create new anyway" in the duplicate
   * dialog. The insert will be flagged for admin review via
   * `listing_flags` (reason='duplicate').
   */
  overrideDuplicate?: boolean;
};

export function useSavePractitioner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SavePractitionerInput) => {
      if (!supabase || !user) throw new Error('Not authenticated');
      const { overrideDuplicate, ...formData } = input;

      // Core fields that exist in the base practitioners table (always safe to write)
      const payload: Record<string, unknown> = {
        owner_id: user.id,
        name: formData.name.trim(),
        title: formData.title?.trim() || null,
        island: formData.island || 'big_island',
        modalities: formData.modalities.filter(Boolean),
        bio: formData.bio.trim() || null,
        city: formData.city.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website_url: formData.website_url.trim() || null,
        external_booking_url: formData.external_booking_url.trim() || null,
        accepts_new_clients: formData.accepts_new_clients,
        ...(formData.avatar_url !== undefined && { avatar_url: formData.avatar_url }),
        ...(formData.photos !== undefined && { photos: formData.photos }),
        ...(formData.profile_photo_index !== undefined && { profile_photo_index: formData.profile_photo_index }),
        // Video URL
        ...(formData.video_url !== undefined && { video_url: formData.video_url?.trim() || null }),
        // Extended fields (added by later migrations — safe if columns exist)
        what_to_expect: formData.what_to_expect?.trim() || null,
        booking_label: formData.booking_label?.trim() || null,
        response_time: formData.response_time?.trim() || null,
        booking_enabled: formData.booking_enabled ?? true,
        messaging_enabled: formData.messaging_enabled ?? true,
        discovery_call_enabled: formData.discovery_call_enabled ?? false,
        discovery_call_url: formData.discovery_call_url?.trim() || null,
        // Social links, working hours (Premium/Featured), and services list
        ...(formData.social_links !== undefined && { social_links: formData.social_links }),
        ...(formData.working_hours !== undefined && { working_hours: formData.working_hours }),
        ...(formData.services_list !== undefined && { services_list: formData.services_list }),
      };

      // Oldest-row-wins for users who already have duplicates (see #5).
      const { data: existingRows } = await supabase
        .from('practitioners')
        .select('id, status, tier')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      const existing = existingRows?.[0] ?? null;

      if (existing) {
        // DON'T overwrite status or tier on existing listings — those are
        // managed by admin/Stripe, not the provider's profile form
        const { error } = await supabase
          .from('practitioners')
          .update(payload)
          .eq('id', existing.id)
          .eq('owner_id', user.id);
        if (error) throw error;

        // After save: sync modality ranks to listing_modalities join table
        // This enforces tier-based search limits (free: top 2, premium: top 5, featured: all)
        try {
          const tier = existing.tier || 'free';
          const modalities = formData.modalities.filter(Boolean);

          // Delete existing modality mappings for this listing
          await supabase
            .from('listing_modalities')
            .delete()
            .eq('listing_id', existing.id)
            .eq('listing_type', 'practitioner');

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
                listing_type: 'practitioner',
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
          // (profile is already saved; search indexing may be delayed)
          console.warn('Failed to sync modality ranks:', err);
        }
      } else {
        // Dedup: before inserting a brand-new row, check whether a
        // listing with this email already exists. See `tasks/todo.md`
        // ("Duplicate Listings on Claim") — throws DuplicateListingError
        // which the profile editor catches to show a claim-or-override
        // dialog. Fails open if the lookup itself errors.
        if (!overrideDuplicate) {
          await assertNoDuplicateByEmail('practitioners', formData.email, user.id);
        }

        // Only set status: 'draft' for brand-new listings
        const { data: inserted, error } = await supabase
          .from('practitioners')
          .insert({ ...payload, status: 'draft' } as PractitionerInsert)
          .select('id')
          .single();
        if (error) throw error;

        // If the user bypassed the duplicate dialog, file a listing_flags
        // row so admin can review and merge if needed.
        if (overrideDuplicate && inserted?.id) {
          try {
            await supabase.from('listing_flags').insert({
              listing_id: inserted.id,
              listing_type: 'practitioner',
              listing_name: payload.name as string,
              reason: 'duplicate',
              reporter_email: user.email ?? null,
              details: 'User bypassed duplicate-email dialog in profile editor (create-anyway override)',
            });
          } catch (flagErr) {
            console.warn('Failed to file duplicate flag:', flagErr);
          }
        }

        // After creating new listing: fetch tier and sync modality ranks.
        // Use the freshly-inserted id directly to avoid .maybeSingle() on a
        // user who may already have duplicates (see #5).
        try {
          const { data: newListing } = inserted?.id
            ? await supabase
                .from('practitioners')
                .select('id, tier')
                .eq('id', inserted.id)
                .maybeSingle()
            : { data: null };

          if (newListing) {
            const tier = newListing.tier || 'free';
            const modalities = formData.modalities.filter(Boolean);
            if (modalities.length > 0) {
              // Refresh session and get fresh token for edge function auth
              const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
              const session = refreshData?.session;
              if (refreshErr || !session) {
                throw new Error('Session refresh failed — please try again');
              }

              const { error: invokeError } = await supabase.functions.invoke('sync-modality-ranks', {
                body: {
                  listing_id: newListing.id,
                  listing_type: 'practitioner',
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
          // Log but don't fail the save — profile is already created
          console.warn('Failed to sync modality ranks on new listing:', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-practitioner'] });
    },
  });
}

/**
 * Upload a photo using the authenticated user's session.
 * Automatically optimizes to WebP before upload.
 */
export async function uploadMyPhoto(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // optimizeImage handles validation + WebP conversion + resize
  const optimized = await optimizeImage(file);

  const ext = optimized.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const path = `practitioners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('practitioner-images')
    .upload(path, optimized, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('practitioner-images').getPublicUrl(path);
  return data.publicUrl;
}
