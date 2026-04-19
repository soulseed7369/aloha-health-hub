import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
import { CenterCard } from "@/components/CenterCard";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useHomePractitioners, useHomeCenters } from "@/hooks/useFeaturedListings";
import { useArticles } from "@/hooks/useArticles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { supabase } from "@/lib/supabase";
import {
  Hand,
  Sparkles,
  Brain,
  Leaf,
  Activity,
  Sun,
  Apple,
  Moon,
  Heart,
  ChevronRight,
  Instagram,
} from "lucide-react";

// ── Island configuration for all-islands mode ───────────────────────────────
// `dbKey: 'all'` is a synthetic key meaning "no island filter" — used on the
// cross-island homepage. It's intentionally not a clickable card in the
// "Choose Your Island" section (filtered out below).
const ISLANDS = [
  {
    slug: "",
    dbKey: "all",
    label: "All Islands",
    description: "All four Hawaiian Islands",
  },
  {
    slug: "big-island",
    dbKey: "big_island",
    label: "Big Island",
    description: "Kona, Hilo, Waimea & more",
  },
  {
    slug: "maui",
    dbKey: "maui",
    label: "Maui",
    description: "Lahaina, Kihei, Makawao & more",
  },
  { slug: "oahu", dbKey: "oahu", label: "Oʻahu", description: "Honolulu, Kailua, Haleiwa & more" },
  {
    slug: "kauai",
    dbKey: "kauai",
    label: "Kauaʻi",
    description: "Līhuʻe, Kapaʻa, Hanalei & more",
  },
];

// ── Guide categories — links into the wellness modalities pillar guide anchors
const GUIDE_CATEGORIES: { id: string; label: string; Icon: typeof Hand }[] = [
  { id: "bodywork", label: "Bodywork", Icon: Hand },
  { id: "energy", label: "Energy", Icon: Sparkles },
  { id: "mind-nervous-system", label: "Mind & Nervous System", Icon: Brain },
  { id: "eastern", label: "Eastern Medicine", Icon: Leaf },
  { id: "movement", label: "Movement", Icon: Activity },
  { id: "hawaiian-nature", label: "Hawaiian & Nature", Icon: Sun },
  { id: "nutrition-longevity", label: "Nutrition & Longevity", Icon: Apple },
  { id: "life-soul", label: "Life & Soul", Icon: Moon },
  { id: "womens-health", label: "Women's Health", Icon: Heart },
];

// ── 8 high-value concern chips ──────────────────────────────────────────────
const BROWSE_CONCERNS: { label: string; emoji: string }[] = [
  { label: "Anxiety", emoji: "🌬️" },
  { label: "Burnout", emoji: "🔥" },
  { label: "Chronic Pain", emoji: "💙" },
  { label: "Grief", emoji: "🌿" },
  { label: "Insomnia & Sleep", emoji: "🌙" },
  { label: "Overwhelm & Stress", emoji: "🌊" },
  { label: "Trauma & PTSD", emoji: "🕊️" },
  { label: "Life Transitions", emoji: "🌅" },
];

// ── Top 20 modalities for "Browse by Modality" section ─────────────────────
const BROWSE_MODALITIES = [
  "Yoga",
  "Massage",
  "Reiki",
  "Acupuncture",
  "Breathwork",
  "Meditation",
  "Sound Healing",
  "Life Coaching",
  "Naturopathic",
  "Energy Healing",
  "Somatic Therapy",
  "Nutrition",
  "Fitness",
  "Functional Medicine",
  "Lomilomi / Hawaiian Healing",
  "Counseling",
  "Ayurveda",
  "Chiropractic",
  "Hypnotherapy",
  "Psychotherapy",
  "Physical Therapy",
];

// ── Card skeleton that matches the new fixed-height card ───────────────────
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

