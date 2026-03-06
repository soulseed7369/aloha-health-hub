import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Building, Calendar, CheckCircle, Circle, ArrowRight, Star, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import { useMyBillingProfile, useCreateCheckoutSession } from "@/hooks/useStripe";

export default function DashboardHome() {
  const { data: practitioner, isLoading: practLoading } = useMyPractitioner();
  const { data: billing } = useMyBillingProfile();
  const checkout = useCreateCheckoutSession();

  // Resume any pending plan intent stored before auth redirect
  useEffect(() => {
    const pending = localStorage.getItem('pendingPlan');
    // Validate pendingPlan is one of the expected values to prevent abuse
    const validPlans = ['free', 'prod_U5xikoe835v7T6', 'prod_U5xj8icg13fOcT'];
    if (!pending || !validPlans.includes(pending) || pending === 'free') {
      localStorage.removeItem('pendingPlan');
      return;
    }
    localStorage.removeItem('pendingPlan');
    checkout.mutate(
      { priceId: pending },
      { onError: (e: Error) => toast.error(e.message) },
    );
  }, [checkout]);

  const hasProfile = !!practitioner?.name;
  const hasPaidPlan = billing?.tier === 'premium' || billing?.tier === 'featured';

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
