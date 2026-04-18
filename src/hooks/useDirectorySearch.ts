import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  useSearchListings,
  useParsedSearch,
  useAliasMap,
  SearchParams,
} from './useSearchListings';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DirectoryFilters {
  searchQuery: string;
  island: string;        // 'big_island' | 'maui' | 'oahu' | 'kauai' | 'all'
  modality: string;      // modality label from dropdown, or ''
  city: string;          // city name or ''
  sessionType: string;   // 'in_person' | 'online' | 'both' | ''
  acceptsClients: boolean;
  tab: 'practitioners' | 'centers' | 'all';
  page: number;
  pageSize: number;
}

export interface DirectoryResult {
  id: string;
  listing_type: 'practitioner' | 'center';
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  city: string | null;
  island: string | null;
  tier: string | null;
  modalities: string[] | null;
  session_type: string | null;
  accepts_new_clients: boolean | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  external_booking_url: string | null;
  lat: number | null;
  lng: number | null;
  center_type: string | null;
  modality_labels: string[];
  concern_labels: string[];
  approach_labels: string[];
  composite_score: number;
  profile_completeness: number;
}

interface FacetParent {
  id: number;
  label: string;
  slug: string;
  children: { id: number; label: string; slug: string }[];
}

// ── useDirectorySearch ─────────────────────────────────────────────────────

/**
 * Bridge hook: connects the old Directory.tsx filter UI to the new
 * search_listings RPC. Merges explicit filter state with parsed search intent.
 */
export function useDirectorySearch(filters: DirectoryFilters) {
  const { intent, isReady: aliasReady } = useParsedSearch(filters.searchQuery);
  const { aliasMap } = useAliasMap();

  const searchParams = useMemo<SearchParams>(() => {
    const params: SearchParams = {
      query: intent?.freeText || '',
      page: filters.page,
      pageSize: filters.pageSize,
      listingType: filters.tab === 'all' ? undefined : (filters.tab === 'practitioners' ? 'practitioner' : 'center'),
    };

    // Modalities: from parsed intent + explicit dropdown
    const modIds = [...(intent?.modalities || [])];
    if (filters.modality && aliasMap) {
      const term = aliasMap.get(filters.modality.toLowerCase());
      if (term && term.axis === 'modality' && !modIds.includes(term.id)) {
        modIds.push(term.id);
      }
    }
    if (modIds.length > 0) params.modalities = modIds;

    // Concerns & approaches from parsed intent
    if (intent?.concerns?.length) params.concerns = intent.concerns;
    if (intent?.approaches?.length) params.approaches = intent.approaches;

    // Island: explicit filter overrides parsed intent
    if (filters.island && filters.island !== 'all') {
      params.island = filters.island;
    } else if (intent?.island) {
      params.island = intent.island;
    }

    // City: explicit filter overrides parsed intent
    if (filters.city) {
      params.city = filters.city;
    } else if (intent?.city) {
      params.city = intent.city;
    }

    // Session type
    if (filters.sessionType) {
      params.sessionType = filters.sessionType;
    }

    // Accepts new clients
    if (filters.acceptsClients) {
      params.acceptsNew = true;
    }

    return params;
  }, [filters, intent, aliasMap]);

  const { data, isLoading, error } = useSearchListings(searchParams, aliasReady);

  const results = useMemo<DirectoryResult[]>(() => {
    if (!data?.results) return [];
    return data.results as DirectoryResult[];
  }, [data]);

  return {
    results,
    totalCount: data?.totalCount ?? 0,
    isLoading: isLoading || !aliasReady,
    error,
  };
}

// ── useModalityTermId ──────────────────────────────────────────────────────

/** Resolve a modality label (from the old dropdown) to its taxonomy term ID. */
export function useModalityTermId(modalityLabel: string): number | null {
  const { aliasMap } = useAliasMap();
  return useMemo(() => {
    if (!aliasMap || !modalityLabel) return null;
    const term = aliasMap.get(modalityLabel.toLowerCase());
    return term && term.axis === 'modality' ? term.id : null;
  }, [aliasMap, modalityLabel]);
}

// ── useTaxonomyFacets ──────────────────────────────────────────────────────

/**
 * Fetch modality parent categories with their children for a faceted filter UI.
 * Returns grouped modalities like:
 *   Bodywork → [Massage, Craniosacral, Lomilomi, ...]
 *   Energy & Healing → [Reiki, Sound Healing, ...]
 */
export function useTaxonomyFacets() {
  const { data, isLoading } = useQuery({
    queryKey: ['taxonomy-facets'],
    queryFn: async () => {
      // Fetch the modality axis ID
      const { data: axes } = await supabase
        .from('taxonomy_axes')
        .select('id')
        .eq('slug', 'modality')
        .single();

      if (!axes) return [];

      // Fetch all modality terms
      const { data: terms } = await supabase
        .from('taxonomy_terms')
        .select('id, slug, label, parent_id, sort_order')
        .eq('axis_id', axes.id)
        .order('sort_order');

      if (!terms) return [];

      // Separate parents and children
      const parents = terms.filter((t) => t.parent_id === null);
      const children = terms.filter((t) => t.parent_id !== null);

      // Group children under parents
      const facets: FacetParent[] = parents.map((p) => ({
        id: p.id,
        label: p.label,
        slug: p.slug,
        children: children
          .filter((c) => c.parent_id === p.id)
          .map((c) => ({ id: c.id, label: c.label, slug: c.slug })),
      }));

      // Standalone modalities (no children under them) are already added as parents,
      // so this section is not needed — all items are already in facets via the parents map

      return facets;
    },
    staleTime: Infinity,
  });

  return { parents: data ?? [], isLoading };
}
