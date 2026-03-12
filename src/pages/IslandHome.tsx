import { Link } from "react-router-dom";
import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
import { CenterCard } from "@/components/CenterCard";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { usePractitioners } from "@/hooks/usePractitioners";
import { useCenters } from "@/hooks/useCenters";
import { useArticles } from "@/hooks/useArticles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";


// Top 20 modalities — shown as browse chips below the featured article
const BROWSE_MODALITIES = [
  'Yoga',
  'Massage',
  'Reiki',
  'Acupuncture',
  'Breathwork',
  'Meditation',
  'Sound Healing',
  'Life Coaching',
  'Naturopathic',
  'Energy Healing',
  'Somatic Therapy',
  'Nutrition',
  'Functional Medicine',
  'Lomilomi / Hawaiian Healing',
  'Counseling',
  'Ayurveda',
  'Chiropractic',
  'Hypnotherapy',
  'Psychotherapy',
  'Physical Therapy',
];

const OTHER_ISLANDS = [
  { slug: "big-island", label: "Big Island",  description: "Kona, Hilo, Waimea & more",       comingSoon: false },
  { slug: "maui",       label: "Maui",        description: "Lahaina, Kihei, Makawao & more",   comingSoon: true  },
  { slug: "oahu",       label: "Oahu",        description: "Honolulu, Kailua, Haleiwa & more", comingSoon: true  },
  { slug: "kauai",      label: "Kauai",       description: "Lihue, Kapaa, Hanalei & more",     comingSoon: true  },
];

/** Sort items by tier (featured → premium → free), with random order within each tier group. */
function shuffledTierSort(items: Array<{ tier?: string; [key: string]: unknown }>): typeof items {
  function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
  return [
    ...shuffle(items.filter(i => i.tier === 'featured')),
    ...shuffle(items.filter(i => i.tier === 'premium')),
    ...shuffle(items.filter(i => !i.tier || i.tier === 'free')),
  ];
}

export interface IslandConfig {
  island: string;            // DB key: 'big_island' | 'maui' | 'oahu' | 'kauai'
  displayName: string;       // e.g. 'Maui'
  heroImageUrl: string;      // full URL or local import path
  heroTitle: string;
  heroSubtitle: string;
  pageTitle: string;
  pageDescription: string;
}

interface IslandHomeProps {
  config: IslandConfig;
}

// ── Card skeleton that matches the new fixed-height card ─────────────────────
function CardSkeleton() {
  return (
    <div className="flex h-80 flex-col overflow-hidden rounded-xl border border-border bg-card p-4">
      <div className="flex justify-center pt-1 pb-3">
        <Skeleton className="h-20 w-20 rounded-full" />
      </div>
      <Skeleton className="mx-auto mb-1.5 h-4 w-32 rounded" />
      <Skeleton className="mx-auto mb-1.5 h-3 w-24 rounded" />
      <Skeleton className="mx-auto mb-3 h-3 w-20 rounded" />
      <Skeleton className="mx-auto mb-2 h-3 w-full rounded" />
      <Skeleton className="mx-auto mb-4 h-3 w-5/6 rounded" />
      <div className="mt-auto">
        <Skeleton className="h-7 w-full rounded-md" />
      </div>
    </div>
  );
}

