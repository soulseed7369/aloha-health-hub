/**
 * usePostAuthRedirect — two-layer fallback for post-authentication redirects.
 *
 * Layer 1 (token forwarding):
 *   Supabase sometimes ignores `redirectTo` and sends the user to the Site URL
 *   (`/`) with `?code=xxx` or `#access_token=xxx` instead of `/auth/callback`.
 *   We intercept and forward to AuthCallback so the tokens can be processed.
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

  // ── Layer 1: Forward auth tokens that landed on the wrong page ────────────
  useEffect(() => {
    // Already on the callback page — nothing to forward
    if (window.location.pathname.startsWith('/auth/callback')) return;

    // Check for PKCE code in query params
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
      return;
    }

    // Check for implicit-flow tokens in hash fragment
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
      window.location.replace(`/auth/callback${hash}`);
      return;
    }
  }, []); // Run once on mount

  // ── Layer 2: Redirect based on pending localStorage intents ────────────────
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
