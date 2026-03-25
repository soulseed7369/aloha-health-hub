/**
 * usePostAuthRedirect — two-layer fallback for post-authentication redirects.
 *
 * Layer 1 (code forwarding):
 *   Supabase sometimes ignores `redirectTo` and sends the user to the Site URL
 *   (`/`) with `?code=xxx` instead of `/auth/callback?code=xxx`. We intercept
 *   this and forward to AuthCallback so the code can be exchanged properly.
 *
 * Layer 2 (intent-based redirect):
 *   After the session is established on any page, if there's a pending intent
 *   in localStorage (claim, redirect, plan), redirect the user there.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function usePostAuthRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  // ── Layer 1: Forward auth codes that landed on the wrong page ──────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    // If there's a ?code= param and we're NOT on /auth/callback,
    // Supabase redirected to the wrong URL. Forward to AuthCallback.
    if (code && !window.location.pathname.startsWith('/auth/callback')) {
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
    }
  }, []); // Run once on mount

  // ── Layer 2: Redirect based on pending localStorage intents ────────────
  useEffect(() => {
    if (loading || !user || hasRedirected.current) return;

    // Don't interfere if we're already on a page that handles its own redirects
    const path = location.pathname;
    if (
      path.startsWith('/auth') ||
      path.startsWith('/claim') ||
      path.startsWith('/dashboard') ||
      path.startsWith('/admin')
    ) {
      return;
    }

    // Check for pending claim
    const pendingClaimId = localStorage.getItem('pendingClaimId');
    if (pendingClaimId && UUID_RE.test(pendingClaimId)) {
      hasRedirected.current = true;
      localStorage.removeItem('pendingClaimId');
      navigate(`/claim/${pendingClaimId}`, { replace: true });
      return;
    }

    // Check for pending redirect
    const pendingRedirect = localStorage.getItem('pendingRedirect');
    if (pendingRedirect && pendingRedirect.startsWith('/')) {
      hasRedirected.current = true;
      localStorage.removeItem('pendingRedirect');
      navigate(pendingRedirect, { replace: true });
      return;
    }

    // Check for pending plan upgrade
    const pendingPlan = localStorage.getItem('pendingPlan');
    if (pendingPlan && pendingPlan.startsWith('price_')) {
      hasRedirected.current = true;
      navigate('/dashboard/billing', { replace: true });
      return;
    }
  }, [loading, user, location.pathname, navigate]);
}
