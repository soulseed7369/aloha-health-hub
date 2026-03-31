import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { optimizeImage } from '@/lib/imageOptimize';
import type { PractitionerRow, CenterRow, ArticleRow, PractitionerTestimonialRow, OfferingRow, OfferingInsert, ClassRow, ClassInsert } from '@/types/database';

const IMAGE_BUCKET = 'practitioner-images'; // the Supabase storage bucket for all listing images

/** Escape SQL LIKE wildcards in user-supplied search strings. */
function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, '\\$&');
}

// ─── Query params & result types ────────────────────────────────────────────

export interface AdminQueryParams {
  search?: string;
  sort?: 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc'
       | 'completeness_asc' | 'completeness_desc'
       | 'quality_asc' | 'quality_desc';
  island?: string;
  status?: 'all' | 'published' | 'draft';
  modality?: string;
  tier?: string;                 // 'all' | 'free' | 'premium' | 'featured'
  // Centers-only filters
  centerType?: string;           // 'all' | 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio'
  missingData?: string;          // 'all' | 'phone' | 'email' | 'phone_or_email' | 'description' | 'photo'
  claimed?: 'all' | 'claimed' | 'unclaimed';
  page?: number;
  pageSize?: number;
}

export interface AdminQueryResult<T> {
  data: T[];
  total: number;
}

// ─── Upload helpers ─────────────────────────────────────────────────────────

