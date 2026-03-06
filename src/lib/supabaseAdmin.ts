/**
 * SECURITY NOTICE: The service role key MUST NEVER be used in the browser.
 *
 * This file was attempting to create an admin Supabase client in the browser,
 * which would expose the service role key (if loaded from VITE_SUPABASE_SERVICE_ROLE_KEY).
 *
 * The service role key must ONLY be used:
 * 1. In Supabase Edge Functions (server-side)
 * 2. In server-side API routes (if applicable)
 * 3. Never in the browser bundle
 *
 * Admin operations must be performed via:
 * - Supabase Edge Functions (for automated tasks)
 * - Backend API endpoints (if applicable)
 * - Direct Supabase console (for manual operations)
 */

export const supabaseAdmin = null;
