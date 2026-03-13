/**
 * useAccounts.ts
 * Admin hooks for managing user accounts, tiers, and featured slots.
 * All mutations use supabase (service role) to bypass RLS.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
// NOTE: Admin functions (useAdminAccounts, useSetAccountTier, etc.) require a
// service-role client and are not yet implemented. Move to an Edge Function.

export type AccountTier = 'free' | 'premium' | 'featured';

export interface UserAccount {
  id: string;
  email: string;
  created_at: string;
  tier: AccountTier;
  subscription_status: string | null;
  subscription_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  practitioner_count: number;
  center_count: number;
  // Listing details for quick display
  listings: Array<{
    id: string;
    name: string;
    type: 'practitioner' | 'center';
    island: string;
    status: string;
    tier: string;
  }>;
}

export interface FeaturedSlot {
  id: string;
  island: string;
  listing_type: 'practitioner' | 'center';
  listing_id: string;
  listing_name?: string;
  owner_id: string | null;
  owner_email?: string;
  active_since: string;
}

export interface FeaturedSlotsByIsland {
  [island: string]: {
    slots: FeaturedSlot[];
    remaining: number;
  };
}

const ISLANDS = ['big_island', 'oahu', 'maui', 'kauai', 'molokai'];
const MAX_FEATURED_PER_ISLAND = 5;

// ── Admin: list all user accounts ────────────────────────────────────────────

export function useAdminAccounts() {
  return useQuery<UserAccount[]>({
    queryKey: ['admin-accounts'],
    queryFn: async () => {
      if (!supabase) return [];

      // Fetch user_profiles joined to auth users via admin API
      const { data: profiles, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profileErr) throw profileErr;

      if (!profiles?.length) return [];

      // Fetch auth users to get email addresses (requires service role)
      const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
      if (authErr) throw authErr;

      const emailMap: Record<string, string> = {};
      for (const u of authData.users) {
        emailMap[u.id] = u.email ?? '(no email)';
      }

      // Fetch all practitioners and centers for these users
      const ids = profiles.map(p => p.id);
      const { data: practitioners } = await supabase
        .from('practitioners')
        .select('id, name, island, status, tier, owner_id')
        .in('owner_id', ids);

      const { data: centers } = await supabase
        .from('centers')
        .select('id, name, island, status, tier, owner_id')
        .in('owner_id', ids);

      return profiles.map(profile => {
        const practList = (practitioners ?? []).filter(p => p.owner_id === profile.id);
        const centerList = (centers ?? []).filter(c => c.owner_id === profile.id);

        const listings = [
          ...practList.map(p => ({ ...p, type: 'practitioner' as const })),
          ...centerList.map(c => ({ ...c, type: 'center' as const })),
        ];

        return {
          id: profile.id,
          email: emailMap[profile.id] ?? '(unknown)',
          created_at: profile.created_at,
          tier: profile.tier as AccountTier,
          subscription_status: profile.subscription_status,
          subscription_period_end: profile.subscription_period_end,
          stripe_customer_id: profile.stripe_customer_id,
          stripe_subscription_id: profile.stripe_subscription_id,
          stripe_price_id: profile.stripe_price_id,
          practitioner_count: practList.length,
          center_count: centerList.length,
          listings,
        };
      });
    },
    staleTime: 1000 * 30,
  });
}

// ── Admin: manually override a user's tier ───────────────────────────────────

export function useSetAccountTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: AccountTier }) => {
      if (!supabase) throw new Error('Admin client not configured');

      // Update user_profiles
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ tier })
        .eq('id', userId);
      if (profileErr) throw profileErr;

      // Sync tier to all their listings
      await supabase
        .from('practitioners')
        .update({ tier })
        .eq('owner_id', userId);
      await supabase
        .from('centers')
        .update({ tier })
        .eq('owner_id', userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
    },
  });
}

// ── Featured slots ────────────────────────────────────────────────────────────

export function useAdminFeaturedSlots() {
  return useQuery<FeaturedSlotsByIsland>({
    queryKey: ['admin-featured-slots'],
    queryFn: async () => {
      if (!supabase) return buildEmptySlots();

      const { data: slots, error } = await supabase
        .from('featured_slots')
        .select('*')
        .order('active_since', { ascending: true });
      if (error) throw error;

      // Enrich with listing names
      const practIds = slots?.filter(s => s.listing_type === 'practitioner').map(s => s.listing_id) ?? [];
      const centerIds = slots?.filter(s => s.listing_type === 'center').map(s => s.listing_id) ?? [];

      const { data: practs } = practIds.length
        ? await supabase.from('practitioners').select('id, name').in('id', practIds)
        : { data: [] };
      const { data: cents } = centerIds.length
        ? await supabase.from('centers').select('id, name').in('id', centerIds)
        : { data: [] };

      const nameMap: Record<string, string> = {};
      for (const p of practs ?? []) nameMap[p.id] = p.name;
      for (const c of cents ?? []) nameMap[c.id] = c.name;

      // Fetch owner emails
      const ownerIds = [...new Set((slots ?? []).map(s => s.owner_id).filter(Boolean))];
      const { data: authData } = ownerIds.length
        ? await supabase.auth.admin.listUsers()
        : { data: { users: [] } };
      const emailMap: Record<string, string> = {};
      for (const u of authData?.users ?? []) emailMap[u.id] = u.email ?? '';

      const result = buildEmptySlots();
      for (const slot of slots ?? []) {
        const island = slot.island;
        if (!result[island]) result[island] = { slots: [], remaining: MAX_FEATURED_PER_ISLAND };
        result[island].slots.push({
          ...slot,
          listing_name: nameMap[slot.listing_id],
          owner_email: emailMap[slot.owner_id ?? ''],
        });
        result[island].remaining = Math.max(0, MAX_FEATURED_PER_ISLAND - result[island].slots.length);
      }
      return result;
    },
    staleTime: 1000 * 30,
  });
}

export function useRemoveFeaturedSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => {
      if (!supabase) throw new Error('Admin client not configured');
      const { error } = await supabase
        .from('featured_slots')
        .delete()
        .eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-slots'] });
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
    },
  });
}

function buildEmptySlots(): FeaturedSlotsByIsland {
  const result: FeaturedSlotsByIsland = {};
  for (const island of ISLANDS) {
    result[island] = { slots: [], remaining: MAX_FEATURED_PER_ISLAND };
  }
  return result;
}

// ── Public: fetch featured practitioners/centers for homepage rotation ────────

export function useFeaturedListings(island = 'big_island') {
  return useQuery({
    queryKey: ['featured-listings', island],
    queryFn: async () => {
      if (!supabase) return [];

      const { data: slots, error } = await supabase
        .from('featured_slots')
        .select('listing_id, listing_type')
        .eq('island', island);
      if (error || !slots?.length) return [];

      const practIds = slots.filter(s => s.listing_type === 'practitioner').map(s => s.listing_id);
      const centerIds = slots.filter(s => s.listing_type === 'center').map(s => s.listing_id);

      const [{ data: practs }, { data: cents }] = await Promise.all([
        practIds.length
          ? supabase.from('practitioners').select('id, name, avatar_url, modalities, city, bio, slug').in('id', practIds).eq('status', 'published')
          : Promise.resolve({ data: [] }),
        centerIds.length
          ? supabase.from('centers').select('id, name, avatar_url, modalities, city, description, slug').in('id', centerIds).eq('status', 'published')
          : Promise.resolve({ data: [] }),
      ]);

      const listings = [
        ...(practs ?? []).map(p => ({ ...p, type: 'practitioner' as const })),
        ...(cents ?? []).map(c => ({ ...c, type: 'center' as const })),
      ];

      // Shuffle for random rotation each page load
      return listings.sort(() => Math.random() - 0.5);
    },
    staleTime: 1000 * 60 * 5,
  });
}
