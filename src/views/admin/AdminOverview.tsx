import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import { useGA4Metrics } from '@/hooks/useGA4Metrics';
import {
  Users, Building2, CheckCircle, FileText,
  TrendingUp, Star, Crown, UserCheck, BarChart2, Eye,
} from 'lucide-react';

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
  accent,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  loading: boolean;
  accent?: 'green' | 'blue' | 'amber' | 'purple';
}) {
  const accentClasses: Record<string, string> = {
    green:  'bg-green-50  text-green-700',
    blue:   'bg-blue-50   text-blue-700',
    amber:  'bg-amber-50  text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  const iconBg = accentClasses[accent ?? 'blue'];

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            {loading ? (
              <Skeleton className="mt-1.5 h-7 w-16" />
            ) : (
              <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
            )}
            {sub && !loading && (
              <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
            )}
          </div>
          <div className={`flex-shrink-0 rounded-lg p-2 ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminOverview() {
  const { data, isLoading, error, dataUpdatedAt } = useAdminMetrics();
  const { data: ga4, isLoading: ga4Loading, error: ga4Error } = useGA4Metrics();

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            {lastUpdated ? `Updated at ${lastUpdated}` : 'Loading metrics…'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load metrics. Check your database connection.
        </div>
      )}

      {/* ── Listings section ── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Listings</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            title="Practitioners"
            value={data?.totalPractitioners ?? 0}
            sub={data ? `${data.publishedPractitioners} published · ${data.draftPractitioners} draft` : undefined}
            icon={Users}
            loading={isLoading}
            accent="blue"
          />
          <MetricCard
            title="Centers"
            value={data?.totalCenters ?? 0}
            sub={data ? `${data.publishedCenters} published · ${data.draftCenters} draft` : undefined}
            icon={Building2}
            loading={isLoading}
            accent="blue"
          />
          <MetricCard
            title="Published"
            value={(data?.publishedPractitioners ?? 0) + (data?.publishedCenters ?? 0)}
            sub="across all islands"
            icon={CheckCircle}
            loading={isLoading}
            accent="green"
          />
          <MetricCard
            title="Draft / Review"
            value={(data?.draftPractitioners ?? 0) + (data?.draftCenters ?? 0)}
            sub="awaiting publish"
            icon={FileText}
            loading={isLoading}
            accent="amber"
          />
        </div>
      </section>

      {/* ── Claims section ── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Claims</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard
            title="Total Claimed"
            value={data?.claimedListings ?? 0}
            sub="listings with an owner"
            icon={UserCheck}
            loading={isLoading}
            accent="green"
          />
          <MetricCard
            title="Last 24 Hours"
            value={data?.newClaimsLast24h ?? 0}
            sub="recently claimed / updated"
            icon={TrendingUp}
            loading={isLoading}
            accent="purple"
          />
          <MetricCard
            title="Last 7 Days"
            value={data?.newClaimsLast7d ?? 0}
            sub="recently claimed / updated"
            icon={TrendingUp}
            loading={isLoading}
            accent="purple"
          />
        </div>
      </section>

      {/* ── Subscriptions section ── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Subscriptions</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard
            title="Active Total"
            value={data?.totalActiveSubscriptions ?? 0}
            sub="paid subscribers"
            icon={BarChart2}
            loading={isLoading}
            accent="green"
          />
          <MetricCard
            title="Premium ⭐"
            value={data?.activePremium ?? 0}
            sub="$39/mo"
            icon={Star}
            loading={isLoading}
            accent="amber"
          />
          <MetricCard
            title="Featured 👑"
            value={data?.activeFeatured ?? 0}
            sub="$129/mo"
            icon={Crown}
            loading={isLoading}
            accent="purple"
          />
        </div>
      </section>

      {/* ── Traffic section (Google Analytics) ── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Visitor Traffic
          <span className="ml-2 text-xs font-normal normal-case text-muted-foreground/60">via Google Analytics</span>
        </h3>

        {ga4Error ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <BarChart2 className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Traffic data unavailable</p>
              <p className="max-w-xs text-xs text-red-500 font-mono break-all">
                {(ga4Error as Error)?.message || String(ga4Error)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">Last 7 days</p>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <MetricCard
                title="Sessions"
                value={ga4?.last7d.sessions ?? 0}
                sub="visits"
                icon={TrendingUp}
                loading={ga4Loading}
                accent="blue"
              />
              <MetricCard
                title="Users"
                value={ga4?.last7d.users ?? 0}
                sub="unique visitors"
                icon={Users}
                loading={ga4Loading}
                accent="green"
              />
              <MetricCard
                title="Pageviews"
                value={ga4?.last7d.pageviews ?? 0}
                sub="pages viewed"
                icon={Eye}
                loading={ga4Loading}
                accent="purple"
              />
            </div>

            <p className="mb-2 text-xs text-muted-foreground">Last 30 days</p>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                title="Sessions"
                value={ga4?.last30d.sessions ?? 0}
                sub="visits"
                icon={TrendingUp}
                loading={ga4Loading}
                accent="blue"
              />
              <MetricCard
                title="Users"
                value={ga4?.last30d.users ?? 0}
                sub="unique visitors"
                icon={Users}
                loading={ga4Loading}
                accent="green"
              />
              <MetricCard
                title="Pageviews"
                value={ga4?.last30d.pageviews ?? 0}
                sub="pages viewed"
                icon={Eye}
                loading={ga4Loading}
                accent="purple"
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
