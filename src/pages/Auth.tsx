import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, hasSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Leaf, AlertCircle, Mail, Lock, User, Building2, Smartphone, ArrowLeft } from 'lucide-react';
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from '@/contexts/AuthContext';
import { useSetAccountType } from '@/hooks/useAccountType';

// ── Friendly error messages ──────────────────────────────────────────────────

/** Map raw Supabase / network / edge-function errors to user-friendly text */
function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  // Supabase rate limit (magic link cooldown)
  if (msg.includes('security purposes') || msg.includes('rate limit') || msg.includes('Rate limit')) {
    return 'Too many sign-in attempts. Please wait a minute before trying again.';
  }
  // Bad email format
  if (msg.includes('invalid format') || msg.includes('validate email') || msg.includes('Unable to validate')) {
    return 'That doesn\u2019t look like a valid email address. Please double-check and try again.';
  }
  // Network failure
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
    return 'Network error \u2014 please check your internet connection and try again.';
  }
  // Signups disabled
  if (msg.includes('Signups not allowed') || msg.includes('signup_disabled')) {
    return 'New account sign-ups are temporarily disabled. Please contact aloha@hawaiiwellness.net for help.';
  }
  // Wrong password
  if (msg.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Try the magic link option instead \u2014 no password needed.';
  }
  // Unconfirmed email
  if (msg.includes('Email not confirmed')) {
    return 'Your email hasn\u2019t been confirmed yet. Check your inbox for a confirmation link, or use the magic link option.';
  }
  // Pass through edge-function errors (already user-friendly)
  if (msg.includes('No account found') || msg.includes('Too many attempts') || msg.includes('Please enter') || msg.includes('not configured')) {
    return msg;
  }
  return msg || 'Something went wrong. Please try again.';
}

