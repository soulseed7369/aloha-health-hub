import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';
import { Leaf, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AccountType } from '@/hooks/useAccountType';
import type { Session } from '@supabase/supabase-js';

/**
 * Handles the post-auth callback for all Supabase auth flows:
 *
 * - PKCE flow: URL contains ?code=xxxx — auto-detection (detectSessionInUrl)
 *   exchanges it for a session automatically.
 * - Implicit flow: URL hash contains #access_token=xxx — auto-detection
 *   processes the hash automatically.
 * - Already signed in: user navigated here directly while already logged in.
 *
 * We do NOT manually call exchangeCodeForSession — that races with
 * auto-detection and causes intermittent "code already used" failures.
 * Instead we wait for the session to appear via onAuthStateChange or getSession.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (!supabase) {
      navigate('/auth');
      return;
    }

    const finish = async (session: Session) => {
      if (handled.current) return;
      handled.current = true;
      await finalise(session.user?.id);
    };

    // 1. Listen for SIGNED_IN event (fires when auto-detection completes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          subscription.unsubscribe();
          await finish(session);
        }
      },
    );

    // 2. Check if session already exists (auto-detection may have completed
    //    before this effect runs, or user is already logged in)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        subscription.unsubscribe();
        await finish(data.session);
      }
    });

    // 3. Timeout — if nothing fires within 10 seconds, show an error.
    //    One final getSession check before giving up.
    const timer = setTimeout(async () => {
      if (handled.current) return;
      const { data } = await supabase!.auth.getSession();
      if (data.session) {
        subscription.unsubscribe();
        await finish(data.session);
        return;
      }
      handled.current = true;
      subscription.unsubscribe();
      setError(
        'Could not verify your sign-in. The link may have expired — please request a new one.',
      );
    }, 10_000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  // ── Shared post-auth logic ──────────────────────────────────────────────────
  async function finalise(userId?: string) {
    if (!supabase) { navigate('/auth'); return; }

    // Persist the account type chosen before sign-in
    const pendingAccountType = localStorage.getItem('pendingAccountType') as AccountType | null;
    if (userId && pendingAccountType) {
      try {
        await supabase
          .from('user_profiles')
          .upsert({ id: userId, account_type: pendingAccountType }, { onConflict: 'id' });
      } catch (err) {
        // Non-fatal — user is still logged in
        console.error('Failed to save account type:', err);
      }
    }
    localStorage.removeItem('pendingAccountType');

    // Re-fetch the session to get the user email for the admin check
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData.session?.user?.email;

    // Determine the target route
    // Priority: pendingClaimId > isAdmin > pendingRedirect > pendingPlan > default dashboard
    let target = '/dashboard';

    // Read and clear ALL pending intents upfront to prevent stale values
    const pendingClaimId = localStorage.getItem('pendingClaimId');
    const pendingRedirect = localStorage.getItem('pendingRedirect');
    const pendingPlan = localStorage.getItem('pendingPlan');
    localStorage.removeItem('pendingClaimId');
    localStorage.removeItem('pendingRedirect');
    // pendingPlan is NOT removed here — DashboardHome still needs it for auto-checkout

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (pendingClaimId && UUID_RE.test(pendingClaimId)) {
      target = `/claim/${pendingClaimId}`;
    } else if (isAdmin(userEmail)) {
      target = '/admin';
    } else if (pendingRedirect && typeof pendingRedirect === 'string' && pendingRedirect.startsWith('/')) {
      target = pendingRedirect;
    } else {
      const validPlans = [
        'free',
        'price_1TCo3PAmznBlrx8spOgZD1VC',
        'price_1TErgTAmznBlrx8scCN6CsNa',
        'price_1TErf1AmznBlrx8suRd3ARgM',
        'price_1TEszAAmznBlrx8sDwkodC8z',
      ];
      if (pendingPlan && validPlans.includes(pendingPlan) && pendingPlan !== 'free') {
        target = '/dashboard/billing';
      }
    }

    // Use full-page navigation instead of React Router navigate() to avoid a
    // race condition where ProtectedRoute checks AuthContext before the new
    // session has propagated via onAuthStateChange. A full reload lets
    // AuthProvider call getSession() fresh and find the established session.
    window.location.replace(target);
  }

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