export async function uploadPractitionerImage(file: File): Promise<string> {
  if (!supabase) {
    throw new Error(
      'Admin operations require proper server-side setup. ' +
      'Image uploads must be performed via an authenticated Edge Function with service role access.'
    );
  }

  // Optimize: resize + convert to WebP
  const optimized = await optimizeImage(file);

  const ext = optimized.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const path = `practitioners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, optimized, { upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCenterImage(file: File): Promise<string> {
  if (!supabase) {
    throw new Error(
      'Admin operations require proper server-side setup. ' +
      'Image uploads must be performed via an authenticated Edge Function with service role access.'
    );
  }

  // Optimize: resize + convert to WebP
  const optimized = await optimizeImage(file);

  const ext = optimized.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const path = `practitioners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, optimized, { upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Practitioner queries ────────────────────────────────────────────────────

export const useAllPractitioners = (params: AdminQueryParams = {}) => {
  const {
    search = '',
    sort = 'updated_desc',
    island = '',
    status = 'all',
    modality = '',
    tier = 'all',
    claimed = 'all',
    page = 0,
    pageSize = 50,
  } = params;

  return useQuery<AdminQueryResult<PractitionerRow>>({
    queryKey: ['admin-practitioners', params],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');

      let query = supabase
        .from('practitioners')
        .select('*, center:centers!practitioners_center_id_fkey(id,name)', { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${escapeLike(search)}%`);
      }

      if (island && island !== 'all') {
        query = query.eq('island', island);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (modality && modality !== 'all') {
        query = query.contains('modalities', [modality]);
      }

      if (tier && tier !== 'all') {
        query = query.eq('tier', tier);
      }

      if (claimed === 'claimed') {
        query = query.not('owner_id', 'is', null);
      } else if (claimed === 'unclaimed') {
        query = query.is('owner_id', null);
      }

      switch (sort) {
        case 'updated_asc':
          query = query.order('updated_at', { ascending: true });
          break;
        case 'name_asc':
          query = query.order('name', { ascending: true });
          break;
        case 'name_desc':
          query = query.order('name', { ascending: false });
          break;
        case 'completeness_asc':
          query = query.order('profile_completeness', { ascending: true, nullsFirst: false });
          break;
        case 'completeness_desc':
          query = query.order('profile_completeness', { ascending: false, nullsFirst: false });
          break;
        // quality_asc/desc: fetched with default order; AdminPanel sorts client-side
        case 'quality_asc':
        case 'quality_desc':
        case 'updated_desc':
        default:
          query = query.order('updated_at', { ascending: false });
          break;
      }

      query = query.range(page * pageSize, page * pageSize + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });
};

export const usePublishPractitioner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'published' | 'draft' }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('practitioners')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
    },
  });
};

export const useDeletePractitioner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('practitioners')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
    },
  });
};

export const useInsertPractitioner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      practitioner: Omit<PractitionerRow, 'id' | 'created_at' | 'updated_at'>
    ) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('practitioners')
        .insert(practitioner)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
    },
  });
};

export const useUpdatePractitioner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<Omit<PractitionerRow, 'id' | 'created_at' | 'updated_at'>>) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('practitioners')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
    },
  });
};

// ─── Center queries ──────────────────────────────────────────────────────────

export const useAllCenters = (params: AdminQueryParams = {}) => {
  const {
    search = '',
    sort = 'updated_desc',
    island = '',
    status = 'all',
    modality = '',
    tier = 'all',
    centerType = 'all',
    missingData = 'all',
    claimed = 'all',
    page = 0,
    pageSize = 50,
  } = params;

  return useQuery<AdminQueryResult<CenterRow>>({
    queryKey: ['admin-centers', params],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');

      let query = supabase
        .from('centers')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${escapeLike(search)}%`);
      }

      if (island && island !== 'all') {
        query = query.eq('island', island);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (modality && modality !== 'all') {
        query = query.contains('modalities', [modality]);
      }

      if (tier && tier !== 'all') {
        query = query.eq('tier', tier);
      }

      if (centerType && centerType !== 'all') {
        query = query.eq('center_type', centerType);
      }

      if (missingData && missingData !== 'all') {
        if (missingData === 'phone') query = query.is('phone', null);
        else if (missingData === 'email') query = query.is('email', null);
        else if (missingData === 'phone_or_email') query = query.or('phone.is.null,email.is.null');
        else if (missingData === 'description') query = query.or('description.is.null,description.eq.');
        else if (missingData === 'photo') query = query.is('avatar_url', null);
      }

      if (claimed === 'claimed') {
        query = query.not('owner_id', 'is', null);
      } else if (claimed === 'unclaimed') {
        query = query.is('owner_id', null);
      }

      switch (sort) {
        case 'updated_asc':
          query = query.order('updated_at', { ascending: true });
          break;
        case 'name_asc':
          query = query.order('name', { ascending: true });
          break;
        case 'name_desc':
          query = query.order('name', { ascending: false });
          break;
        case 'completeness_asc':
          query = query.order('profile_completeness', { ascending: true, nullsFirst: false });
          break;
        case 'completeness_desc':
          query = query.order('profile_completeness', { ascending: false, nullsFirst: false });
          break;
        // quality_asc/desc: fetched with default order; AdminPanel sorts client-side
        case 'quality_asc':
        case 'quality_desc':
        case 'updated_desc':
        default:
          query = query.order('updated_at', { ascending: false });
          break;
      }

      query = query.range(page * pageSize, page * pageSize + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
  });
};

// ─── Batch publish ───────────────────────────────────────────────────────────

export const useBatchPublish = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      table,
      ids,
      status,
    }: {
      table: 'practitioners' | 'centers';
      ids: string[];
      status: 'published' | 'draft' | 'archived';
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from(table)
        .update({ status })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
    },
  });
};

// ─── Batch delete ────────────────────────────────────────────────────────────

export const useBatchDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      table,
      ids,
    }: {
      table: 'practitioners' | 'centers';
      ids: string[];
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
    },
  });
};

// Fetch all centers as id+name pairs for dropdowns (no pagination)
export const useAllCentersSimple = () => {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['admin-centers-simple'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('centers')
        .select('id, name')
        .eq('status', 'published')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });
};

export const usePublishCenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'published' | 'draft' }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('centers')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers-as-providers'] });
    },
  });
};

export const useDeleteCenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('centers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers-as-providers'] });
    },
  });
};

export const useInsertCenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (center: Omit<CenterRow, 'id' | 'created_at' | 'updated_at'>) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('centers')
        .insert(center)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers-as-providers'] });
    },
  });
};