export default function Auth() {
  usePageMeta("Sign In", "Sign in to manage your Hawa'i Wellness practitioner or center listing.");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claimId') || searchParams.get('claim');
  const redirectTo = searchParams.get('redirect');
  const setAccountType = useSetAccountType();

  const [mode, setMode] = useState<'magic' | 'password' | 'phone'>('magic');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<'practitioner' | 'center'>('practitioner');

  // If already logged in, redirect appropriately
  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem('pendingPlan');
    // Validate pendingPlan is one of the expected values to prevent abuse
    const validPlans = ['free', 'price_1TCo3PAmznBlrx8spOgZD1VC', 'price_1TErgTAmznBlrx8scCN6CsNa', 'price_1TErf1AmznBlrx8suRd3ARgM', 'price_1TEszAAmznBlrx8sDwkodC8z'];
    if (pending && validPlans.includes(pending) && pending !== 'free') {
      navigate('/dashboard/billing');
    } else if (claimId) {
      // Validate claimId is a valid UUID before using it
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (UUID_RE.test(claimId)) {
        navigate(`/claim/${claimId}`);
      } else {
        navigate('/dashboard');
      }
    } else if (redirectTo && typeof redirectTo === 'string' && redirectTo.startsWith('/')) {
      // Ensure redirectTo is a relative path to prevent open redirect
      navigate(redirectTo);
    } else {
      navigate('/dashboard');
    }
  }, [user]);

  // ── Google OAuth handler ──────────────────────────────────────────────────

  const handleGoogleAuth = async () => {
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      // Persist account type + claim context through the OAuth redirect
      localStorage.setItem('pendingAccountType', selectedAccountType);
      if (claimId) {
        localStorage.setItem('pendingClaimId', claimId);
      }
      // Always set a redirect target so post-auth guard knows where to send the user,
      // even if Supabase redirects to the Site URL instead of /auth/callback.
      localStorage.setItem('pendingRedirect', redirectTo || '/dashboard');

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin.replace('://www.', '://')}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
      // Browser will redirect to Google — no further code runs here
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
      setLoading(false);
    }
  };

  // ── Magic link handler ─────────────────────────────────────────────────────

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      // Store account type + claim context before auth, will be picked up in callback
      localStorage.setItem('pendingAccountType', selectedAccountType);
      if (claimId) localStorage.setItem('pendingClaimId', claimId);
      localStorage.setItem('pendingRedirect', redirectTo || '/dashboard');
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin.replace('://www.', '://')}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (otpError) throw otpError;
      setMagicSent(true);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Password handler ───────────────────────────────────────────────────────

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        // Store account type + claim context before signup
        localStorage.setItem('pendingAccountType', selectedAccountType);
        if (claimId) localStorage.setItem('pendingClaimId', claimId);
        localStorage.setItem('pendingRedirect', redirectTo || '/dashboard');
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin.replace('://www.', '://')}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        setMagicSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // For password sign-in (existing user), save account type + claim context before auth context updates
        // Use localStorage to avoid race condition with stale `user` from AuthContext
        localStorage.setItem('pendingAccountType', selectedAccountType);
        if (claimId) localStorage.setItem('pendingClaimId', claimId);
        localStorage.setItem('pendingRedirect', redirectTo || '/dashboard');
        // navigation handled by useEffect above
      }
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Edge function error helper ──────────────────────────────────────────────

  /**
   * Extract a user-friendly error message from a Supabase edge function error.
   *
   * `supabase.functions.invoke` returns FunctionsHttpError whose `.message` is
   * always the generic string "Edge Function returned a non-2xx status code".
   * The actual JSON body is in `.context` (an unconsumed Response object).
   */
  async function extractEdgeFunctionError(fnErr: unknown): Promise<string> {
    // Try to read the JSON body from FunctionsHttpError.context (a Response)
    if (fnErr && typeof fnErr === 'object' && 'context' in fnErr) {
      try {
        const ctx = (fnErr as { context: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (typeof body?.error === 'string') return body.error;
        }
      } catch { /* response already consumed or not JSON — fall through */ }
    }
    return fnErr instanceof Error ? fnErr.message : String(fnErr);
  }

  // ── Phone OTP via custom edge function (Twilio) ────────────────────────────

  /** Normalise a US/HI phone number → E.164 (+1XXXXXXXXXX) */
  function normalisePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (raw.trimStart().startsWith('+')) return raw.trim();
    return `+1${digits}`;
  }

  const handlePhoneSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      localStorage.setItem('pendingAccountType', selectedAccountType);
      const e164 = normalisePhone(phone);

      // Call custom edge function instead of supabase.auth.signInWithOtp({ phone })
      // because Supabase native phone auth is not enabled on this project.
      const { data, error: fnErr } = await supabase.functions.invoke('auth-phone-otp', {
        body: { action: 'send', phone: e164 },
      });

      if (fnErr) throw new Error(await extractEdgeFunctionError(fnErr));
      if (data?.error) throw new Error(data.error);

      setPhoneMasked(data?.maskedPhone || e164);
      setPhoneSent(true);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      const e164 = normalisePhone(phone);

      // Verify the OTP via edge function — returns a tokenHash for session exchange
      const { data, error: fnErr } = await supabase.functions.invoke('auth-phone-otp', {
        body: { action: 'verify', phone: e164, code: otpCode.trim() },
      });

      if (fnErr) throw new Error(await extractEdgeFunctionError(fnErr));
      if (data?.error) throw new Error(data.error);

      // Exchange the token hash for a real session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: 'magiclink',
      });
      if (verifyError) throw verifyError;
      // navigation handled by useEffect above once user session is set
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmation / success screens ────────────────────────────────────────

  if (magicSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
        <Link to="/" className="mb-8 flex items-center gap-2 text-primary">
          <Leaf className="h-6 w-6" />
          <span className="font-display text-xl font-bold">Hawa'i Wellness</span>
        </Link>
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-sage/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-sage" />
            </div>
            <h2 className="font-display text-xl font-bold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a sign-in link to{' '}
              <span className="font-medium text-foreground">{email}</span>.
              Click the link to continue — no password needed.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't get it? Check your spam folder or{' '}
              <button
                onClick={() => { setMagicSent(false); setError(''); }}
                className="text-primary hover:underline font-medium"
              >
                try again
              </button>.
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">&larr; Back to directory</Link>
        </p>
      </div>
    );
  }

  // ── Phone OTP: code entry step ─────────────────────────────────────────────

  if (phoneSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
        <Link to="/" className="mb-8 flex items-center gap-2 text-primary">
          <Leaf className="h-6 w-6" />
          <span className="font-display text-xl font-bold">Hawa'i Wellness</span>
        </Link>
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-ocean/10 flex items-center justify-center">
              <Smartphone className="h-7 w-7 text-ocean" />
            </div>
            <CardTitle className="font-display text-xl">Enter your code</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <span className="font-medium text-foreground">{phoneMasked || phone}</span>.
              It expires in 10 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handlePhoneVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code">Verification code</Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  className="text-center text-xl tracking-[0.5em] font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || otpCode.length < 6}>
                {loading ? 'Verifying\u2026' : 'Verify & Sign In'}
              </Button>
            </form>
            <div className="pt-1 text-center text-sm text-muted-foreground space-y-1">
              <p>
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={() => { setPhoneSent(false); setOtpCode(''); setError(''); }}
                  className="text-primary hover:underline font-medium"
                >
                  Try a different number
                </button>
              </p>
              <button
                type="button"
                onClick={() => { setMode('magic'); setPhoneSent(false); setOtpCode(''); setError(''); }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to email sign-in
              </button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">&larr; Back to directory</Link>
        </p>
      </div>
    );
  }

  // ── Main sign-in card ──────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
      <Link to="/" className="mb-8 flex items-center gap-2 text-primary">
        <Leaf className="h-6 w-6" />
        <span className="font-display text-xl font-bold">Hawa'i Wellness</span>
      </Link>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">
            {mode === 'magic'
              ? 'Sign in with email'
              : mode === 'phone'
                ? 'Sign in with phone'
                : isSignUp
                  ? 'Create provider account'
                  : 'Sign in with password'}
          </CardTitle>
          <CardDescription>
            {mode === 'magic'
              ? "Enter your email and we'll send you a sign-in link \u2014 no password needed."
              : mode === 'phone'
                ? "Enter the phone number on your listing and we\u2019ll text you a code."
                : isSignUp
                  ? 'Create an account to list your practice on the directory.'
                  : 'Access your provider dashboard.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Account type selector — shown during signup/magic link/phone */}
          {(mode === 'magic' || mode === 'phone' || isSignUp) && (
            <div className="space-y-3 pb-2 border-b border-border">
              <Label className="text-sm font-medium text-foreground">I'm a:</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountType('practitioner')}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                    selectedAccountType === 'practitioner'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-secondary/30 hover:border-primary/50'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span className="text-xs font-medium text-center">Practitioner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccountType('center')}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                    selectedAccountType === 'center'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-secondary/30 hover:border-primary/50'
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="text-xs font-medium text-center">Center/Spa</span>
                </button>
              </div>
            </div>
          )}
          {!hasSupabase && (
            <Alert className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env.local</code> file.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google OAuth button — shown in magic link and password modes */}
          {(mode === 'magic' || mode === 'password') && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogleAuth}
                disabled={loading || !hasSupabase}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
            </>
          )}

          {/* Magic link form */}
          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={!hasSupabase}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !hasSupabase}>
                {loading ? 'Sending\u2026' : 'Send sign-in link'}
              </Button>
            </form>
          )}

          {/* Phone OTP form */}
          {mode === 'phone' && (
            <form onSubmit={handlePhoneSend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(808) 555-0100"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  disabled={!hasSupabase}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the phone number listed on your practitioner or center profile.
                  U.S./Hawai&#x02BB;i numbers only &mdash; standard messaging rates may apply.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !hasSupabase}>
                {loading ? 'Sending\u2026' : 'Send verification text'}
              </Button>
            </form>
          )}

          {/* Password form */}
          {mode === 'password' && (
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-pw">Email address</Label>
                <Input
                  id="email-pw"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={!hasSupabase}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={!hasSupabase}
                />
                {isSignUp && (
                  <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !hasSupabase}>
                {loading ? 'Please wait\u2026' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
              {!isSignUp && (
                <p className="text-center text-sm text-muted-foreground">
                  No account?{' '}
                  <button
                    onClick={() => { setIsSignUp(true); setError(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
              )}
              {isSignUp && (
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setIsSignUp(false); setError(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </form>
          )}

          {/* Toggle between sign-in methods */}
          <div className="pt-2 border-t border-border space-y-2 text-center">
            {mode !== 'magic' && (
              <button
                onClick={() => { setMode('magic'); setError(''); setPhoneSent(false); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                Sign in with email link
              </button>
            )}
            {/* Phone sign-in hidden until A2P 10DLC registration is approved.
               Uncomment once Twilio brand/campaign registration clears (~2-4 weeks for EIN propagation).
            {mode !== 'phone' && (
              <button
                onClick={() => { setMode('phone'); setError(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Sign in with text message
              </button>
            )}
            */}
            {mode !== 'password' && (
              <button
                onClick={() => { setMode('password'); setError(''); setIsSignUp(false); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                Sign in with password
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">&larr; Back to directory</Link>
      </p>
    </div>
  );
}
