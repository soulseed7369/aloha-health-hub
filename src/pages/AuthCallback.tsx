import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';
import { Leaf, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AccountType } from '@/hooks/useAccountType';

/**
 * Handles the Supabase magic-link / email-confirm / phone-OTP callback.
 *
 * Supports two Supabase auth flow configurations:
 *
 * 1. PKCE flow (default in v2): URL contains ?code=xxxx — we call
 *    exchangeCodeForSession() to turn it into a session.
 *
 * 2. Implicit flow (legacy / some project configs): URL hash contains
 *    #access_token=xxx&refresh_token=xxx — Supabase JS processes the hash
 *    automatically; we just wait for the session via onAuthStateChange.
 *
 * After either path resolves we save the pending account type and redirect.
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

    // ── PKCE flow ─────────────────────────────────────────────────────────────
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(async ({ data, error: exchangeError }) => {
          if (exchangeError) {
            // Surface a clear message — most common cause is an expired link
            setError(exchangeError.message || 'Sign-in link is invalid or has expired. Please request a new one.');
            return;
          }
          await finalise(data.session?.user?.id);
        });
      return;
    }

    // ── Implicit flow / hash-based token ─────────────────────────────────────
    // Supabase JS auto-processes #access_token=… hashes before we can read them,
    // so by the time this effect runs the session may already be set.
    // We listen for the first SIGNED_IN event (fires within milliseconds).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        await finalise(session.user?.id);
      }
      // If no SIGNED_IN fires, check whether we already have an active session
      // (e.g. user navigated to /auth/callback directly while already logged in)
    });

    // Fallback: if already signed in right now, proceed immediately
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        subscription.unsubscribe();
        await finalise(data.session.user?.id);
        return;
      }
      // Give the implicit-flow listener a few seconds; if nothing fires, send
      // them to /auth with an explanation
      const timer = setTimeout(() => {
        subscription.unsubscribe();
        setError('Could not verify your sign-in. The link may have expired — please request a new one.');
      }, 8000);
      // Store timer reference so the cleanup can cancel it
      return () => clearTimeout(timer);
    });

    return () => subscription.unsubscribe();
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

    if (isAdmin(userEmail)) {
      navigate('/admin', { replace: true });
      return;
    }

    const pending = localStorage.getItem('pendingPlan');
    const validPlans = [
      'free',
      'price_1TCo3PAmznBlrx8spOgZD1VC',
      'price_1T7loEAmznBlrx8s5j92qxX8',
      'price_1TCA70AmznBlrx8sSVyl2HtA',
      'price_1TCA7KAmznBlrx8s2IOtOThI',
    ];
    if (pending && validPlans.includes(pending) && pending !== 'free') {
      navigate('/dashboard/billing', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
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
