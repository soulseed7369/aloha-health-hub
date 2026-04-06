import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'beta_access';
const BETA_SECRET =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_BETA_SECRET as string | undefined))
  || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BETA_SECRET)
  || undefined;

function hasBetaAccess(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function grantAccess() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

// Routes that must always be accessible regardless of beta status
const PUBLIC_PATHS = ['/auth', '/auth/callback'];

export function BetaGate({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isPublicPath = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));
  const [allowed, setAllowed] = useState<boolean>(hasBetaAccess() || isPublicPath);
  const [checking, setChecking] = useState<boolean>(!allowed);

  useEffect(() => {
    // 0. Auth routes are always public (need to reach login to become a user)
    if (isPublicPath) {
      setAllowed(true);
      setChecking(false);
      return;
    }

    // 1. Already unlocked via localStorage
    if (hasBetaAccess()) {
      setAllowed(true);
      setChecking(false);
      return;
    }

    // 2. Secret URL param — ?beta=YOUR_SECRET
    const param = searchParams.get('beta');
    if (BETA_SECRET && param === BETA_SECRET) {
      grantAccess();
      // Remove the param from the URL so it's not shared accidentally
      searchParams.delete('beta');
      setSearchParams(searchParams, { replace: true });
      setAllowed(true);
      setChecking(false);
      return;
    }

    // 3. Logged-in users always bypass the gate
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          grantAccess();
          setAllowed(true);
        }
        setChecking(false);
      });
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    // Brief loading state while we check auth — avoids flash of coming-soon for logged-in users
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <Leaf className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return <ComingSoon />;
  }

  return <>{children}</>;
}

function ComingSoon() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4 text-center">
      <div className="flex items-center gap-2 text-primary mb-6">
        <Leaf className="h-8 w-8" />
        <span className="font-display text-2xl font-bold">Hawa'i Wellness</span>
      </div>

      <div className="max-w-md space-y-4">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Coming Soon
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          We're putting the finishing touches on Hawai'i's most complete wellness
          directory. Sign up to be notified when we launch.
        </p>

        {/* Simple mailto signup — swap for a real form / email provider later */}
        <a
          href="mailto:aloha@hawaiiwellness.net?subject=Launch%20notification"
          className="inline-block mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Notify me at launch
        </a>

        <p className="text-xs text-muted-foreground pt-4">
          Are you a wellness practitioner?{' '}
          <a href="mailto:aloha@hawaiiwellness.net" className="text-primary hover:underline">
            Get in touch
          </a>{' '}
          to be featured on day one.
        </p>
      </div>
    </div>
  );
}
