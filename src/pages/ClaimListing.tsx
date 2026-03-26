/**
 * ClaimListing.tsx
 * Claim an unclaimed practitioner or center listing.
 *
 * Three claim paths:
 *   1. Email match  → User's auth email matches listing email → instant claim, no OTP
 *   2. Email verify → User's auth email differs → magic-link sent to listing's email
 *   3. SMS verify   → Twilio OTP sent to listing's phone (via edge function) [disabled until A2P approved]
 *
 * If neither is available or verification fails, the user is directed to
 * contact aloha@hawaiiwellness.net for manual support.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, hasSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, Phone, AlertCircle, Loader2, HelpCircle } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from 'sonner';

/** Mark the campaign_outreach row as claimed (fire-and-forget, non-blocking). */
async function markCampaignClaimed(listingId: string): Promise<void> {
  if (!supabase || !listingId) return;
  try {
    await supabase
      .from('campaign_outreach')
      .update({ status: 'claimed' })
      .eq('listing_id', listingId)
      .in('status', ['not_contacted', 'email_queued', 'email_1_sent', 'email_1_opened', 'email_1b_sent', 'email_2_sent', 'replied', 'claimed']);
  } catch (e) {
    // Non-critical — don't surface to user
    console.warn('Failed to update campaign_outreach on claim:', e);
  }
}

