import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard, CheckCircle, Calendar, AlertCircle } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    features: ["1 Practitioner listing", "Basic directory profile", "Email support"],
    current: false,
  },
  {
    name: "Professional",
    price: "$59",
    period: "/mo",
    features: ["1 Practitioner + 2 Center listings", "Priority placement", "Retreat listings", "Analytics dashboard"],
    current: true,
  },
  {
    name: "Enterprise",
    price: "$119",
    period: "/mo",
    features: ["Unlimited listings", "Featured placement", "Custom branding", "Dedicated support"],
    current: false,
  },
];

export default function DashboardBilling() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan, payment method, and billing history.
        </p>
      </div>

      {/* Current plan summary */}
      <Card className="border-primary/20 bg-terracotta-light/20">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Plan</p>
            <p className="font-display text-2xl font-bold text-foreground">Professional</p>
            <p className="text-sm text-muted-foreground">
              Renews on <span className="font-medium text-foreground">March 25, 2026</span>
            </p>
          </div>
          <Badge className="w-fit gap-1.5 bg-secondary text-secondary-foreground">
            <CheckCircle className="h-3.5 w-3.5" />
            Active
          </Badge>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold">Choose Your Plan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.current ? "border-primary shadow-md" : ""}
            >
              <CardContent className="flex flex-col gap-4 p-5">
                <div>
                  <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.current ? "outline" : "default"}
                  className="mt-auto w-full"
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : "Switch Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Auto-renewal toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Auto-Renewal</CardTitle>
          <CardDescription>
            Your subscription will automatically renew each billing cycle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Auto-renew subscription</Label>
                <p className="text-xs text-muted-foreground">Next charge: $59.00 on Mar 25, 2026</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <CardDescription>
            Your card will be charged automatically on each renewal date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded-md bg-background shadow-sm">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Visa ending in 4242</p>
                <p className="text-xs text-muted-foreground">Expires 09/2028</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">Default</Badge>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm">Update Card</Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Feb 25, 2026", amount: "$59.00", status: "Paid" },
              { date: "Jan 25, 2026", amount: "$59.00", status: "Paid" },
              { date: "Dec 25, 2025", amount: "$59.00", status: "Paid" },
            ].map((inv) => (
              <div
                key={inv.date}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.date}</p>
                  <p className="text-xs text-muted-foreground">Professional Plan</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{inv.amount}</span>
                  <Badge variant="outline" className="gap-1 text-xs text-sage">
                    <CheckCircle className="h-3 w-3" />
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cancel notice */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Need to cancel? You can turn off auto-renewal above. Your listing will remain active until the end of your current billing period.
        </p>
      </div>
    </div>
  );
}
