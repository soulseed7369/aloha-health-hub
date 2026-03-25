import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase client singleton.
 * Will be `null` when env vars are not configured (dev without Supabase).
 * In that case, hooks fall back to mock data automatically.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          // Disable automatic code/token detection from the URL.
          // AuthCallback.tsx handles code exchange explicitly.
          // Without this, the Supabase client races AuthCallback to consume
          // the ?code= param, causing intermittent redirect failures.
          detectSessionInUrl: false,
        },
      })
    : null;

export const hasSupabase = !!supabase;
