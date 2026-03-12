import { Link } from "react-router-dom";
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

  const { data: practitioners = [], isLoading: loadingPractitioners } = usePractitioners(config.island);
  const { data: centers = [], isLoading: loadingCenters } = useCenters(config.island);
  const { data: articles = [], isLoading: loadingArticles } = useArticles();

  // Tier-grouped random order: featured first, then premium, then free (each group shuffled)
  const homePractitioners = shuffledTierSort(practitioners).slice(0, 4);
  const homeCenters = shuffledTierSort(centers).slice(0, 4);
  const articleCardData = articles.slice(0, 3);

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

      {/* ── Practitioners ────────────────────────────────────────────────── */}
      <section className="container py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Featured {config.displayName} Practitioners
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
              Featured {config.displayName} Wellness Centers
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

      {/* ── Latest Articles ──────────────────────────────────────────────── */}
      <section className="container py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Latest Wellness Articles
          </h2>
          <Link to="/articles" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        {loadingArticles ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : articleCardData.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articleCardData.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">No articles yet.</p>
        )}
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
            {/* Other islands */}
            {areasServed.map(island => (
              island.comingSoon ? (
                <div
                  key={island.slug}
                  className="rounded-xl border border-border bg-background p-5 opacity-60 cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{island.label}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Coming Soon
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{island.description}</p>
                </div>
              ) : (
                <Link
                  key={island.slug}
                  to={`/${island.slug}`}
                  className="rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <p className="font-semibold">{island.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{island.description}</p>
                </Link>
              )
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
