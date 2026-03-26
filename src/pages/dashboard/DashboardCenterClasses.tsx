import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyBillingProfile } from "@/hooks/useStripe";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardCenterClasses() {
  const { data: billing, isLoading } = useMyBillingProfile();

  const tier = billing?.tier ?? 'free';
  const isFeatured = tier === 'featured';

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!isFeatured) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-border bg-muted/40">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">Featured Plan Feature</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Classes are available on the Featured plan. Upgrade to list your recurring yoga, breathwork, or sound bath classes.
            </p>
            <div className="mt-6">
              <Button asChild variant="outline">
                <Link to="/list-your-practice">
                  <Crown className="mr-1.5 h-4 w-4 text-primary" />
                  Upgrade to Featured
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classes management for center providers coming soon.
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Classes management is currently being developed for center providers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
