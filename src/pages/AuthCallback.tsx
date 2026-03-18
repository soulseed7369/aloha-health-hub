import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';
import { Leaf, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AccountType } from '@/hooks/useAccountType';

/**
 * Handles the Supabase PKCE magic-link / email-confirm callback.
 *
 * Supabase JS v2 uses PKCE by default. When the user clicks the magic link
 * in their email, Supabase redirects to this page with ?code=xxxx in the URL.
 * We exchange that code for a session, then forward to /dashboard.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      navigate('/auth');
      return;
    }

    const code = new URLSearchParams(window.location.search).get('code');

    if (!code) {
      // No code in URL — might be an old implicit-flow link or direct navigation
      navigate('/auth');
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(async ({ data, error: exchangeError }) => {
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }

        const userId = data.session?.user?.id;

        // Save pending account type if it exists
        const pendingAccountType = localStorage.getItem('pendingAccountType') as AccountType | null;
        if (userId && pendingAccountType) {
          try {
            await supabase
              .from('user_profiles')
              .update({ account_type: pendingAccountType })
              .eq('id', userId);
            localStorage.removeItem('pendingAccountType');
          } catch (err) {
            console.error('Failed to set account type:', err);
          }
        }

        // Admin users go straight to the admin panel
        if (isAdmin(data.session?.user?.email)) {
          navigate('/admin', { replace: true });
          return;
        }
        // Check for a pending plan or other post-login redirect
        const pending = localStorage.getItem('pendingPlan');
        const validPlans = ['free', 'price_1T7lnYAmznBlrx8sZkolChSm', 'price_1T7loEAmznBlrx8s5j92qxX8', 'price_1TCA70AmznBlrx8sSVyl2HtA', 'price_1TCA7KAmznBlrx8s2IOtOThI'];
        if (pending && validPlans.includes(pending) && pending !== 'free') {
          navigate('/dashboard/billing', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      });
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
        <Link to="/" className="mb-8 flex items-center gap-2 text-primary">
          <Leaf className="h-6 w-6" />
          <span className="font-display text-xl font-bold">Hawa'i Wellness</span>
        </Link>
        <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="font-medium text-destructive">Sign-in link expired or invalid</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            to="/auth"
            className="inline-block mt-2 text-sm font-medium text-primary hover:underline"
          >
            Request a new link →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30">
      <Leaf className="h-8 w-8 animate-pulse text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
