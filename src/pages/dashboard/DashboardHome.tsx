import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle, Circle, ArrowRight, Star, Loader2, Eye, Search, MessageCircle, Mail, ChevronDown, ChevronUp, Camera, FileText, Heart, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import { useMyBillingProfile, useCreateCheckoutSession } from "@/hooks/useStripe";
import { useAccountType } from "@/hooks/useAccountType";

export default function DashboardHome() {
  const navigate = useNavigate();
  const { data: practitioner, isLoading: practLoading } = useMyPractitioner();
  const { data: billing } = useMyBillingProfile();
  const { data: accountType, isLoading: accountTypeLoading } = useAccountType();
  const checkout = useCreateCheckoutSession();
  const [guideOpen, setGuideOpen] = useState(true);

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
    const validPlans = ['free', 'price_1TCo3PAmznBlrx8spOgZD1VC', 'price_1TErgTAmznBlrx8scCN6CsNa', 'price_1TErf1AmznBlrx8suRd3ARgM', 'price_1TEszAAmznBlrx8sDwkodC8z'];
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
  const hasChosenPlan = !!billing?.tier; // free, premium, or featured — all count as "chosen"

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
      id: 'plan',
      label: 'Choose a plan',
      description: 'Free gets you listed. Premium & Featured unlock testimonials, analytics, and more.',
      done: hasChosenPlan,
      to: '/dashboard/billing',
    },
  ];


  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Welcome to your Provider Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your listing, billing, and account settings.
        </p>
      </div>

      {/* Onboarding checklist — shown until both steps are done */}
      {!practLoading && (!hasProfile || !hasChosenPlan) && (
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

      {/* Practitioner Profile — primary action card */}
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-md max-w-md">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex w-full items-start justify-between">
            <div className="rounded-xl p-3 bg-terracotta-light text-terracotta">
              <User className="h-6 w-6" />
            </div>
            {!hasProfile && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                Start here
              </Badge>
            )}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-semibold">Practitioner Profile</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">List your individual practice, bio, and modalities.</p>
          </div>
          <Button asChild className="mt-auto w-full" variant="outline">
            <Link to="/dashboard/profile">{hasProfile ? "Edit Profile" : "Create Profile"}</Link>
          </Button>
        </CardContent>
      </Card>

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
                Add social links, testimonials, working hours, and get priority placement for $29/mo.
              </p>
            </div>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0">
              <Link to="/dashboard/billing">Upgrade</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── How your listing works — adaptive guide ─────────────────────── */}
      {hasProfile && (
        <Card className="border-border">
          <CardContent className="p-0">
            <button
              onClick={() => setGuideOpen(!guideOpen)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">How your listing works</h2>
              </div>
              {guideOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {guideOpen && (
              <div className="px-5 pb-5 space-y-5 border-t border-border/50">

                {/* How people find you */}
                <div className="pt-4">
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-teal-600" />
                    How people find you
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your listing appears in the directory when someone searches your island or modalities.
                    It also shows up in the "Similar practitioners" section on other profiles that share your specialties.
                    A complete profile with a photo and detailed bio ranks higher in results.
                  </p>
                  {practitioner?.id && (
                    <Link
                      to={`/profile/${practitioner.id}`}
                      className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline font-medium"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview your listing as visitors see it
                    </Link>
                  )}
                </div>

                {/* Getting the most out of your listing */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Tips to stand out
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: Camera, text: 'Add a clear, friendly photo — listings with photos get significantly more clicks.', done: !!practitioner?.avatar_url },
                      { icon: FileText, text: 'Write a detailed bio that tells people who you are, what you do, and what to expect.', done: (practitioner?.bio?.length ?? 0) > 50 },
                      { icon: Heart, text: 'Pick accurate modalities so the right clients find you through search.', done: (practitioner?.modalities?.length ?? 0) >= 2 },
                      { icon: Mail, text: 'Add your email and phone so people can reach you directly from your listing.', done: !!practitioner?.email && !!practitioner?.phone },
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {tip.done
                          ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          : <tip.icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                        <p className={`text-sm leading-relaxed ${tip.done ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
                          {tip.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!hasProfile && (
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link to="/dashboard/profile">Edit your profile</Link>
                    </Button>
                  )}
                </div>

                {/* What you can do with your current plan */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-primary" />
                    {billing?.tier === 'featured' ? 'Your Featured plan includes'
                      : billing?.tier === 'premium' ? 'Your Premium plan includes'
                      : 'What\'s included on your plan'}
                  </p>

                  {billing?.tier === 'featured' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Everything in Premium, plus homepage rotation, a Featured badge on your card, and priority placement at the top of search results on your island.
                      </p>
                      {[
                        { text: 'Collect verified testimonials from your clients', to: '/dashboard/testimonials' },
                        { text: 'Add offerings and class schedules', to: '/dashboard/offerings' },
                        { text: 'Set your working hours and social links', to: '/dashboard/profile' },
                      ].map((item, i) => (
                        <Link key={i} to={item.to} className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <ArrowRight className="h-3 w-3" />
                          {item.text}
                        </Link>
                      ))}
                    </div>
                  ) : billing?.tier === 'premium' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your listing shows a verified badge, social links, and working hours. You can also collect verified testimonials from clients and add offerings.
                      </p>
                      {[
                        { text: 'Invite clients to leave a verified testimonial', to: '/dashboard/testimonials' },
                        { text: 'Add offerings and class schedules', to: '/dashboard/offerings' },
                        { text: 'Set your working hours and social links', to: '/dashboard/profile' },
                      ].map((item, i) => (
                        <Link key={i} to={item.to} className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <ArrowRight className="h-3 w-3" />
                          {item.text}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your free listing includes your name, bio, location, modalities, and contact info. People can find you through search and reach out directly.
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Want to add testimonials, social links, working hours, and get a verified badge?
                      </p>
                      <Link to="/dashboard/billing" className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                        <ArrowRight className="h-3 w-3" />
                        See what Premium and Featured unlock
                      </Link>
                    </div>
                  )}
                </div>

                {/* Help */}
                <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                  <Link to="/help" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Help Center
                  </Link>
                  <a href="mailto:aloha@hawaiiwellness.net" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                    aloha@hawaiiwellness.net
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Website packages promo — hidden until ready to launch */}
    </div>
  );
}
