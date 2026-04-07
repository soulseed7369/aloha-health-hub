import { Link } from "react-router-dom";
import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
import { CenterCard } from "@/components/CenterCard";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomePractitioners, useHomeCenters } from "@/hooks/useFeaturedListings";
import { useArticles } from "@/hooks/useArticles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";


// 8 high-value concern chips — for visitors who know the outcome, not the modality
const BROWSE_CONCERNS: { label: string; emoji: string }[] = [
  { label: 'Anxiety',            emoji: '🌬️' },
  { label: 'Burnout',            emoji: '🔥' },
  { label: 'Chronic Pain',       emoji: '💙' },
  { label: 'Grief',              emoji: '🌿' },
  { label: 'Insomnia & Sleep',   emoji: '🌙' },
  { label: 'Overwhelm & Stress', emoji: '🌊' },
  { label: 'Trauma & PTSD',      emoji: '🕊️' },
  { label: 'Life Transitions',   emoji: '🌅' },
];

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
  'Fitness',
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
  heroImageUrl: string;      // full URL or local import path (fallback)
  /** Responsive hero images (WebP srcSet + sizes + fallback src) */
  heroImages?: { srcSet: string; sizes: string; src: string };
  heroTitle: string;
  heroSubtitle: string;
  pageTitle: string;
  pageDescription: string;
  faqItems?: Array<{ question: string; answer: string }>;
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

  // FAQ schema
  const faqSchema = config.faqItems && config.faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  } : null;

  const { data: practitioners, isLoading: loadingPractitioners, totalCount: practitionerCount, claimedCount } = useHomePractitioners(config.island);
  const { data: centers, isLoading: loadingCenters, totalCount: centerCount, claimedCount: centerClaimedCount } = useHomeCenters(config.island);
  const totalClaimedCount = claimedCount + centerClaimedCount;
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
  // The hook already filters to the right pool; shuffledTierSort randomizes within tiers
  const homePractitioners = shuffledTierSort(practitioners).slice(0, 4);
  const homeCenters = shuffledTierSort(centers).slice(0, 4);
  // Prefer an article with featured=true; fallback to the most recent article
  const featuredArticle = articles.find(a => a.featured) ?? articles[0] ?? null;

  // ── ItemList schema for practitioner listings ────────────────────────────
  const itemListSchema = practitionerCount > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${config.displayName} Wellness Practitioners`,
        url: `${SITE_URL}/${config.island === 'big_island' ? 'big-island' : config.island}`,
        numberOfItems: practitionerCount,
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
      {faqSchema && <JsonLd id="island-faq" data={faqSchema} />}
      {itemListSchema && <JsonLd id={`itemlist-${config.island}`} data={itemListSchema} />}
      <SearchBar
        island={config.island}
        heroImageUrl={config.heroImageUrl}
        heroImages={config.heroImages}
        heroTitle={config.heroTitle}
        heroSubtitle={config.heroSubtitle}
        trustBadge={undefined}
      />

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      {(practitionerCount > 0 || centerCount > 0) && (
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-6">
          <div className="container">
            <div className="mx-auto flex max-w-3xl items-center justify-evenly gap-4">
              {practitionerCount > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary md:text-3xl">{practitionerCount}</div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Practitioners</div>
                </div>
              )}
              <div className="h-8 w-px bg-border" aria-hidden="true" />
              {centerCount > 0 && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary md:text-3xl">{centerCount}</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wellness Centers</div>
                  </div>
                  <div className="h-8 w-px bg-border" aria-hidden="true" />
                </>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-primary md:text-3xl">44</div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wellness Modalities</div>
              </div>
              <div className="h-8 w-px bg-border" aria-hidden="true" />
              <div className="text-center">
                <div className="text-sm font-semibold text-foreground md:text-base">The {config.displayName}&apos;s Hub</div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">for Holistic Health</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Practitioners ────────────────────────────────────────────────── */}
      <section className="container py-12">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              {config.displayName} Practitioners
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hand-verified wellness professionals
            </p>
          </div>
          <Link
            to={`/directory?island=${config.island}`}
            className="flex-shrink-0 text-sm text-primary hover:underline"
          >
            View all {practitionerCount > 0 ? `${practitionerCount} ` : ""}→
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
              View all {centerCount > 0 ? `${centerCount} ` : ""}→
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

      {/* ── Mid-page provider pitch ──────────────────────────────────────── */}
      <section className="border-y border-border bg-primary/5 py-10">
        <div className="container">
          <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-primary">
            List your business
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Practitioners card */}
            <div className="flex flex-col justify-between gap-5 rounded-xl border border-border bg-background p-6">
              <div>
                <h2 className="mb-3 font-display text-xl font-bold">
                  Are you a practitioner?
                </h2>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-semibold">✓</span>
                    Free listing — up and running in minutes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-semibold">✓</span>
                    Premium from $29/mo · Featured from $49/mo
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-semibold">✓</span>
                    Direct contact — no commission or booking fees
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-1.5">
                <Link
                  to="/list-your-practice"
                  className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-opacity hover:opacity-90"
                >
                  List Your Practice — Free
                </Link>
                <p className="text-xs text-muted-foreground">No credit card required</p>
              </div>
            </div>

            {/* Centers card */}
            <div className="flex flex-col justify-between gap-5 rounded-xl border border-border bg-background p-6">
              <div>
                <h2 className="mb-3 font-display text-xl font-bold">
                  Do you run a wellness center?
                </h2>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-semibold">✓</span>
                    Free listing for spas, clinics &amp; retreat centers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-semibold">✓</span>
                    Premium from $49/mo · Featured from $79/mo
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-semibold">✓</span>
                    Showcase your team, events &amp; working hours
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-1.5">
                <Link
                  to="/list-your-practice"
                  className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-opacity hover:opacity-90"
                >
                  List Your Center — Free
                </Link>
                <p className="text-xs text-muted-foreground">No credit card required</p>
              </div>
            </div>
          </div>
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

      {/* ── Browse by Concern ────────────────────────────────────────────── */}
      <section className="border-t border-border bg-background py-10">
        <div className="container">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold md:text-2xl">
              Browse by what you&apos;re looking for
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Not sure which modality you need? Start with your goal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {BROWSE_CONCERNS.map(({ label, emoji }) => (
              <Link
                key={label}
                to={`/directory?q=${encodeURIComponent(label)}&island=${config.island}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </Link>
            ))}
          </div>
        </div>
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
          <p className="mt-5 text-sm text-muted-foreground">
            Not sure which modality is right for you?{" "}
            <Link
              to="/guides/wellness-modalities-hawaii"
              className="font-medium text-primary hover:underline"
            >
              Read the Complete Guide to Wellness Modalities in Hawaiʻi →
            </Link>
          </p>
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
            {/* Coming-soon islands — visible but not clickable */}
            {areasServed.filter(i => i.comingSoon).map(island => (
              <div
                key={island.slug}
                className="rounded-xl border border-border bg-muted/40 p-5"
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground/70">{island.label}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Coming Soon</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{island.description}</p>
              </div>
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
          {/* Trust signal — only show when 25+ providers have claimed listings */}
          {totalClaimedCount >= 25 && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-foreground/90">
              <span className="font-bold text-white">{totalClaimedCount}+</span> wellness providers have joined on {config.displayName}
            </div>
          )}
          <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
            Ready to reach {config.displayName} wellness seekers?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-primary-foreground/80">
            Whether you&apos;re an individual practitioner or run a wellness center — get listed free and connect directly with clients. No commission, no booking fees.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/list-your-practice"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-primary shadow transition-opacity hover:opacity-90"
            >
              Get Listed — Free
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
