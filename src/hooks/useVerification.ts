/**
 * useVerification.ts
 * React hooks for email/phone OTP verification of listings.
 *
 * Usage:
 *   const { sendCode, verifyCode, requestReview } = useVerification();
 *   await sendCode.mutateAsync({ listingId, listingType: 'practitioner', channel: 'email' });
 *   await verifyCode.mutateAsync({ listingId, listingType: 'practitioner', channel: 'email', code: '123456' });
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────────────────────

type ListingType = 'practitioner' | 'center';
type Channel = 'email' | 'phone';

interface SendCodeParams {
  listingId: string;
  listingType: ListingType;
  channel: Channel;
}

interface SendCodeResult {
  success: boolean;
  codeId: string;
  channel: Channel;
  destination: string;  // masked
  expiresInSeconds: number;
}

interface VerifyCodeParams {
  listingId: string;
  listingType: ListingType;
  channel: Channel;
  code: string;
}

interface VerifyCodeResult {
  success: boolean;
  channel: Channel;
  verifiedAt: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  error?: string;
}

interface RequestReviewParams {
  listingId: string;
  listingType: ListingType;
}

// ── Helper: call Edge Function ──────────────────────────────────────────────

async function callEdgeFunction<T>(fnName: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be logged in');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// ── Hooks ───────────────────────────────────────────────────────────────────

/** Send a 6-digit verification code to the listing's email or phone */
export function useSendVerificationCode() {
  return useMutation({
    mutationFn: async (params: SendCodeParams): Promise<SendCodeResult> => {
      return callEdgeFunction<SendCodeResult>('send-verification-code', params);
    },
  });
}

/** Verify a 6-digit code. On success, the listing's email_verified_at or phone_verified_at is set. */
export function useVerifyCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: VerifyCodeParams): Promise<VerifyCodeResult> => {
      return callEdgeFunction<VerifyCodeResult>('verify-code', params);
    },
    onSuccess: () => {
      // Invalidate practitioner/center queries so UI reflects updated verification status
      queryClient.invalidateQueries({ queryKey: ['my-practitioner'] });
      queryClient.invalidateQueries({ queryKey: ['my-center'] });
    },
  });
}

/** Request admin review — moves listing from draft → pending_review.
 *  Requires at least one verified contact channel. */
export function useRequestReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, listingType }: RequestReviewParams): Promise<void> => {
      if (!supabase) throw new Error('Supabase not configured');

      const { error } = await supabase.rpc('request_listing_review', {
        p_listing_id: listingId,
        p_listing_type: listingType,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-practitioner'] });
      queryClient.invalidateQueries({ queryKey: ['my-center'] });
    },
  });
}

// ── Convenience wrapper ─────────────────────────────────────────────────────

/** All verification hooks bundled together */
export function useVerification() {
  return {
    sendCode: useSendVerificationCode(),
    verifyCode: useVerifyCode(),
    requestReview: useRequestReview(),
  };
}