export const useUpdateCenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<Omit<CenterRow, 'id' | 'created_at' | 'updated_at'>>) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('centers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers-as-providers'] });
    },
  });
};

export const useConvertPractitionerToCenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      practitioner,
      centerType,
    }: {
      practitioner: PractitionerRow;
      centerType: 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio';
    }) => {
      if (!supabase) throw new Error('Supabase not configured');

      // Insert as center
      const { error: insertError } = await supabase
        .from('centers')
        .insert({
          name: practitioner.name,
          center_type: centerType,
          description: practitioner.bio,
          island: practitioner.island,
          region: practitioner.region,
          city: practitioner.city,
          address: practitioner.address,
          lat: practitioner.lat,
          lng: practitioner.lng,
          phone: practitioner.phone,
          email: practitioner.email,
          website_url: practitioner.website_url,
          external_website_url: practitioner.website_url,
          avatar_url: practitioner.avatar_url,
          photos: practitioner.avatar_url ? [practitioner.avatar_url] : [],
          status: practitioner.status,
          tier: practitioner.tier,
          owner_id: practitioner.owner_id,
          is_featured: (practitioner as any).is_featured ?? false,
          session_type: (practitioner as any).session_type ?? 'in_person',
          social_links: (practitioner as any).social_links ?? {},
          testimonials: (practitioner as any).testimonials ?? [],
          working_hours: (practitioner as any).working_hours ?? {},
        });

      if (insertError) throw insertError;

      // Delete the practitioner record
      const { error: deleteError } = await supabase
        .from('practitioners')
        .delete()
        .eq('id', practitioner.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      queryClient.invalidateQueries({ queryKey: ['centers-as-providers'] });
    },
  });
};

// ─── Convert center → practitioner ──────────────────────────────────────────

export const useConvertCenterToPractitioner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (center: CenterRow) => {
      if (!supabase) throw new Error('Supabase not configured');

      // Insert as practitioner
      const { error: insertError } = await supabase
        .from('practitioners')
        .insert({
          name: center.name,
          bio: center.description,
          island: center.island,
          region: center.region,
          city: center.city,
          address: center.address,
          lat: center.lat,
          lng: center.lng,
          phone: center.phone,
          email: center.email,
          website_url: center.website_url ?? center.external_website_url,
          avatar_url: center.avatar_url,
          modalities: center.modalities ?? [],
          status: center.status,
          tier: center.tier,
          owner_id: center.owner_id,
          social_links: center.social_links ?? {},
          testimonials: center.testimonials ?? [],
          working_hours: center.working_hours ?? {},
        });

      if (insertError) throw insertError;

      // Delete the center record
      const { error: deleteError } = await supabase
        .from('centers')
        .delete()
        .eq('id', center.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
    },
  });
};

// ─── Article image upload ─────────────────────────────────────────────────────

const ARTICLE_BUCKET = 'practitioner-images'; // reuse same bucket

