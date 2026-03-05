import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PractitionerRow, CenterRow, ArticleRow } from '@/types/database';

const PRACTITIONER_BUCKET = 'practitioner-images';
const CENTER_BUCKET = 'practitioner-images'; // reuse same bucket

// ─── Query params & result types ────────────────────────────────────────────

export interface AdminQueryParams {
  search?: string;
  sort?: 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc';
  island?: string;
  status?: 'all' | 'published' | 'draft';
  modality?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminQueryResult<T> {
  data: T[];
  total: number;
}

// ─── Upload helpers ─────────────────────────────────────────────────────────

export async function uploadPractitionerImage(file: File): Promise<string> {
  if (!supabaseAdmin) throw new Error('Supabase admin not configured');
  const ext = file.name.split('.').pop();
  const path = `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(PRACTITIONER_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(PRACTITIONER_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCenterImage(file: File): Promise<string> {
  if (!supabaseAdmin) throw new Error('Supabase admin not configured');
  const ext = file.name.split('.').pop();
  const path = `centers/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(CENTER_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(CENTER_BUCKET).getPublicUrl(path);
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
    page = 0,
    pageSize = 50,
  } = params;

  return useQuery<AdminQueryResult<PractitionerRow>>({
    queryKey: ['admin-practitioners', params],
    queryFn: async () => {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');

      let query = supabaseAdmin
        .from('practitioners')
        .select('*, center:centers!practitioners_center_id_fkey(id,name)', { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${search}%`);
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
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
    page = 0,
    pageSize = 50,
  } = params;

  return useQuery<AdminQueryResult<CenterRow>>({
    queryKey: ['admin-centers', params],
    queryFn: async () => {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');

      let query = supabaseAdmin
        .from('centers')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${search}%`);
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin
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

// Fetch all centers as id+name pairs for dropdowns (no pagination)
export const useAllCentersSimple = () => {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['admin-centers-simple'],
    queryFn: async () => {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdmin
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
      centerType: 'spa' | 'wellness_center' | 'clinic' | 'retreat_center';
    }) => {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');

      // Insert as center
      const { error: insertError } = await supabaseAdmin
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
      const { error: deleteError } = await supabaseAdmin
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');

      // Insert as practitioner
      const { error: insertError } = await supabaseAdmin
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
      const { error: deleteError } = await supabaseAdmin
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
  if (!supabaseAdmin) throw new Error('Supabase admin not configured');
  const ext = file.name.split('.').pop();
  const path = `articles/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(ARTICLE_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(ARTICLE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Article queries ──────────────────────────────────────────────────────────

export const useAllArticles = (params: { search?: string; status?: 'all' | 'published' | 'draft' } = {}) => {
  const { search = '', status = 'all' } = params;
  return useQuery<ArticleRow[]>({
    queryKey: ['admin-articles', params],
    queryFn: async () => {
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      let query = supabaseAdmin.from('articles').select('*');
      if (search) query = query.ilike('title', `%${search}%`);
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin.from('articles').insert(payload);
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin.from('articles').update(payload).eq('id', id);
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
      if (!supabaseAdmin) throw new Error('Supabase admin not configured');
      const { error } = await supabaseAdmin.from('articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
};
