import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle, Star, Crown, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useMyBillingProfile, useCreateCheckoutSession, PRACTITIONER_PLAN_OPTIONS, CENTER_PLAN_OPTIONS } from "@/hooks/useStripe";
import { STRIPE_PRICES } from "@/lib/stripe";
import { useAccountType } from "@/hooks/useAccountType";

const TIER_META = {
  free:     { label: "Free",     color: "bg-gray-100 text-gray-700",       icon: null },
  premium:  { label: "Premium",  color: "bg-blue-100 text-blue-700",        icon: <Star className="h-3.5 w-3.5" /> },
  featured: { label: "Featured", color: "bg-amber-100 text-amber-700",      icon: <Crown className="h-3.5 w-3.5" /> },
} as const;

export default function DashboardBilling() {
  const [searchParams] = useSearchParams();
  const successParam = searchParams.get("success");

  const { data: billing, isLoading } = useMyBillingProfile();
  const { data: accountType, isLoading: accountTypeLoading } = useAccountType();
  const checkout = useCreateCheckoutSession();

  // Select the appropriate plan options based on account type
  const planOptions = accountType === 'center' ? CENTER_PLAN_OPTIONS : PRACTITIONER_PLAN_OPTIONS;
  const premiumPriceId = accountType === 'center' ? STRIPE_PRICES.CENTER_PREMIUM_MONTHLY : STRIPE_PRICES.PREMIUM_MONTHLY;
  const featuredPriceId = accountType === 'center' ? STRIPE_PRICES.CENTER_FEATURED_MONTHLY : STRIPE_PRICES.FEATURED_MONTHLY;

  // Show success toast on redirect back from Stripe
  useEffect(() => {
    if (successParam === "1") {
      toast.success("Subscription activated! Your plan has been upgraded.");
    }
  }, [successParam]);

  function handleUpgrade(priceId: string) {
    checkout.mutate(
      { priceId },
      { onError: (e: Error) => toast.error(e.message) },
    );
  }

  const currentTier = billing?.tier ?? "free";
  const tierMeta = TIER_META[currentTier];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan and subscription.
        </p>
      </div>

      {/* Success banner */}
      {successParam === "1" && (
        <Alert className="border-green-300 bg-green-50 text-green-900">
          <PartyPopper className="h-4 w-4 text-green-600" />
          <AlertTitle className="font-semibold">Welcome to {tierMeta.label}!</AlertTitle>
          <AlertDescription>
            Your subscription is now active. Your listings have been upgraded automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Current plan */}
      <Card className="border-primary/20 bg-terracotta-light/20">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          {isLoading ? (
            <Skeleton className="h-14 w-48" />
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current Plan
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-display text-2xl font-bold text-foreground">{tierMeta.label}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${tierMeta.color}`}>
                    {tierMeta.icon}
                    {tierMeta.label}
                  </span>
                </div>
                {billing?.subscription_status && billing.subscription_status !== "active" && (
                  <p className="text-sm text-amber-600 capitalize">{billing.subscription_status}</p>
                )}
                {billing?.subscription_period_end && (
                  <p className="text-sm text-muted-foreground">
                    Renews {new Date(billing.subscription_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              <Badge className="w-fit gap-1.5 bg-secondary text-secondary-foreground">
                <CheckCircle className="h-3.5 w-3.5" />
                {billing?.subscription_status === "active" ? "Active" : "Free"}
              </Badge>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan options */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold">Upgrade Your Plan</h2>

        {accountTypeLoading ? (
          // Show skeleton cards while accountType loads
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-4 p-5">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-32" />
                <div className="space-y-2 flex-1">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-4 p-5">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-32" />
                <div className="space-y-2 flex-1">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">

          {/* ── Premium ── */}
          <Card className={currentTier === "premium" ? "ring-2 ring-blue-400" : ""}>
            <CardContent className="flex flex-col gap-4 p-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-blue-500" />
                  <h3 className="font-display text-lg font-semibold">Premium</h3>
                  {currentTier === "premium" && (
                    <Badge className="ml-auto text-xs bg-blue-100 text-blue-700 border-blue-200">Current</Badge>
                  )}
                </div>
                <p className="mt-1">
                  {accountTypeLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-foreground">{planOptions[0].price.split(' ')[0]}</span>
                      <span className="text-sm text-muted-foreground"> / month</span>
                    </>
                  )}
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                {planOptions[0].features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
                    {f}
                  </li>
                ))}
              </ul>
              {currentTier === "free" ? (
                <Button
                  className="mt-auto w-full"
                  onClick={() => handleUpgrade(premiumPriceId)}
                  disabled={checkout.isPending || accountTypeLoading}
                >
                  {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Upgrade to Premium
                </Button>
              ) : currentTier === "featured" ? (
                <Button variant="outline" className="mt-auto w-full" disabled>Downgrade</Button>
              ) : (
                <Button variant="outline" className="mt-auto w-full" disabled>Current Plan</Button>
              )}
            </CardContent>
          </Card>

          {/* ── Featured ── */}
          <Card className={`relative ${currentTier === "featured" ? "ring-2 ring-amber-400" : "ring-1 ring-amber-200"}`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Best for visibility
              </span>
            </div>
            <CardContent className="flex flex-col gap-4 p-5 pt-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <h3 className="font-display text-lg font-semibold">Featured</h3>
                  {currentTier === "featured" && (
                    <Badge className="ml-auto text-xs bg-amber-100 text-amber-700 border-amber-200">Current</Badge>
                  )}
                </div>
                <p className="mt-1">
                  {accountTypeLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-foreground">{planOptions[1].price.split(' ')[0]}</span>
                      <span className="text-sm text-muted-foreground"> / month</span>
                    </>
                  )}
                </p>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                {planOptions[1].features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 text-center">
                Limited to 5 featured listings per island
              </p>

              {currentTier !== "featured" ? (
                <Button
                  className="mt-auto w-full bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => handleUpgrade(featuredPriceId)}
                  disabled={checkout.isPending || accountTypeLoading}
                >
                  {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Upgrade to Featured
                </Button>
              ) : (
                <Button variant="outline" className="mt-auto w-full" disabled>Current Plan</Button>
              )}
            </CardContent>
          </Card>
          </div>
        )}
      </div>

      {/* Payment method notice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <CardDescription>
            Payments are securely processed by Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex h-10 w-14 items-center justify-center rounded-md bg-background shadow-sm">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {billing?.stripe_customer_id
                  ? "Managed via Stripe"
                  : "No payment method on file"}
              </p>
              <p className="text-xs text-muted-foreground">
                {billing?.stripe_customer_id
                  ? "Update your card or cancel via the Stripe customer portal"
                  : "You'll be prompted to add one during checkout"}
              </p>
            </div>
          </div>
          {billing?.stripe_customer_id && (
            <p className="mt-3 text-xs text-muted-foreground">
              To update your payment method or cancel, please contact support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
