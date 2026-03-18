import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Building, Calendar, CheckCircle, Circle, ArrowRight, Star, Loader2, Globe, Clock, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import { useMyBillingProfile, useCreateCheckoutSession } from "@/hooks/useStripe";
import { useAccountType } from "@/hooks/useAccountType";
import { getEarlyBirdStatus } from "@/lib/websitePackages";

export default function DashboardHome() {
  const navigate = useNavigate();
  const { data: practitioner, isLoading: practLoading } = useMyPractitioner();
  const { data: billing } = useMyBillingProfile();
  const { data: accountType, isLoading: accountTypeLoading } = useAccountType();
  const checkout = useCreateCheckoutSession();

  // Route based on account type on first load
  useEffect(() => {
    if (!accountTypeLoading && accountType) {
      if (accountType === 'center') {
        navigate('/dashboard/centers', { replace: true });
      }
      // else: stay on this page for practitioners
    }
  }, [accountType, accountTypeLoading, navigate]);

  // Resume any pending plan intent stored before auth redirect — run once on mount only
  useEffect(() => {
    const pending = localStorage.getItem('pendingPlan');
    // Validate pendingPlan is one of the expected values to prevent abuse
    const validPlans = ['free', 'price_1T7lnYAmznBlrx8sZkolChSm', 'price_1T7loEAmznBlrx8s5j92qxX8', 'price_1TCA70AmznBlrx8sSVyl2HtA', 'price_1TCA7KAmznBlrx8s2IOtOThI'];
    if (!pending || !validPlans.includes(pending) || pending === 'free') {
      localStorage.removeItem('pendingPlan');
      return;
    }
    localStorage.removeItem('pendingPlan');
    checkout.mutate(
      { priceId: pending },
      { onError: (e: Error) => toast.error(e.message) },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If accountType is loading or is 'center', show loading spinner instead of practitioner content
  if (accountTypeLoading || accountType === 'center') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const hasProfile = !!practitioner?.name;
  const hasPaidPlan = billing?.tier === 'premium' || billing?.tier === 'featured';
  const hasVerifiedContact = !!(practitioner as any)?.email_verified_at || !!(practitioner as any)?.phone_verified_at;
  const earlyBird = getEarlyBirdStatus(practitioner?.created_at ?? null);

  // ── Profile completeness ──────────────────────────────────────────────────
  const completenessFields = [
    { label: 'Name',       done: !!practitioner?.name?.trim() },
    { label: 'Bio',        done: !!practitioner?.bio?.trim() },
    { label: 'Modalities', done: (practitioner?.modalities?.length ?? 0) > 0 },
    { label: 'Photo',      done: !!practitioner?.avatar_url },
    { label: 'City',       done: !!practitioner?.city?.trim() },
    { label: 'Phone',      done: !!practitioner?.phone?.trim() },
    { label: 'Email',      done: !!practitioner?.email?.trim() },
    { label: 'Website',    done: !!practitioner?.website_url?.trim() },
  ];
  const completenessScore = hasProfile
    ? Math.round(completenessFields.filter(f => f.done).length / completenessFields.length * 100)
    : 0;
  const missingFields = completenessFields.filter(f => !f.done);

  const steps = [
    {
      id: 'profile',
      label: 'Complete your profile',
      description: 'Add your name, modalities, location, and photo.',
      done: hasProfile,
      to: '/dashboard/profile',
    },
    {
      id: 'verify',
      label: 'Verify your contact info',
      description: 'Verify your email or phone to prove you own this listing.',
      done: hasVerifiedContact,
      to: '/dashboard/profile',
    },
    {
      id: 'plan',
      label: 'Choose a plan',
      description: 'Free gets you listed. Premium & Featured unlock retreats and more visibility.',
      done: hasPaidPlan,
      to: '/dashboard/billing',
    },
  ];

  const actions = [
    {
      title: "Practitioner Profile",
      icon: User,
      description: "List your individual practice, bio, and modalities.",
      button: hasProfile ? "Edit Profile" : "Create Profile",
      to: "/dashboard/profile",
      color: "bg-terracotta-light text-terracotta",
      badge: !hasProfile ? "Start here" : null,
    },
    {
      title: "Centers & Spas",
      icon: Building,
      description: "Manage listings for physical clinics, spas, or shared wellness spaces.",
      button: "Manage Centers",
      to: "/dashboard/centers",
      color: "bg-secondary text-secondary-foreground",
      badge: null,
    },
    {
      title: "Retreats & Events",
      icon: Calendar,
      description: "Publish upcoming time-bound retreats or workshops.",
      button: "Manage Retreats",
      to: "/dashboard/retreats",
      color: "bg-ocean-light text-ocean",
      badge: !hasPaidPlan ? "Premium+" : null,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Welcome to your Provider Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your listings, retreats, and account settings.
        </p>
      </div>

      {/* Onboarding checklist — shown until both steps are done */}
      {!practLoading && (!hasProfile || !hasPaidPlan) && (
        <Card className="border-primary/20 bg-terracotta-light/10">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base">Get your listing live</h2>
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                {steps.filter(s => s.done).length}/{steps.length} complete
              </Badge>
            </div>
            <div className="space-y-3">
              {steps.map(step => (
                <Link
                  key={step.id}
                  to={step.to}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    step.done
                      ? 'bg-sage/5 border-sage/20 opacity-60 pointer-events-none'
                      : 'bg-white border-border hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {step.done
                      ? <CheckCircle className="h-5 w-5 text-sage" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : ''}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                  {!step.done && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile completeness — shown only when profile exists but incomplete */}
      {hasProfile && completenessScore < 100 && (
        <Card className="border-sage/30 bg-sage/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Profile completeness
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    completenessScore >= 75 ? 'bg-sage/20 text-sage' :
                    completenessScore >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-terracotta-light text-terracotta'
                  }`}>{completenessScore}%</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {missingFields.length === 0
                    ? 'Your profile is complete!'
                    : `Add ${missingFields.map(f => f.label.toLowerCase()).join(', ')} to improve visibility.`}
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="flex-shrink-0 border-sage/40 text-sage hover:bg-sage/10">
                <Link to="/dashboard/profile">Edit Profile</Link>
              </Button>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-sage/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-sage transition-all duration-500"
                style={{ width: `${completenessScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending checkout redirect */}
      {checkout.isPending && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-primary font-medium">Redirecting to checkout…</p>
          </CardContent>
        </Card>
      )}

      {/* Upgrade nudge for free users with a complete profile */}
      {hasProfile && !hasPaidPlan && billing?.tier === 'free' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                <Star className="h-4 w-4" /> Unlock Premium features
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Post retreats, add social links, and get priority placement for $39/mo.
              </p>
            </div>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0">
              <Link to="/dashboard/billing">Upgrade</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Website packages promo — shown to all providers with a profile */}
      {hasProfile && (
        <Card className="border-ocean/20 bg-ocean-light/20 overflow-hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ocean flex items-center gap-1.5">
                <Globe className="h-4 w-4 flex-shrink-0" />
                Need a website for your practice?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Custom sites from $499 setup + $19/mo — designed for Hawaii wellness providers.
                {earlyBird.eligible && (
                  <span className="ml-1 text-amber-700 font-medium">
                    <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                    Early bird 10% off — {earlyBird.daysRemaining}d {earlyBird.hoursRemaining % 24}h left.
                  </span>
                )}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="border-ocean/30 text-ocean hover:bg-ocean/10 flex-shrink-0">
              <Link to="/website-packages">View packages</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main action cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {actions.map((a) => (
          <Card key={a.title} className="group relative overflow-hidden transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className="flex w-full items-start justify-between">
                <div className={`rounded-xl p-3 ${a.color}`}>
                  <a.icon className="h-6 w-6" />
                </div>
                {a.badge && (
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {a.badge}
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{a.description}</p>
              </div>
              <Button asChild className="mt-auto w-full" variant="outline">
                <Link to={a.to}>{a.button}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