/** Build a pre-filled mailto link so the admin gets all the context they need. */
function buildHelpMailto(listing: Listing | null, userEmail: string | undefined): string {
  const subject = encodeURIComponent(
    listing ? `Claim help: ${listing.name}` : 'Help claiming my listing',
  );
  const body = encodeURIComponent(
    [
      `Hi Hawai'i Wellness,`,
      ``,
      `I'd like to claim my listing but need help with verification.`,
      ``,
      listing ? `Listing: ${listing.name}` : '',
      listing ? `Listing ID: ${listing.id}` : '',
      listing ? `Type: ${listing.type}` : '',
      userEmail ? `My account email: ${userEmail}` : '',
      ``,
      `Mahalo!`,
    ].filter(Boolean).join('\n'),
  );
  return `mailto:aloha@hawaiiwellness.net?subject=${subject}&body=${body}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ListingType = 'practitioner' | 'center';
type Channel     = 'email' | 'sms';
type Step        = 'loading' | 'choose' | 'email-link-sent' | 'enter-code' | 'claiming' | 'success' | 'error';

interface Listing {
  id:       string;
  type:     ListingType;
  name:     string;
  email:    string | null;
  phone:    string | null;
  owner_id: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  return email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c);
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : '***-****';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClaimListing() {
  usePageMeta('Claim Listing', 'Claim your listing on Hawaii Wellness.');

  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const [listing,  setListing]  = useState<Listing | null>(null);
  const [step,     setStep]     = useState<Step>('loading');
  const [channel,  setChannel]  = useState<Channel | null>(null);
  const [otp,      setOtp]      = useState('');
  const [masked,   setMasked]   = useState('');   // masked destination shown to user
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');

  // Track whether we've already attempted the fetch+claim to avoid re-runs
  // when the `user` object reference changes (onAuthStateChange fires).
  const claimAttempted = useRef(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      // Don't redirect if auth tokens are in the URL — auth flow is in progress
      // (e.g. magic link or OAuth just landed on this page with ?code= or #access_token=)
      const params = new URLSearchParams(window.location.search);
      if (params.has('code')) return;
      if (window.location.hash.includes('access_token')) return;

      // Persist the claim ID to localStorage so OAuth flows can resume after auth
      if (id) {
        localStorage.setItem('pendingClaimId', id);
      }
      navigate(`/auth?claim=${id}`);
    }
  }, [user, authLoading, id, navigate]);

  // Fetch listing on mount — auto-claim if emails match
  useEffect(() => {
    if (!id || !supabase || !user) return;
    if (claimAttempted.current) return;
    claimAttempted.current = true;

    (async () => {
      setStep('loading');

      // Try practitioners first, then centers
      for (const [table, type] of [
        ['practitioners', 'practitioner'],
        ['centers',       'center'],
      ] as const) {
        const { data, error: err } = await supabase
          .from(table)
          .select('id, name, email, phone, owner_id, status')
          .eq('id', id)
          .single();

        if (!err && data) {
          if (data.status === 'draft') {
            setError('This listing isn\'t publicly available yet. Please check back soon.');
            setStep('error');
            return;
          }
          if (data.owner_id) {
            // Already claimed — check if it's ours
            if (data.owner_id === user.id) {
              toast.success('This listing is already yours!');
              navigate('/dashboard');
              return;
            }
            setError('This listing has already been claimed.');
            setStep('error');
            return;
          }

          const listingData: Listing = {
            id: data.id, type, name: data.name,
            email: data.email, phone: data.phone, owner_id: data.owner_id,
          };
          setListing(listingData);

          // ── Auto-claim: user's email matches listing email ──────────────
          const userEmail = user.email?.toLowerCase();
          const listingEmail = data.email?.toLowerCase();
          if (userEmail && listingEmail && userEmail === listingEmail) {
            setStep('claiming');
            try {
              const rpcName  = type === 'center' ? 'claim_listing_center' : 'claim_listing';
              const rpcParam = type === 'center' ? { p_center_id: data.id } : { p_practitioner_id: data.id };
              const { error: claimErr } = await supabase.rpc(rpcName, rpcParam);

              if (claimErr) {
                console.error('Auto-claim failed:', claimErr);
                // Fall back to manual verification
                setStep('choose');
                return;
              }

              queryClient.invalidateQueries({
                queryKey: [type === 'center' ? 'center' : 'practitioner', data.id],
              });
              markCampaignClaimed(data.id);
              toast.success('Listing claimed!');
              setStep('success');
            } catch (e) {
              console.error('Auto-claim error:', e);
              setStep('choose');
            }
            return;
          }

          // Emails don't match — show verification options
          setStep('choose');
          return;
        }
      }

      setError('Listing not found.');
      setStep('error');
    })();
  }, [id, user]);

  // ── Send email verification link (magic link to listing's email) ──────────
  // This sends a sign-in link to the listing's email. When clicked, the user's
  // session switches to the listing's email, which lets the claim RPC pass.
  const sendEmailLink = async () => {
    if (!supabase || !listing?.email) return;
    setBusy(true);
    setError('');

    // Persist claim ID so AuthCallback redirects back here after magic link auth
    if (listing.id) localStorage.setItem('pendingClaimId', listing.id);

    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: listing.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin.replace('://www.', '://')}/claim/${listing.id}`,
        },
      });
      if (err) { setError(err.message); return; }

      setChannel('email');
      setMasked(maskEmail(listing.email));
      setStep('email-link-sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send verification email');
    } finally {
      setBusy(false);
    }
  };

  // ── Send SMS OTP (Twilio via edge function) ────────────────────────────────
  const sendSmsCode = async () => {
    if (!supabase || !listing) return;
    setBusy(true);
    setError('');

    try {
      const { data, error: err } = await supabase.functions.invoke('claim-listing-otp', {
        body: { action: 'send', listingId: listing.id, listingType: listing.type },
      });

      if (err || data?.error) {
        setError(data?.error ?? err?.message ?? 'Failed to send SMS');
        return;
      }

      setChannel('sms');
      setMasked(data.maskedPhone ?? maskPhone(listing.phone ?? ''));
      setStep('enter-code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send SMS');
    } finally {
      setBusy(false);
    }
  };

  // ── Verify SMS OTP ─────────────────────────────────────────────────────────
  const verifySmsOtp = async () => {
    if (!supabase || !listing) return;
    setBusy(true);
    setError('');

    try {
      const { data, error: err } = await supabase.functions.invoke('claim-listing-otp', {
        body: { action: 'verify', listingId: listing.id, listingType: listing.type, code: otp },
      });

      if (err || data?.error) {
        setError(data?.error ?? err?.message ?? 'Verification failed');
        return;
      }

      queryClient.invalidateQueries({ queryKey: [listing.type === 'center' ? 'center' : 'practitioner', listing.id] });
      markCampaignClaimed(listing.id);
      toast.success('Listing claimed!');
      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setStep('choose');
    setOtp('');
    setError('');
    setChannel(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading || step === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasEmail = !!listing?.email;
  // SMS claim is hidden until A2P 10DLC is approved
  const hasNoOptions = !hasEmail;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4 py-12">
      <Link to="/" className="mb-8 font-display text-xl font-bold text-primary">
        Hawaiʻi Wellness
      </Link>

      <Card className="w-full max-w-md shadow-lg">

        {/* ── Loading / checking ──────────────────────────────────────────── */}
        {step === 'loading' && (
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        )}

        {/* ── Auto-claiming ───────────────────────────────────────────────── */}
        {step === 'claiming' && (
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Claiming your listing…</p>
          </CardContent>
        )}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {step === 'error' && (
          <>
            <CardHeader className="text-center">
              <AlertCircle className="mx-auto mb-2 h-12 w-12 text-destructive" />
              <CardTitle className="font-display text-2xl">Cannot Claim</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/">Back to Directory</Link>
              </Button>
            </CardContent>
          </>
        )}

        {/* ── Choose verification method ──────────────────────────────────── */}
        {step === 'choose' && listing && (
          <>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Verify your listing</CardTitle>
              <CardDescription>
                To claim <strong>{listing.name}</strong>, we need to verify you have access
                to the contact info on file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {hasEmail && (
                <Button
                  className="w-full justify-start gap-3 h-14"
                  variant="outline"
                  onClick={sendEmailLink}
                  disabled={busy || !hasSupabase}
                >
                  {busy && channel === null
                    ? <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                    : <Mail className="h-5 w-5 flex-shrink-0 text-primary" />}
                  <div className="text-left">
                    <p className="font-medium text-sm">Verify by email</p>
                    <p className="text-xs text-muted-foreground">{maskEmail(listing.email!)}</p>
                  </div>
                </Button>
              )}

              {/* SMS claim hidden until A2P 10DLC registration is approved.
                 Uncomment once Twilio brand/campaign registration clears.
              {hasPhone && (
                <Button
                  className="w-full justify-start gap-3 h-14"
                  variant="outline"
                  onClick={sendSmsCode}
                  disabled={busy || !hasSupabase}
                >
                  {busy && channel === null
                    ? <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                    : <Phone className="h-5 w-5 flex-shrink-0 text-primary" />}
                  <div className="text-left">
                    <p className="font-medium text-sm">Send code by text</p>
                    <p className="text-xs text-muted-foreground">{maskPhone(listing.phone!)}</p>
                  </div>
                </Button>
              )}
              */}

              {hasNoOptions && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This listing has no email or phone on file. Request admin help below
                    and we'll verify your ownership manually.
                  </AlertDescription>
                </Alert>
              )}

              {/* Admin help — prominent button when no options, subtle link otherwise */}
              <Button
                className="w-full justify-start gap-3 h-14"
                variant={hasNoOptions ? 'default' : 'ghost'}
                asChild
              >
                <a href={buildHelpMailto(listing, user?.email ?? undefined)}>
                  <HelpCircle className={`h-5 w-5 flex-shrink-0 ${hasNoOptions ? '' : 'text-muted-foreground'}`} />
                  <div className="text-left">
                    <p className={`font-medium text-sm ${hasNoOptions ? '' : 'text-muted-foreground'}`}>
                      {hasNoOptions ? 'Request admin help to claim' : 'Need help? Contact admin'}
                    </p>
                    <p className={`text-xs ${hasNoOptions ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      We'll verify your ownership manually
                    </p>
                  </div>
                </a>
              </Button>
            </CardContent>
          </>
        )}

        {/* ── Email link sent ─────────────────────────────────────────────── */}
        {step === 'email-link-sent' && (
          <>
            <CardHeader className="text-center">
              <Mail className="mx-auto mb-2 h-10 w-10 text-primary" />
              <CardTitle className="font-display text-2xl">Check your email</CardTitle>
              <CardDescription>
                We sent a verification link to <strong>{masked}</strong>.
                Click the link in that email to verify ownership and complete your claim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  The link will bring you back here automatically. Check your spam folder
                  if you don't see it within a few minutes.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between text-sm text-muted-foreground">
                <button onClick={goBack} className="hover:text-foreground">
                  ← Try another method
                </button>
                <button
                  onClick={sendEmailLink}
                  disabled={busy}
                  className="hover:text-foreground disabled:opacity-50"
                >
                  Resend link
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Don't have access to this email?{' '}
                <a href={buildHelpMailto(listing, user?.email ?? undefined)} className="underline hover:text-foreground">
                  Contact admin for help
                </a>
              </p>
            </CardContent>
          </>
        )}

        {/* ── Enter SMS code ──────────────────────────────────────────────── */}
        {step === 'enter-code' && (
          <>
            <CardHeader className="text-center">
              <Phone className="mx-auto mb-2 h-10 w-10 text-primary" />
              <CardTitle className="font-display text-2xl">Enter your code</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <strong>{masked}</strong>. It expires in 10 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Input
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-[0.4em]"
              />

              <Button
                className="w-full"
                onClick={verifySmsOtp}
                disabled={busy || otp.length !== 6}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify &amp; Claim Listing
              </Button>

              <div className="flex justify-between text-sm text-muted-foreground">
                <button onClick={goBack} className="hover:text-foreground">
                  ← Try another method
                </button>
                <button
                  onClick={sendSmsCode}
                  disabled={busy}
                  className="hover:text-foreground disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Still having trouble?{' '}
                <a href={buildHelpMailto(listing, user?.email ?? undefined)} className="underline hover:text-foreground">
                  Contact admin for help
                </a>
              </p>
            </CardContent>
          </>
        )}

        {/* ── Success ────────────────────────────────────────────────────── */}
        {step === 'success' && (
          <>
            <CardHeader className="text-center">
              <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-500" />
              <CardTitle className="font-display text-2xl">Listing Claimed!</CardTitle>
              <CardDescription>
                You now own <strong>{listing?.name}</strong>. Head to your dashboard to manage it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </>
        )}

      </Card>
    </div>
  );
}
