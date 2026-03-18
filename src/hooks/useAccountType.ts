/**
 * useAccountType.ts
 * Manage account type (practitioner vs center) for the current user.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type AccountType = 'practitioner' | 'center';

export interface AccountTypeData {
  accountType: AccountType | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch the account type for the current user.
 * Always returns 'practitioner' as default after loading completes.
 * Returns 'practitioner' | 'center' (never null after loading).
 */
export function useAccountType() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['account-type', user?.id],
    queryFn: async (): Promise<AccountType> => {
      if (!supabase || !user) return 'practitioner';

      const { data, error } = await supabase
        .from('user_profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch account type:', error);
        return 'practitioner';
      }

      // Default to 'practitioner' if null in database
      return (data?.account_type ?? 'practitioner') as AccountType;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Set or update the account type for the current user.
 */
export function useSetAccountType() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountType: AccountType) => {
      if (!supabase || !user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ account_type: accountType })
        .eq('id', user.id);

      if (error) throw error;
      return accountType;
    },
    onSuccess: (accountType) => {
      queryClient.setQueryData(['account-type', user?.id], accountType);
    },
  });
}
