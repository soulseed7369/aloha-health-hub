import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, Star, Crown, Loader2, ArrowRight, User, Building2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCreateCheckoutSession } from "@/hooks/useStripe";
import { STRIPE_PRICES, VALID_PRICE_IDS } from "@/lib/stripe";
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
  "Booking calendar embed",
  "Profile views & contact click counts",
  "Priority listing placement",
];

const PRAC_FEATURED_FEATURES = [
  "Everything in Premium, plus:",
  "Photo gallery (up to 10 photos)",
  "Full analytics dashboard with trends",
  "Search & homepage impression tracking",
  "Monthly analytics report emailed to you",
  '"Verified Practitioner" badge',
  "Enhanced Google search visibility",
  "Rich directory card with bio preview",
  "Priority in similar practitioner results",
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
  "Booking calendar embed",
  "Up to 3 locations",
  "Profile views & contact click counts",
  "Priority listing placement",
];

const CENTER_FEATURED_FEATURES = [
  "Everything in Premium, plus:",
  "Photo gallery (up to 10 photos)",
  "Unlimited locations",
  "Full analytics dashboard with trends",
  "Search & homepage impression tracking",
  "Monthly analytics report emailed to you",
  '"Verified Center" badge',
  "Enhanced Google search visibility",
  "Rich directory card with description preview",
  "Priority in similar center results",
  "Homepage spotlight rotation",
  "Top placement in search results",
  "Limited featured spots per island",
];

// ─── Pricing data ─────────────────────────────────────────────────────────────

type PricingMode = "practitioner" | "center";

const PRICING = {
  practitioner: {
    premium:  { price: 49,  kamaaina: 39,  spots: 20, priceId: STRIPE_PRICES.PREMIUM_MONTHLY },
    featured: { price: 129, kamaaina: 99,  spots: 5,  priceId: STRIPE_PRICES.FEATURED_MONTHLY },
  },
  center: {
    premium:  { price: 79,  kamaaina: 59,  spots: 10, priceId: STRIPE_PRICES.CENTER_PREMIUM_MONTHLY },
    featured: { price: 199, kamaaina: 149, spots: 5,  priceId: STRIPE_PRICES.CENTER_FEATURED_MONTHLY },
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
      <div className="mx-auto max-w-4xl text-center mb-6">
        <h1 className="font-display text-3xl font-bold md:text-4xl mb-3">
          List Your {isPrac ? "Practice" : "Center"}
        </h1>
        <p className="text-muted-foreground text-lg">
          Join Hawaiʻi Wellness — the islands&apos; premier wellness directory.
          <br className="hidden md:block" />
          Choose the plan that fits where you are.
        </p>
      </div>

      {/* Kama'aina Rate banner */}
      <div className="mx-auto max-w-3xl mb-10">
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-8 py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <h2 className="font-display text-2xl font-bold text-amber-900 md:text-3xl">Kamaʻāina Rate</h2>
            <Sparkles className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-base text-amber-800 max-w-lg mx-auto leading-relaxed">
            Our earliest supporters get special pricing — <strong>for life</strong>.
            <br className="hidden sm:block" />
            Lock in your rate before spots fill up.
          </p>
          <p className="text-sm text-amber-700 mt-3">
            Your price never goes up as long as your subscription stays active.
          </p>
        </div>
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

      {/* ════════════════════ Subscription Pricing ════════════════════ */}
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
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold">${prices.premium.kamaaina}</span>
                <span className="text-muted-foreground text-sm">/ month</span>
                <span className="text-muted-foreground text-lg line-through">${prices.premium.price}</span>
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <Sparkles className="h-3 w-3" />
                  Kamaʻāina Rate — first {prices.premium.spots} subscribers
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
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
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold">${prices.featured.kamaaina}</span>
                <span className="text-muted-foreground text-sm">/ month</span>
                <span className="text-muted-foreground text-lg line-through">${prices.featured.price}</span>
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <Sparkles className="h-3 w-3" />
                  Kamaʻāina Rate — first {prices.featured.spots} subscribers
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Stand out across the islands.</p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {featuredFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

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

      {/* Subscription footer note */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        All plans include a free listing. Paid plans are billed monthly and can be cancelled anytime.
        <br className="hidden md:block" />
        Payments are processed securely by Stripe.
      </p>

    </main>
  );
}
