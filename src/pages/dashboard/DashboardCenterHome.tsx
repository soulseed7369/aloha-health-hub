import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, CheckCircle, Circle, ArrowRight, Star, Eye, Search, MessageCircle, Mail, ChevronDown, ChevronUp, Camera, FileText, Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyBillingProfile } from "@/hooks/useStripe";
import { useMyCenters } from "@/hooks/useMyCenters";

export default function DashboardCenterHome() {
  const { data: centers = [], isLoading: centerLoading } = useMyCenters();
  const { data: billing } = useMyBillingProfile();
  const [guideOpen, setGuideOpen] = useState(true);

  const center = centers[0] ?? null;
  const hasProfile = !!center?.name;
  const hasPaidPlan = billing?.tier === 'premium' || billing?.tier === 'featured';
  const hasChosenPlan = !!billing?.tier;

  // ── Profile completeness ──────────────────────────────────────────────────
  const completenessFields = [
    { label: 'Name',        done: !!center?.name?.trim() },
    { label: 'Description', done: !!center?.description?.trim() },
    { label: 'Modalities',  done: (center?.modalities?.length ?? 0) > 0 },
    { label: 'Photo',       done: !!center?.avatar_url },
    { label: 'City',        done: !!center?.city?.trim() },
    { label: 'Phone',       done: !!center?.phone?.trim() },
    { label: 'Email',       done: !!center?.email?.trim() },
    { label: 'Website',     done: !!center?.website_url?.trim() },
  ];
  const completenessScore = hasProfile
    ? Math.round(completenessFields.filter(f => f.done).length / completenessFields.length * 100)
    : 0;
  const missingFields = completenessFields.filter(f => !f.done);

  const steps = [
    {
      id: 'profile',
      label: 'Complete your center profile',
      description: 'Add your center name, description, modalities, location, and photo.',
      done: hasProfile,
      to: '/dashboard/center-profile',
    },
    {
      id: 'plan',
      label: 'Choose a plan',
      description: 'Free gets you listed. Premium & Featured unlock social links, working hours, and more.',
      done: hasChosenPlan,
      to: '/dashboard/billing',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Welcome to your Center Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your listing, billing, and account settings.
        </p>
      </div>

      {/* Onboarding checklist — shown until both steps are done */}
      {!centerLoading && (!hasProfile || !hasChosenPlan) && (
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

      {/* Center Profile — primary action card */}
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-md max-w-md">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex w-full items-start justify-between">
            <div className="rounded-xl p-3 bg-terracotta-light text-terracotta">
              <Building className="h-6 w-6" />
            </div>
            {!hasProfile && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                Start here
              </Badge>
            )}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-semibold">Center Profile</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">List your center, describe your offerings, and reach wellness seekers across Hawaiʻi.</p>
          </div>
          <Button asChild className="mt-auto w-full" variant="outline">
            <Link to="/dashboard/center-profile">{hasProfile ? "Edit Profile" : "Create Profile"}</Link>
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
                <Link to="/dashboard/center-profile">Edit Profile</Link>
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

      {/* Upgrade nudge for free users with a profile */}
      {hasProfile && !hasPaidPlan && billing?.tier === 'free' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                <Star className="h-4 w-4" /> Unlock Premium features
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Add social links, working hours, and get a verified badge on your listing for $69/mo ($49/mo with Kamaʻāina rate).
              </p>
            </div>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0">
              <Link to="/dashboard/billing">Upgrade</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── How your listing works ─────────────────────────────────────────── */}
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
                    Your center appears in the directory when someone searches your island or modalities.
                    It also shows up in the "Nearby centers" section on practitioner profiles that share your specialties.
                    A complete profile with photos and a detailed description ranks higher in results.
                  </p>
                  {center?.id && (
                    <Link
                      to={`/center/${center.id}`}
                      className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline font-medium"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview your listing as visitors see it
                    </Link>
                  )}
                </div>

                {/* Tips to stand out */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Tips to stand out
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: Camera,   text: 'Add a high-quality photo — centers with photos get significantly more clicks.', done: !!center?.avatar_url },
                      { icon: FileText, text: 'Write a detailed description that tells people what your center offers and what to expect.', done: (center?.description?.length ?? 0) > 50 },
                      { icon: Heart,    text: 'Pick accurate modalities so the right clients find you through search.', done: (center?.modalities?.length ?? 0) >= 2 },
                      { icon: Mail,     text: 'Add your email and phone so people can reach you directly from your listing.', done: !!center?.email && !!center?.phone },
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {tip.done
                          ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          : <tip.icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {tip.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!hasProfile && (
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link to="/dashboard/center-profile">Edit your profile</Link>
                    </Button>
                  )}
                </div>

                {/* What's included on your plan */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-primary" />
                    {billing?.tier === 'featured' ? 'Your Featured plan includes'
                      : billing?.tier === 'premium' ? 'Your Premium plan includes'
                      : "What's included on your plan"}
                  </p>

                  {billing?.tier === 'featured' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Everything in Premium, plus homepage rotation, a Featured badge on your listing, priority placement at the top of search results, and access to Offerings & Classes.
                      </p>
                      {[
                        { text: 'Add offerings and events', to: '/dashboard/center-offerings' },
                        { text: 'Add recurring classes', to: '/dashboard/center-classes' },
                        { text: 'Set working hours and social links', to: '/dashboard/center-profile' },
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
                        Your listing shows a verified badge, social links, and working hours. Upload up to 5 photos and set your hours so visitors know when you're open.
                      </p>
                      {[
                        { text: 'Set working hours and social links', to: '/dashboard/center-profile' },
                        { text: 'Upload additional photos', to: '/dashboard/center-profile' },
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
                        Your free listing includes your center name, description, location, modalities, and contact info. People can find you through search and reach out directly.
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Want to add social links, working hours, multiple photos, and get a verified badge?
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
    </div>
  );
}
