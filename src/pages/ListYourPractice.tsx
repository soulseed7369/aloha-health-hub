import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Crown, Loader2, ArrowRight, User, Building2, Globe, Sparkles, Mail } from "lucide-react";
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
    premium:  { price: 49,  kamaaina: 39,  spots: 10, priceId: STRIPE_PRICES.PREMIUM_MONTHLY },
    featured: { price: 129, kamaaina: 99,  spots: 5,  priceId: STRIPE_PRICES.FEATURED_MONTHLY },
  },
  center: {
    premium:  { price: 79,  kamaaina: 59,  spots: 5,  priceId: STRIPE_PRICES.CENTER_PREMIUM_MONTHLY },
    featured: { price: 199, kamaaina: 149, spots: 5,  priceId: STRIPE_PRICES.CENTER_FEATURED_MONTHLY },
  },
} as const;

// ─── Website bundles ──────────────────────────────────────────────────────────

const WEBSITE_BUNDLES = [
  {
    name: "Essentials",
    price: 597,
    kamaaina: 497,
    features: [
      "3–4 page site (Home, About, Services, Contact)",
      "Mobile-responsive design",
      "Contact form",
      "Linked to your Hawaiʻi Wellness directory profile",
      "Includes 6 months Premium subscription ($294 value)",
    ],
    mailto: "mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Essentials",
    popular: false,
  },
  {
    name: "Standard",
    price: 997,
    kamaaina: 897,
    features: [
      "5-page site",
      "Booking integration (Calendly / Acuity embed)",
      "Google Business Profile setup",
      "Basic SEO optimization (meta tags, local schema, Google indexing)",
      "2 rounds of revisions",
      "Includes 12 months Premium subscription ($588 value)",
    ],
    mailto: "mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Standard",
    popular: true,
  },
  {
    name: "Pro",
    price: 1497,
    kamaaina: 1397,
    features: [
      "Everything in Standard, plus:",
      "Blog page",
      "Advanced SEO (keyword research, internal linking, image optimization, sitemap)",
      "AI search optimization (FAQ schema, service schema, LocalBusiness structured data)",
      "Social media header graphics",
      "3 rounds of revisions",
      "Includes 12 months Premium subscription ($588 value)",
    ],
    mailto: "mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Pro",
    popular: false,
  },
];

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
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-amber-900">Kamaʻāina Rate</h2>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-sm text-amber-800 max-w-lg mx-auto">
            Our earliest supporters get special pricing — for life.
            Lock in your rate before spots fill up.
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Your Kamaʻāina Rate is locked in for life — your price never goes up as long as your subscription stays active.
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

      {/* ════════════════════ Pricing cards ════════════════════ */}
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
              {/* Kama'aina pricing */}
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
              {/* Kama'aina pricing */}
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

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-center">
              Only {prices.featured.spots} featured spots available per island
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

      {/* Subscription footer note */}
      <p className="text-center text-sm text-muted-foreground mt-8 mb-4">
        All plans include a free listing. Paid plans are billed monthly and can be cancelled anytime.
        <br className="hidden md:block" />
        Payments are processed securely by Stripe.
      </p>

      {/* ════════════════════ Website Bundles ════════════════════ */}
      <div className="mx-auto max-w-5xl mt-16 pt-16 border-t border-border">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold md:text-3xl">Done-for-You Websites</h2>
          </div>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A professional website + your directory listing, built by the team that knows Hawaiʻi wellness.
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <Sparkles className="h-3 w-3" />
              Kamaʻāina Rate — first 10 websites
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {WEBSITE_BUNDLES.map((bundle) => (
            <Card
              key={bundle.name}
              className={`flex flex-col ${bundle.popular ? "ring-2 ring-primary relative" : ""}`}
            >
              {bundle.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardContent className={`flex flex-col flex-1 p-6 gap-5 ${bundle.popular ? "pt-7" : ""}`}>
                <div>
                  <p className={`text-sm font-medium uppercase tracking-wider mb-1 ${bundle.popular ? "text-primary" : "text-muted-foreground"}`}>
                    {bundle.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold">${bundle.kamaaina.toLocaleString()}</span>
                    <span className="text-muted-foreground text-lg line-through">${bundle.price.toLocaleString()}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      <Sparkles className="h-3 w-3" />
                      Kamaʻāina Rate
                    </span>
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {bundle.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${bundle.popular ? "text-primary" : "text-sage"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full mt-auto gap-2 ${bundle.popular ? "" : ""}`}
                  variant={bundle.popular ? "default" : "outline"}
                  asChild
                >
                  <a href={bundle.mailto}>
                    <Mail className="h-4 w-4" />
                    Get Started
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Website bundles footer notes */}
        <div className="mt-8 space-y-1.5 text-center">
          <p className="text-xs text-muted-foreground">
            After the included subscription period, your Premium subscription continues at $49/mo (or your Kamaʻāina Rate if applicable). Cancel anytime.
          </p>
          <p className="text-xs text-muted-foreground">
            Need changes after your included revisions? Additional major revisions are $149 each.
          </p>
        </div>
      </div>
    </main>
  );
}
