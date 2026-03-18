import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Eye, MousePointerClick, Zap, TrendingUp } from "lucide-react";
import { useListingAnalytics } from "@/hooks/useListingAnalytics";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import { useMyCenters } from "@/hooks/useMyCenters";
import { useAccountType } from "@/hooks/useAccountType";
import { useNavigate } from "react-router-dom";

export default function DashboardAnalytics() {
  const navigate = useNavigate();
  const { data: accountType, isLoading: accountTypeLoading } = useAccountType();
  const { data: practitioner } = useMyPractitioner();
  const { data: centers } = useMyCenters();

  // Get the primary listing ID based on account type
  const primaryListingId = accountType === 'center' ? centers?.[0]?.id : practitioner?.id;

  const { data: analytics, isLoading: analyticsLoading } = useListingAnalytics(primaryListingId ?? null);

  const isLoading = accountTypeLoading || analyticsLoading;

  // Determine tier from listing
  const currentTier = accountType === 'center' ? centers?.[0]?.tier : practitioner?.tier;
  const isFeatured = currentTier === 'featured';
  const isPremium = currentTier === 'premium' || isFeatured;

  if (!isPremium) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your listing performance and engagement metrics.
          </p>
        </div>

        <Alert className="border-blue-300 bg-blue-50 text-blue-900">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <AlertTitle className="font-semibold">Unlock Analytics with Premium</AlertTitle>
          <AlertDescription className="mt-2">
            Analytics is available for Premium and Featured tier listings. Upgrade your plan to start tracking views, clicks, and impressions.
          </AlertDescription>
          <Button
            onClick={() => navigate('/dashboard/billing')}
            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            View Plans
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your listing performance and engagement metrics.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!primaryListingId || !analytics) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your listing performance and engagement metrics.
          </p>
        </div>

        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <BarChart3 className="h-4 w-4 text-amber-600" />
          <AlertTitle className="font-semibold">No Data Yet</AlertTitle>
          <AlertDescription className="mt-2">
            Complete your listing profile to start tracking analytics. Your profile needs to be published and viewed by users to generate data.
          </AlertDescription>
          <Button
            onClick={() => navigate(accountType === 'center' ? '/dashboard/centers' : '/dashboard/profile')}
            className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Complete Profile
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 30 days of engagement data for your listing.
        </p>
      </div>

      {/* Premium: Basic stats */}
      {isPremium && !isFeatured && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalViews30d}</div>
                <p className="text-xs text-muted-foreground mt-1">in the last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Contact Clicks</CardTitle>
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalClicks30d}</div>
                <p className="text-xs text-muted-foreground mt-1">in the last 30 days</p>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-primary/20 bg-primary/5 text-primary/80">
            <TrendingUp className="h-4 w-4" />
            <AlertTitle className="font-semibold">Unlock Detailed Analytics</AlertTitle>
            <AlertDescription className="mt-2">
              Upgrade to Featured to access detailed trends, search impression tracking, and monthly reports.
            </AlertDescription>
            <Button
              onClick={() => navigate('/dashboard/billing')}
              className="mt-3 bg-primary hover:bg-primary/90"
            >
              Upgrade to Featured
            </Button>
          </Alert>
        </>
      )}

      {/* Featured: Full analytics */}
      {isFeatured && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                  <Eye className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalViews30d}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Contact Clicks</CardTitle>
                  <MousePointerClick className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalClicks30d}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Search Impressions</CardTitle>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.impressionsByType['search'] || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">In search results</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Homepage Impressions</CardTitle>
                  <Zap className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.impressionsByType['homepage'] || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Homepage rotation</p>
              </CardContent>
            </Card>
          </div>

          {/* Views trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Views Trend (Last 30 Days)</CardTitle>
              <CardDescription>Daily profile views over the past month</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.totalViews30d === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No view data yet
                </div>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {analytics.viewsByDay.map((d, i) => {
                    const maxCount = Math.max(...analytics.viewsByDay.map(v => v.count), 1);
                    const height = (d.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 group relative">
                        <div
                          className="bg-blue-500/70 rounded-t-sm hover:bg-blue-600 transition-colors w-full"
                          style={{ height: `${Math.max(height, 3)}%`, minHeight: '2px' }}
                          title={`${d.date}: ${d.count} views`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Click breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Contact Click Breakdown</CardTitle>
              <CardDescription>How users are reaching out</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.totalClicks30d === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground">
                  No click data yet
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.clicksByType).map(([type, count]) => {
                    const total = analytics.totalClicks30d;
                    const percentage = ((count / total) * 100).toFixed(0);
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize font-medium">
                            {type === 'phone' && '📞'} {type === 'email' && '📧'} {type === 'website' && '🌐'} {type === 'booking' && '📅'} {type}
                          </span>
                          <span className="font-semibold">{count}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">{percentage}% of clicks</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