export async function uploadArticleImage(file: File): Promise<string> {
  if (!supabase) {
    throw new Error(
      'Admin operations require proper server-side setup. ' +
      'Image uploads must be performed via an authenticated Edge Function with service role access.'
    );
  }

  // Validate file type (only allow common image formats)
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.`);
  }

  // Validate file size (max 10MB for admin uploads)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`File size must be less than 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
  }

  // Sanitize extension to prevent path traversal
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `articles/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(ARTICLE_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(ARTICLE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Article queries ──────────────────────────────────────────────────────────

export const useAllArticles = (params: { search?: string; status?: 'all' | 'published' | 'draft' } = {}) => {
  const { search = '', status = 'all' } = params;
  return useQuery<ArticleRow[]>({
    queryKey: ['admin-articles', params],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');
      let query = supabase.from('articles').select('*');
      if (search) query = query.ilike('title', `%${escapeLike(search)}%`);
      if (status !== 'all') query = query.eq('status', status);
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
};

// ─── Article mutations ────────────────────────────────────────────────────────

type ArticlePayload = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  island: string | null;
  tags: string[];
  featured: boolean;
  author: string | null;
  published_at: string | null;
  status: 'draft' | 'published' | 'archived';
};

export const useInsertArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ArticlePayload) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('articles').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
};

export const useUpdateArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ArticlePayload> }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('articles').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
};

export const useDeleteArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
};

// ─── Per-listing tier override ───────────────────────────────────────────────

export type ListingType = 'practitioner' | 'center';

export const useSetListingTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
      listingType,
      tier,
      island,
      ownerId,
      previousTier,
    }: {
      listingId: string;
      listingType: ListingType;
      tier: 'free' | 'premium' | 'featured';
      island: string;
      ownerId: string | null;
      previousTier: string | null;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');

      if (ownerId) {
        // Use unified RPC when listing has an owner
        // This single call manages: user_profiles tier, all listings tier, and featured_slots
        const { error } = await supabase.rpc('set_user_tier', {
          p_user_id: ownerId,
          p_new_tier: tier,
          p_old_tier: previousTier,
        });
        if (error) throw error;
      } else {
        // Orphan listing (no owner) — update listing tier directly
        const table = listingType === 'practitioner' ? 'practitioners' : 'centers';
        const { error } = await supabase
          .from(table)
          .update({ tier, is_featured: tier === 'featured' })
          .eq('id', listingId);
        if (error) throw error;

        // Handle featured slots for orphan listings
        if (tier === 'featured') {
          const { error: slotError } = await supabase
            .from('featured_slots')
            .upsert({
              listing_id: listingId,
              listing_type: listingType,
              island,
              owner_id: ownerId,
            }, { onConflict: 'listing_id' });
          if (slotError) throw slotError;
        }

        if (previousTier === 'featured' && tier !== 'featured') {
          const { error: deleteError } = await supabase
            .from('featured_slots')
            .delete()
            .eq('listing_id', listingId);
          if (deleteError) throw deleteError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-featured-slots'] });
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      queryClient.invalidateQueries({ queryKey: ['my-billing-profile'] });
    },
  });
};

// ─── Pipeline corrections (admin feedback for classification improvements) ───

export const useRecordCorrection = () => {
  return useMutation({
    mutationFn: async ({
      listingId,
      listingType,
      field,
      oldValue,
      newValue,
    }: {
      listingId: string;
      listingType: ListingType;
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('pipeline_corrections').insert({
        listing_id: listingId,
        listing_type: listingType,
        field,
        old_value: oldValue,
        new_value: newValue,
      });
      if (error) throw error;
    },
  });
};

// ─── Admin linking: manually link unclaimed listing to user account ────────

export const useAdminLinkListing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
      listingType,
      userId,
    }: {
      listingId: string;
      listingType: 'practitioner' | 'center';
      userId: string;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.rpc('admin_link_listing', {
        p_listing_id: listingId,
        p_listing_type: listingType,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-practitioners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });
      queryClient.invalidateQueries({ queryKey: ['my-billing-profile'] });
    },
  });
};

// ─── Admin testimonial management (practitioner_testimonials table) ───────────

export const useAdminTestimonials = (practitionerId: string | null) => {
  return useQuery<PractitionerTestimonialRow[]>({
    queryKey: ['admin-testimonials', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];
      const { data, error } = await supabase
        .from('practitioner_testimonials')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAdminAddTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (testimonial: {
      practitioner_id: string;
      author: string;
      text: string;
      author_location?: string;
      testimonial_date?: string;
      status?: 'draft' | 'published';
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('practitioner_testimonials')
        .insert({
          ...testimonial,
          status: testimonial.status ?? 'published',
          sort_order: 0,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials', vars.practitioner_id] });
    },
  });
};

export const useAdminUpdateTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, practitioner_id, ...updates }: {
      id: string;
      practitioner_id: string;
      author?: string;
      text?: string;
      author_location?: string;
      testimonial_date?: string;
      status?: 'draft' | 'published';
      sort_order?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('practitioner_testimonials')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials', vars.practitioner_id] });
    },
  });
};

export const useAdminDeleteTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, practitioner_id }: { id: string; practitioner_id: string }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('practitioner_testimonials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials', vars.practitioner_id] });
    },
  });
};

// ─── Admin offerings management ─────────────────────────────────────────────

export const useAdminOfferings = (practitionerId: string | null) => {
  return useQuery<OfferingRow[]>({
    queryKey: ['admin-offerings', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];
      const { data, error } = await supabase
        .from('offerings')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAdminAddOffering = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offering: {
      practitioner_id: string;
      title: string;
      description?: string;
      offering_type: 'retreat' | 'workshop' | 'immersion' | 'mentorship' | 'ceremony' | 'event';
      price_mode: 'fixed' | 'range' | 'sliding' | 'contact' | 'free';
      price_fixed?: number;
      price_min?: number;
      price_max?: number;
      image_url?: string;
      start_date?: string;
      end_date?: string;
      location?: string;
      registration_url?: string;
      max_spots?: number;
      status?: 'draft' | 'published';
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('offerings')
        .insert({
          ...offering,
          status: offering.status ?? 'draft',
          spots_booked: 0,
          sort_order: 0,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-offerings', vars.practitioner_id] });
    },
  });
};

export const useAdminUpdateOffering = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      practitioner_id,
      ...updates
    }: {
      id: string;
      practitioner_id: string;
      title?: string;
      description?: string | null;
      offering_type?: 'retreat' | 'workshop' | 'immersion' | 'mentorship' | 'ceremony' | 'event';
      price_mode?: 'fixed' | 'range' | 'sliding' | 'contact' | 'free';
      price_fixed?: number | null;
      price_min?: number | null;
      price_max?: number | null;
      image_url?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      location?: string | null;
      registration_url?: string | null;
      max_spots?: number | null;
      status?: 'draft' | 'published';
      sort_order?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('offerings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-offerings', vars.practitioner_id] });
    },
  });
};

export const useAdminDeleteOffering = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, practitioner_id }: { id: string; practitioner_id: string }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('offerings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-offerings', vars.practitioner_id] });
    },
  });
};

// ─── Admin classes management ───────────────────────────────────────────────

export const useAdminClasses = (practitionerId: string | null) => {
  return useQuery<ClassRow[]>({
    queryKey: ['admin-classes', practitionerId],
    enabled: !!practitionerId && !!supabase,
    queryFn: async () => {
      if (!supabase || !practitionerId) return [];
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAdminAddClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classData: {
      practitioner_id: string;
      title: string;
      description?: string;
      price_mode: 'fixed' | 'range' | 'sliding' | 'contact' | 'free';
      price_fixed?: number;
      price_min?: number;
      price_max?: number;
      duration_minutes?: number;
      day_of_week?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
      start_time?: string;
      location?: string;
      registration_url?: string;
      max_spots?: number;
      status?: 'draft' | 'published';
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          status: classData.status ?? 'draft',
          spots_booked: 0,
          sort_order: 0,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes', vars.practitioner_id] });
    },
  });
};

export const useAdminUpdateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      practitioner_id,
      ...updates
    }: {
      id: string;
      practitioner_id: string;
      title?: string;
      description?: string | null;
      price_mode?: 'fixed' | 'range' | 'sliding' | 'contact' | 'free';
      price_fixed?: number | null;
      price_min?: number | null;
      price_max?: number | null;
      duration_minutes?: number | null;
      day_of_week?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null;
      start_time?: string | null;
      location?: string | null;
      registration_url?: string | null;
      max_spots?: number | null;
      status?: 'draft' | 'published';
      sort_order?: number;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes', vars.practitioner_id] });
    },
  });
};

export const useAdminDeleteClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, practitioner_id }: { id: string; practitioner_id: string }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes', vars.practitioner_id] });
    },
  });
};
