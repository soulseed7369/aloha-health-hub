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

export default function Auth() {
  usePageMeta("Sign In", "Sign in to manage your Hawa'i Wellness practitioner or center listing.");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claim');
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<'practitioner' | 'center'>('practitioner');

  // If already logged in, redirect appropriately
  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem('pendingPlan');
    // Validate pendingPlan is one of the expected values to prevent abuse
    const validPlans = ['free', 'price_1TCo3PAmznBlrx8spOgZD1VC', 'price_1T7loEAmznBlrx8s5j92qxX8', 'price_1TCA70AmznBlrx8sSVyl2HtA', 'price_1TCA7KAmznBlrx8s2IOtOThI'];
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

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      // Store account type before auth, will be picked up in callback
      localStorage.setItem('pendingAccountType', selectedAccountType);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (otpError) throw otpError;
      setMagicSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        // Store account type before signup
        localStorage.setItem('pendingAccountType', selectedAccountType);
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        setMagicSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // For password sign-in (existing user), save account type before auth context updates
        // Use localStorage to avoid race condition with stale `user` from AuthContext
        localStorage.setItem('pendingAccountType', selectedAccountType);
        // navigation handled by useEffect above
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Phone OTP ──────────────────────────────────────────────────────────────

  /** Normalise a US/HI phone number → E.164 (+1XXXXXXXXXX) */
  function normalisePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    // Return as-is with leading + if it already has a country code
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
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { shouldCreateUser: true },
      });
      if (otpError) throw otpError;
      setPhoneSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send SMS. Please try again.';
      setError(msg);
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
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: e164,
        token: otpCode.trim(),
        type: 'sms',
      });
      if (verifyError) throw verifyError;
      // navigation handled by useEffect above once user session is set
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
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
          <Link to="/" className="hover:underline">← Back to directory</Link>
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
              We sent a 6-digit code to <span className="font-medium text-foreground">{phone}</span>.
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
                {loading ? 'Verifying…' : 'Verify & Sign In'}
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
          <Link to="/" className="hover:underline">← Back to directory</Link>
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
              ? "Enter your email and we'll send you a sign-in link — no password needed."
              : mode === 'phone'
                ? "We'll text a verification code to your mobile number."
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
                {loading ? 'Sending…' : 'Send sign-in link'}
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
                <p className="text-xs text-muted-foreground">U.S./Hawaiʻi numbers — standard messaging rates may apply.</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !hasSupabase}>
                {loading ? 'Sending…' : 'Send verification text'}
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
                  placeholder="••••••••"
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
                {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
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
            {mode !== 'phone' && (
              <button
                onClick={() => { setMode('phone'); setError(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Sign in with text message
              </button>
            )}
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
        <Link to="/" className="hover:underline">← Back to directory</Link>
      </p>
    </div>
  );
}
