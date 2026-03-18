import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Crown, Loader2, ArrowRight, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCreateCheckoutSession } from "@/hooks/useStripe";
import { STRIPE_PRICES, VALID_PRICE_IDS, PROMO_ACTIVE } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

// ─── Feature lists ────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "Basic directory listing",
  "Name, location & modalities",
  "Contact information & website",
  "Photo upload (1 profile photo)",
  "About section (250 characters)",
];

const PRAC_PREMIUM_FEATURES = [
  "Everything in Free, plus:",
  "Unlimited bio & 'What to Expect' section",
  "Social media links on your profile",
  "Client testimonials display",
  "Photo gallery (up to 5 photos)",
  "Working hours display",
  "Offerings, classes & events",
  "Booking, messaging & discovery call CTAs",
  "Priority listing placement",
];

const PRAC_FEATURED_FEATURES = [
  "Everything in Premium, plus:",
  "Photo gallery (up to 10 photos)",
  "Booking calendar embed",
  '"Featured Practitioner" badge',
  "Homepage spotlight rotation",
  "Top placement in search results",
  "Limited featured spots per island",
];

const CENTER_FREE_FEATURES = [
  "Basic center listing",
  "Center type, location & modalities",
  "Contact information & website",
  "Photo upload (1 profile photo)",
  "Description (250 characters)",
  "Single location only",
];

const CENTER_PREMIUM_FEATURES = [
  "Everything in Free, plus:",
  "Unlimited description",
  "Photo gallery (up to 5 photos)",
  "Events & classes calendar",
  "Client testimonials",
  "Social media links",
  "Working hours per location",
  "Amenities display",
  "Up to 3 locations",
  "Priority listing placement",
];

const CENTER_FEATURED_FEATURES = [
  "Everything in Premium, plus:",
  "Photo gallery (up to 10 photos)",
  "Unlimited locations",
  '"Featured Center" badge',
  "Homepage spotlight rotation",
  "Top placement in search results",
  "Limited featured spots per island",
];

// ─── Pricing data ─────────────────────────────────────────────────────────────

type PricingMode = "practitioner" | "center";

const PRICING = {
  practitioner: {
    premium: { price: 49, priceId: STRIPE_PRICES.PREMIUM_MONTHLY },
    featured: { price: 129, priceId: STRIPE_PRICES.FEATURED_MONTHLY },
  },
  center: {
    premium: { price: 79, priceId: STRIPE_PRICES.CENTER_PREMIUM_MONTHLY },
    featured: { price: 199, priceId: STRIPE_PRICES.CENTER_FEATURED_MONTHLY },
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListYourPractice() {
  usePageMeta(
    "List Your Practice",
    "Join Hawaiʻi Wellness — Hawaiʻi's premier wellness directory. Choose the plan that's right for your practice.",
  );

  const navigate = useNavigate();
  const checkout = useCreateCheckoutSession();
  const [mode, setMode] = useState<PricingMode>("practitioner");

  const isPrac = mode === "practitioner";
  const prices = PRICING[mode];
  const freeFeatures      = FREE_FEATURES;
  const premiumFeatures   = isPrac ? PRAC_PREMIUM_FEATURES   : CENTER_PREMIUM_FEATURES;
  const featuredFeatures  = isPrac ? PRAC_FEATURED_FEATURES  : CENTER_FEATURED_FEATURES;
  const freeCenterFeats   = !isPrac ? CENTER_FREE_FEATURES   : null;

  async function handlePaidPlan(priceId: string) {
    if (!supabase) return;
    if (!VALID_PRICE_IDS.includes(priceId)) {
      toast.error("Invalid plan selected");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    localStorage.setItem("pendingPlan", priceId);
    if (!user) { navigate("/auth"); return; }
    localStorage.removeItem("pendingPlan");
    checkout.mutate({ priceId }, { onError: (e: Error) => toast.error(e.message) });
  }

  async function handleFreePlan() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    localStorage.setItem("pendingPlan", "free");
    if (!user) { navigate("/auth"); return; }
    localStorage.removeItem("pendingPlan");
    navigate(isPrac ? "/dashboard/profile" : "/dashboard/centers");
  }

  return (
    <main className="container py-12 md:py-16">
      {/* Header */}
      <div className="mx-auto max-w-4xl text-center mb-10">
        <h1 className="font-display text-3xl font-bold md:text-4xl mb-3">
          List Your {isPrac ? "Practice" : "Center"}
        </h1>
        <p className="text-muted-foreground text-lg">
          Join Hawaiʻi Wellness — the islands' premier wellness directory.
          <br className="hidden md:block" />
          Choose the plan that fits where you are.
        </p>
        {PROMO_ACTIVE && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-5 py-2.5 text-sm text-emerald-800">
            <span className="text-base">🎉</span>
            <span>
              <strong>Launch offer:</strong> Use code{" "}
              <span className="font-mono font-bold tracking-wider bg-emerald-100 px-1.5 py-0.5 rounded">ALOHA20</span>{" "}
              at checkout for 20% off your first 12 months.
            </span>
          </div>
        )}
      </div>

      {/* Toggle */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center rounded-full border bg-muted p-1 gap-1">
          <button
            onClick={() => setMode("practitioner")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
              isPrac
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            Practitioners
          </button>
          <button
            onClick={() => setMode("center")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
              !isPrac
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Centers &amp; Spas
          </button>
        </div>
      </div>

      {/* Pricing cards */}
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
              {(freeCenterFeats ?? freeFeatures).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-sage mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full mt-auto" onClick={handleFreePlan}>
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
                <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                  Popular
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">${prices.premium.price}</span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isPrac ? "Grow your practice online." : "Showcase your full center."}
              </p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="w-full mt-auto"
              onClick={() => handlePaidPlan(prices.premium.priceId)}
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
              <p className="text-sm font-medium text-amber-600 uppercase tracking-wider mb-1">Featured</p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">${prices.featured.price}</span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Stand out across the islands.</p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {featuredFeatures.map((f) => (
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
              onClick={() => handlePaidPlan(prices.featured.priceId)}
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