export function IslandHome({ config }: IslandHomeProps) {
  usePageMeta(config.pageTitle, config.pageDescription);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistState, setWaitlistState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const { data: practitioners = [], isLoading: loadingPractitioners } = usePractitioners(config.island);
  const { data: centers = [], isLoading: loadingCenters } = useCenters(config.island);
  const { data: articles = [], isLoading: loadingArticles } = useArticles();

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistState('loading');
    try {
      if (supabase) {
        await supabase.from('island_waitlist').upsert({ email: waitlistEmail.trim(), island: config.island }, { onConflict: 'email' });
      }
      setWaitlistState('done');
    } catch {
      setWaitlistState('error');
    }
  };

  // Tier-grouped random order: featured first, then premium, then free (each group shuffled)
  const homePractitioners = shuffledTierSort(practitioners).slice(0, 4);
  const homeCenters = shuffledTierSort(centers).slice(0, 4);
  // Prefer an article with featured=true; fallback to the most recent article
  const featuredArticle = articles.find(a => a.featured) ?? articles[0] ?? null;

  // ── ItemList schema for practitioner listings ────────────────────────────
  const itemListSchema = practitioners.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${config.displayName} Wellness Practitioners`,
        url: `${SITE_URL}/${config.island === 'big_island' ? 'big-island' : config.island}`,
        numberOfItems: practitioners.length,
        itemListElement: practitioners.slice(0, 10).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/profile/${p.id}`,
          name: p.name,
        })),
      }
    : null;

  // Islands to display in "Areas Served" (exclude current island)
  const areasServed = OTHER_ISLANDS.filter(i => {
    const thisSlug = config.island === 'big_island' ? 'big-island' : config.island;
    return i.slug !== thisSlug;
  });

  return (
    <main>
      {itemListSchema && <JsonLd id={`itemlist-${config.island}`} data={itemListSchema} />}
      <SearchBar island={config.island} heroImageUrl={config.heroImageUrl} heroTitle={config.heroTitle} heroSubtitle={config.heroSubtitle} />

      {/* ── Trust / Stats bar ────────────────────────────────────────────── */}
      {(practitioners.length > 0 || centers.length > 0) && (
        <div className="border-b border-border bg-muted/30 py-2.5">
          <div className="container flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {practitioners.length > 0 && (
              <span><strong className="font-semibold text-foreground">{practitioners.length}</strong> Practitioners</span>
            )}
            {centers.length > 0 && (
              <span className="flex items-center gap-2">
                <span aria-hidden="true">·</span>
                <strong className="font-semibold text-foreground">{centers.length}</strong> Wellness Centers
              </span>
            )}
            <span className="flex items-center gap-2">
              <span aria-hidden="true">·</span>
              <strong className="font-semibold text-foreground">34</strong> Specialties
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true">·</span>
              The {config.displayName}&apos;s Hub for Holistic Health
            </span>
          </div>
        </div>
      )}

      {/* ── Practitioners ────────────────────────────────────────────────── */}
      <section className="container py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            {config.displayName} Practitioners
          </h2>
          <Link
            to={`/directory?island=${config.island}`}
            className="text-sm text-primary hover:underline"
          >
            View all {practitioners.length > 0 ? `${practitioners.length} ` : ""}→
          </Link>
        </div>

        {loadingPractitioners ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : homePractitioners.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {homePractitioners.map((practitioner) => (
              <ProviderCard key={practitioner.id} provider={practitioner} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            No practitioners listed yet for {config.displayName}.
          </p>
        )}
      </section>

      {/* ── Wellness Centers ─────────────────────────────────────────────── */}
      <section className="bg-secondary/30 py-12">
        <div className="container">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              {config.displayName} Wellness Centers
            </h2>
            <Link
              to={`/directory?island=${config.island}`}
              className="text-sm text-primary hover:underline"
            >
              View all {centers.length > 0 ? `${centers.length} ` : ""}→
            </Link>
          </div>

          {loadingCenters ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : homeCenters.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {homeCenters.map((center) => (
                <CenterCard key={center.id} center={center} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">
              No wellness centers listed yet for {config.displayName}.
            </p>
          )}
        </div>
      </section>

      {/* ── Featured Article ─────────────────────────────────────────────── */}
      <section className="container py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            From the Wellness Blog
          </h2>
          <Link to="/articles" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        {loadingArticles ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : featuredArticle ? (
          <ArticleCard article={featuredArticle} featured />
        ) : (
          <p className="py-8 text-sm text-muted-foreground">No articles yet.</p>
        )}
      </section>

      {/* ── Browse by Modality ───────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/20 py-10">
        <div className="container">
          <h2 className="mb-5 font-display text-xl font-bold md:text-2xl">Browse by Modality</h2>
          <div className="flex flex-wrap gap-2">
            {BROWSE_MODALITIES.map((label) => (
              <Link
                key={label}
                to={`/directory?q=${encodeURIComponent(label)}&island=${config.island}`}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Areas Served ──────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/20 py-12" aria-label="Areas served">
        <div className="container">
          <h2 className="mb-2 font-display text-2xl font-bold md:text-3xl">
            Wellness Across Hawaiʻi
          </h2>
          <p className="mb-8 text-muted-foreground">
            Hawaiʻi Wellness covers practitioners and centers on every island.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Current island — highlighted */}
            <Link
              to={`/${config.island === 'big_island' ? 'big-island' : config.island}`}
              className="rounded-xl border-2 border-primary bg-primary/5 p-5 transition-colors hover:bg-primary/10"
            >
              <p className="font-semibold text-primary">{config.displayName} <span className="ml-1 text-xs font-normal text-primary/70">— you are here</span></p>
              <p className="mt-1 text-sm text-muted-foreground">Browse all practitioners &amp; centers</p>
            </Link>
            {/* Live islands */}
            {areasServed.filter(i => !i.comingSoon).map(island => (
              <Link
                key={island.slug}
                to={`/${island.slug}`}
                className="rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <p className="font-semibold">{island.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{island.description}</p>
              </Link>
            ))}
            {/* Full directory link */}
            <Link
              to="/directory"
              className="rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <p className="font-semibold">All Islands Directory</p>
              <p className="mt-1 text-sm text-muted-foreground">Search across the entire state</p>
            </Link>
          </div>

          {/* Coming-soon email capture — replaces greyed-out tiles */}
          <div className="mt-6 rounded-xl border border-border bg-background px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Maui · Oahu · Kauai</span> directories launching soon —
                get notified when your island goes live.
              </p>
              {waitlistState === 'done' ? (
                <p className="text-sm font-medium text-green-600 flex-shrink-0">✓ You&apos;re on the list!</p>
              ) : (
                <form onSubmit={handleWaitlist} className="flex gap-2 flex-shrink-0">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    className="h-9 w-48 text-sm"
                    required
                  />
                  <Button type="submit" size="sm" className="h-9" disabled={waitlistState === 'loading'}>
                    {waitlistState === 'loading' ? '…' : 'Notify me'}
                  </Button>
                </form>
              )}
            </div>
            {waitlistState === 'error' && (
              <p className="mt-2 text-xs text-destructive">Something went wrong — please try again.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── List Your Practice CTA ─────────────────────────────────────────── */}
      <section className="bg-primary py-14 text-primary-foreground" aria-label="List your practice">
        <div className="container text-center">
          {/* Trust signal */}
          {practitioners.length > 0 && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-foreground/90">
              <span className="font-bold text-white">{practitioners.length}+</span> practitioners already listed on {config.displayName}
            </div>
          )}
          <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
            Are you a {config.displayName} wellness practitioner?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-primary-foreground/80">
            Join the growing community of holistic health providers on Hawaiʻi Wellness.
            Free to list — upgrade anytime for premium visibility.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/list-your-practice"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-primary shadow transition-opacity hover:opacity-90"
            >
              List Your Practice — Free
            </Link>
            <Link
              to="/directory"
              className="rounded-lg border border-white/40 px-8 py-3 font-medium text-primary-foreground/90 transition-colors hover:bg-white/10"
            >
              Browse {config.displayName} Directory
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
