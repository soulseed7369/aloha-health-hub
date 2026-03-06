import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasSupabase } from '@/lib/supabase';

/**
 * Protects admin routes. Redirects to /auth if:
 * - User is not logged in
 *
 * NOTE: This is a temporary client-side check. A proper implementation requires:
 * - A user.role claim in the JWT (set via Supabase custom claims)
 * - Server-side verification of admin status via Supabase RLS + custom role
 * - Admin functions should only be callable via Edge Functions with role verification
 *
 * Currently this only checks authentication. A full admin system requires:
 * 1. Add admin role column to auth.users (via Supabase dashboard)
 * 2. Create custom claims in JWT that include the admin role
 * 3. Verify role on server-side (Edge Functions)
 * 4. Use RLS policies with role-based checks
 */
export function AdminProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // TODO: Verify admin role from JWT custom claim
  // const isAdmin = (user as any)?.user_metadata?.admin === true;
  // if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