// ── Cheap count queries for aggregate stats bar ────────────────────────────
function useAllIslandsStats() {
  const practitionersCountQuery = useQuery<number>({
    queryKey: ["practitioners-count-all"],
    queryFn: async () => {
      if (!supabase) return 0;
      const { count, error } = await supabase
        .from("practitioners")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 10,
  });

  const centersCountQuery = useQuery<number>({
    queryKey: ["centers-count-all"],
    queryFn: async () => {
      if (!supabase) return 0;
      const { count, error } = await supabase
        .from("centers")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    practitionersCount: practitionersCountQuery.data ?? 0,
    centersCount: centersCountQuery.data ?? 0,
    isLoading: practitionersCountQuery.isLoading || centersCountQuery.isLoading,
  };
}

/** Sort items by tier (featured → premium → free), with random order within each tier group. */
function shuffledTierSort(items: Array<{ tier?: string; [key: string]: unknown }>): typeof items {
  function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
  }
  return [
    ...shuffle(items.filter((i) => i.tier === "featured")),
    ...shuffle(items.filter((i) => i.tier === "premium")),
    ...shuffle(items.filter((i) => !i.tier || i.tier === "free")),
  ];
}

export default function Home() {
  usePageMeta(
    "Hawaiʻi Wellness Directory — Holistic Health Practitioners Across All Islands",
    "Find holistic health practitioners and wellness centers across Oʻahu, Maui, the Big Island, and Kauaʻi. 44 modalities from Lomilomi to yoga."
  );

  // ── Island tab state — always defaults to 'all' on the homepage.
  // No localStorage restore here: the homepage is an all-islands entry point;
  // persisting a per-island preference would break the default for everyone.
  const [selectedIsland, setSelectedIsland] = useState<string>("all");

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const selectedIslandConfig = ISLANDS.find((i) => i.dbKey === selectedIsland) || ISLANDS[0];
  const { data: practitioners, isLoading: loadingPractitioners } =
    useHomePractitioners(selectedIsland);
  const { data: centers, isLoading: loadingCenters } = useHomeCenters(selectedIsland);
  const { data: articles = [] } = useArticles();
  const { practitionersCount, centersCount } = useAllIslandsStats();

  // ── Process data ────────────────────────────────────────────────────────────
  const homePractitioners = shuffledTierSort(practitioners).slice(0, 4);
  const homeCenters = shuffledTierSort(centers).slice(0, 4);
  const hasFeaturedPractitioners = practitioners.some((p) => p.tier === "featured");
  const hasFeaturedCenters = centers.some((c) => c.tier === "featured");
  const featuredArticle = articles.find((a) => a.featured) ?? articles[0] ?? null;

  // ── JSON-LD schema ──────────────────────────────────────────────────────────
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hawaiʻi Wellness",
    url: "https://www.hawaiiwellness.net/",
  };

  const handleIslandChange = (island: string) => {
    setSelectedIsland(island);
  };

  return (
    <main>
      <JsonLd id="website-schema" data={websiteSchema} />

      {/* ── 1. SearchBar + Hero ──────────────────────────────────────────────── */}
      <SearchBar
        island="all"
        heroTitle="Hawaiʻi's Wellness Directory"
        heroSubtitle="Find holistic health practitioners and wellness centers across all four Hawaiian Islands."
        heroImageUrl="/all_islands_hero.webp"
        heroImages={{
          srcSet:
            "/all_islands_hero-640w.webp 640w, /all_islands_hero-1024w.webp 1024w, /all_islands_hero-1920w.webp 1920w, /all_islands_hero.webp 2560w",
          sizes: "100vw",
          src: "/all_islands_hero.webp",
        }}
      />

      {/* ── 2. Aggregate Stats Bar ───────────────────────────────────────────── */}
      {(practitionersCount > 0 || centersCount > 0) && (
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-6">
          <div className="container">
            <div className="mx-auto flex max-w-3xl items-center justify-evenly gap-4">
              {practitionersCount > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary md:text-3xl">{practitionersCount}</div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Practitioners
                  </div>
                </div>
              )}
              {practitionersCount > 0 && centersCount > 0 && (
                <div className="h-8 w-px bg-border" aria-hidden="true" />
              )}
              {centersCount > 0 && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary md:text-3xl">{centersCount}</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Wellness Centers
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" aria-hidden="true" />
                </>
              )}
              <Link
                to="/guides/wellness-modalities-hawaii"
                className="group text-center transition-opacity hover:opacity-80"
                aria-label="Read the complete guide to 44 wellness modalities in Hawaiʻi"
              >
                <div className="text-2xl font-bold text-primary md:text-3xl group-hover:underline">
                  44
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground group-hover:text-primary">
                  Wellness Modalities
                </div>
              </Link>
              <div className="h-8 w-px bg-border" aria-hidden="true" />
              <div className="text-center">
                <div className="text-sm font-semibold text-foreground md:text-base">4 Islands</div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  All of Hawaiʻi
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Island Selector — "Choose Your Island" ───────────────────────── */}
      <section className="border-b border-border bg-background py-12">
        <div className="container">
          <h2 className="mb-8 font-display text-2xl font-bold md:text-3xl">
            Choose Your Island
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ISLANDS.filter(i => i.dbKey !== 'all').map(({ slug, dbKey, label, description }) => (
              <Link
                key={dbKey}
                to={`/${slug}`}
                className="group rounded-xl border border-border bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
              >
                <h3 className="font-display text-xl font-bold text-foreground">{label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                  Explore <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Guide Band — "Not sure where to start?" ────────────────────────── */}
      <section className="border-b border-border/60 bg-background py-8">
        <div className="container">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground sm:text-xl">
                Not sure where to start?
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Explore 44 wellness modalities by category — and find practitioners who offer them.
              </p>
            </div>
            <Link
              to="/guides/wellness-modalities-hawaii"
              className="text-xs font-medium text-primary hover:underline sm:text-sm"
            >
              Read the full guide →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
            {GUIDE_CATEGORIES.map(({ id, label, Icon }) => (
              <Link
                key={id}
                to={`/guides/wellness-modalities-hawaii#${id}`}
                className="group flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
              >
                <Icon className="h-4 w-4 text-primary transition-colors group-hover:text-primary" strokeWidth={1.5} />
                <span className="text-[10.5px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-[11px]">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Featured Practitioners — Island Tabs ──────────────────────────── */}
      {/* FUTURE: Homepage Spotlight */}
      <section className="container py-12">
        <div className="mb-6">
          <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
            Featured Practitioners
          </h2>
          <p className="text-sm text-muted-foreground">
            Hand-verified wellness professionals across Hawaiʻi
          </p>
        </div>

        {/* Island tab strip */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {ISLANDS.map(({ dbKey, label }) => {
            const isActive = selectedIsland === dbKey;
            return (
              <button
                key={dbKey}
                type="button"
                onClick={() => handleIslandChange(dbKey)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Practitioners grid */}
        {loadingPractitioners ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : homePractitioners.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {homePractitioners.map((practitioner) => (
              <ProviderCard
                key={practitioner.id}
                provider={practitioner}
                showIslandBadge={selectedIsland === 'all'}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            No practitioners listed yet for {selectedIslandConfig.label}.
          </p>
        )}

        {/* Get Featured CTA if no featured listings */}
        {!loadingPractitioners && !hasFeaturedPractitioners && homePractitioners.length > 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Want to appear here?{" "}
            <Link to="/list-your-practice" className="font-medium text-primary hover:underline">
              Get Featured →
            </Link>
          </p>
        )}

        {/* View all link */}
        {homePractitioners.length > 0 && (
          <div className="mt-6 flex justify-center">
            <Link
              to={`/directory?island=${selectedIsland}`}
              className="text-sm text-primary hover:underline"
            >
              View all practitioners →
            </Link>
          </div>
        )}
      </section>

      {/* ── 6. Featured Centers — Island Tabs (synced with practitioners) ──── */}
      <section className="bg-secondary/30 py-12">
        <div className="container">
          <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">
            {selectedIsland === 'all' ? 'Wellness Centers' : `${selectedIslandConfig.label} Wellness Centers`}
          </h2>

          {/* Centers grid */}
          {loadingCenters ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : homeCenters.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {homeCenters.map((center) => (
                <CenterCard
                  key={center.id}
                  center={center}
                  showIslandBadge={selectedIsland === 'all'}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">
              No wellness centers listed yet for {selectedIslandConfig.label}.
            </p>
          )}

          {/* Get Featured CTA if no featured listings */}
          {!loadingCenters && !hasFeaturedCenters && homeCenters.length > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Want to appear here?{" "}
              <Link to="/list-your-practice" className="font-medium text-primary hover:underline">
                Get Featured →
              </Link>
            </p>
          )}

          {/* View all link */}
          {homeCenters.length > 0 && (
            <div className="mt-6 flex justify-center">
              <Link
                to={`/directory?island=${selectedIsland}`}
                className="text-sm text-primary hover:underline"
              >
                View all wellness centers →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 7. Provider Pitch ─────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-primary/5 py-10">
        <div className="container">
          <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-primary">
            List your business
          </p>
          <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
            Reach wellness seekers across Hawaiʻi
          </h2>
          <p className="mb-6 max-w-2xl text-base text-muted-foreground">
            Whether you're a practitioner or wellness center, list your business free and start receiving client inquiries today.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Practitioners card */}
            <div className="flex flex-col justify-between gap-5 rounded-xl border border-border bg-background p-6">
              <div>
                <h3 className="mb-3 font-display text-xl font-bold">
                  Are you a practitioner?
                </h3>
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
                <h3 className="mb-3 font-display text-xl font-bold">
                  Do you run a wellness center?
                </h3>
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

      {/* ── 8. Featured Article ───────────────────────────────────────────────── */}
      {featuredArticle && (
        <section className="container py-12">
          <h2 className="mb-8 font-display text-2xl font-bold md:text-3xl">
            Featured Article
          </h2>
          <ArticleCard article={featuredArticle} featured={true} />
        </section>
      )}

      {/* ── 9. Browse by Concern ────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-background py-12">
        <div className="container">
          <h2 className="mb-2 font-display text-2xl font-bold md:text-3xl">
            Browse by Concern
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Not sure about the modality? Search by what you're dealing with.
          </p>
          <div className="flex flex-wrap gap-2">
            {BROWSE_CONCERNS.map(({ label, emoji }) => (
              <Link
                key={label}
                to={`/directory?q=${encodeURIComponent(label)}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <span>{emoji}</span>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Browse by Modality ─────────────────────────────────────────────── */}
      <section className="container py-12">
        <h2 className="mb-2 font-display text-2xl font-bold md:text-3xl">
          Browse by Modality
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Explore practitioners and centers by wellness modality.
        </p>
        <div className="flex flex-wrap gap-2">
          {BROWSE_MODALITIES.map((label) => (
            <Link
              key={label}
              to={`/directory?modality=${encodeURIComponent(label)}`}
              className="inline-flex rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            to="/guides/wellness-modalities-hawaii"
            className="text-sm font-medium text-primary hover:underline"
          >
            Explore all 44 modalities →
          </Link>
        </div>
      </section>

      {/* ── 11. Final CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-primary py-14 text-primary-foreground">
        <div className="container">
          <h2 className="mb-2 font-display text-3xl font-bold md:text-4xl">
            Ready to reach Hawaiʻi's wellness seekers?
          </h2>
          {practitionersCount >= 25 && (
            <p className="mb-6 text-base text-primary-foreground/90">
              Join {practitionersCount}+ wellness professionals listed on Hawaiʻi Wellness.
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <Link to="/list-your-practice">
              <Button variant="secondary" size="lg">
                Get Listed — Free
              </Button>
            </Link>
            <Link to="/directory">
              <Button size="lg" className="rounded-lg border border-white/40 bg-white/10 px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-white/20">
                Browse Directory
              </Button>
            </Link>
          </div>
          <a
            href="https://www.instagram.com/hawaii.wellness"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
          >
            <Instagram className="h-4 w-4" />
            Follow us @hawaii.wellness
          </a>
        </div>
      </section>
    </main>
  );
}
