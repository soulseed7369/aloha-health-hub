import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Crown, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCreateCheckoutSession } from "@/hooks/useStripe";
import { STRIPE_PRICES, VALID_PRICE_IDS, PROMO_ACTIVE } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

const FREE_FEATURES = [
  "Basic directory listing",
  "Name, bio, location & modalities",
  "Contact information",
  "Website link",
  "Photo upload",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Offerings, Classes & Testimonials",
  "Social media links on your profile",
  "Booking, messaging & discovery call CTAs",
  "Working hours display",
  "Priority listing placement",
];

const FEATURED_FEATURES = [
  "Everything in Premium",
  '"Featured Practitioner" badge',
  "Homepage spotlight rotation",
  "Top placement on island search pages",
  "Maximum visibility — limited to 5 per island",
];

export default function ListYourPractice() {
  usePageMeta(
    "List Your Practice",
    "Join Hawaiʻi Wellness — Hawaiʻi's premier wellness directory. Choose the plan that's right for your practice.",
  );

  const navigate = useNavigate();
  const checkout = useCreateCheckoutSession();

  async function handlePaidPlan(priceId: string) {
    if (!supabase) return;
    // Validate priceId is one of the known price IDs
    if (!VALID_PRICE_IDS.includes(priceId)) {
      toast.error('Invalid plan selected');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    // Persist intent so auth page can resume it after sign-in
    localStorage.setItem('pendingPlan', priceId);
    if (!user) {
      navigate("/auth");
      return;
    }
    localStorage.removeItem('pendingPlan');
    checkout.mutate(
      { priceId },
      { onError: (e: Error) => toast.error(e.message) },
    );
  }

  async function handleFreePlan() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    localStorage.setItem('pendingPlan', 'free');
    if (!user) {
      navigate("/auth");
      return;
    }
    localStorage.removeItem('pendingPlan');
    navigate("/dashboard/profile");
  }

  return (
    <main className="container py-12 md:py-16">
      <div className="mx-auto max-w-4xl text-center mb-12">
        <h1 className="font-display text-3xl font-bold md:text-4xl mb-3">
          List Your Practice
        </h1>
        <p className="text-muted-foreground text-lg">
          Join Hawaiʻi Wellness — the islands' premier wellness directory.
          <br className="hidden md:block" />
          Choose the plan that fits where you are.
        </p>
      </div>

      <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3">

        {/* ── Free ── */}
        <Card className="flex flex-col">
          <CardContent className="flex flex-col flex-1 p-6 gap-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">$0</span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Get listed at no cost.</p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-sage mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full mt-auto"
              onClick={handleFreePlan}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </CardContent>
        </Card>

        {/* ── Premium ── */}
        <Card className="flex flex-col ring-2 ring-primary">
          <CardContent className="flex flex-col flex-1 p-6 gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-primary uppercase tracking-wider">Premium</p>
                <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">Popular</span>
              </div>
              <div className="flex items-baseline gap-1">
                {PROMO_ACTIVE ? (
                  <>
                    <span className="font-display text-4xl font-bold">$39.20</span>
                    <span className="text-muted-foreground text-sm line-through ml-1">$49</span>
                  </>
                ) : (
                  <span className="font-display text-4xl font-bold">$49</span>
                )}
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              {PROMO_ACTIVE && (
                <p className="text-xs text-emerald-700 font-medium mt-1">🎉 20% off locked in for 12 months</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">Grow your practice online.</p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="w-full mt-auto"
              onClick={() => handlePaidPlan(STRIPE_PRICES.PREMIUM_MONTHLY)}
              disabled={checkout.isPending}
            >
              {checkout.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Star className="h-4 w-4 mr-1.5" />}
              Get Premium
            </Button>
          </CardContent>
        </Card>

        {/* ── Featured ── */}
        <Card className="flex flex-col ring-2 ring-amber-400 relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Maximum Visibility
            </span>
          </div>
          <CardContent className="flex flex-col flex-1 p-6 pt-7 gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Featured</p>
              </div>
              <div className="flex items-baseline gap-1">
                {PROMO_ACTIVE ? (
                  <>
                    <span className="font-display text-4xl font-bold">$103.20</span>
                    <span className="text-muted-foreground text-sm line-through ml-1">$129</span>
                  </>
                ) : (
                  <span className="font-display text-4xl font-bold">$129</span>
                )}
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              {PROMO_ACTIVE && (
                <p className="text-xs text-emerald-700 font-medium mt-1">🎉 20% off locked in for 12 months</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">Stand out across the islands.</p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {FEATURED_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-center">
              Only 5 featured spots available per island
            </p>

            <Button
              className="w-full mt-auto bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => handlePaidPlan(STRIPE_PRICES.FEATURED_MONTHLY)}
              disabled={checkout.isPending}
            >
              {checkout.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Crown className="h-4 w-4 mr-1.5" />}
              Get Featured
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer note */}
      <p className="text-center text-sm text-muted-foreground mt-10">
        All plans include a free listing. Paid plans are billed monthly and can be cancelled anytime.
        <br className="hidden md:block" />
        Payments are processed securely by Stripe.
      </p>
    </main>
  );
}
