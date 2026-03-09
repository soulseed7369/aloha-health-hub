import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
import { CenterCard } from "@/components/CenterCard";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { usePractitioners } from "@/hooks/usePractitioners";
import { useCenters } from "@/hooks/useCenters";
import { useArticles } from "@/hooks/useArticles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteConfig";

const TOP_N_MODALITIES = 8;

const OTHER_ISLANDS = [
  { slug: "big-island", label: "Hawaiʻi Island (Big Island)", description: "Kona, Hilo, Waimea & more" },
  { slug: "maui",       label: "Maui",                        description: "Lahaina, Kihei, Makawao & more" },
  { slug: "oahu",       label: "Oʻahu",                       description: "Honolulu, Kailua, Haleʻiwa & more" },
  { slug: "kauai",      label: "Kauaʻi",                      description: "Lihue, Kapaa, Hanalei & more" },
];

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

export function IslandHome({ config }: IslandHomeProps) {
  usePageMeta(config.pageTitle, config.pageDescription);

  const { data: practitioners = [], isLoading: loadingPractitioners } = usePractitioners(config.island);
  const { data: centers = [], isLoading: loadingCenters } = useCenters(config.island);
  const { data: articles = [], isLoading: loadingArticles } = useArticles();

  const articleCardData = articles.slice(0, 3);

  // ── Top modalities by frequency across practitioners + centers ───────────
  const popularModalities = useMemo(() => {
    const counts = new Map<string, number>();
    const allModalities = [
      ...practitioners.flatMap(p => p.modalities ?? []),
      ...centers.flatMap(c => c.modalities ?? []),
    ];
    for (const m of allModalities) {
      if (m?.trim()) counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N_MODALITIES)
      .map(([label]) => label);
  }, [practitioners, centers]);

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

      {/* Modality quick-filter bubbles — sticky below header */}
      <div className="sticky top-16 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
          <span className="flex-shrink-0 text-xs font-medium text-muted-foreground">Browse:</span>
          {loadingPractitioners || loadingCenters ? (
            // Skeleton pills while data loads
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 flex-shrink-0 rounded-full" />
            ))
          ) : (
            popularModalities.map((label) => (
              <Link
                key={label}
                to={`/directory?modality=${encodeURIComponent(label)}&island=${config.island}`}
                className="flex-shrink-0 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                {label}
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Practitioners */}
      <section className="container py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            {config.displayName} Practitioners
          </h2>
          <Link to={`/directory?island=${config.island}`} className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="px-10 sm:px-12">
          {loadingPractitioners ? (
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-56 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          ) : practitioners.length > 0 ? (
            <Carousel opts={{ align: "start", loop: true }}>
              <CarouselContent>
                {practitioners.map((practitioner) => (
                  <CarouselItem key={practitioner.id} className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <ProviderCard provider={practitioner} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="h-10 w-10" />
              <CarouselNext className="h-10 w-10" />
            </Carousel>
          ) : (
            <p className="text-muted-foreground text-sm py-8">No practitioners listed yet for {config.displayName}.</p>
          )}
        </div>
      </section>

      {/* Centers */}
      <section className="bg-secondary/30 py-12">
        <div className="container">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              {config.displayName} Wellness Centers
            </h2>
            <Link to={`/directory?island=${config.island}`} className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="px-10 sm:px-12">
            {loadingCenters ? (
              <div className="flex gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-64 flex-shrink-0 rounded-xl" />
                ))}
              </div>
            ) : centers.length > 0 ? (
              <Carousel opts={{ align: "start", loop: true }}>
                <CarouselContent>
                  {centers.map((center) => (
                    <CarouselItem key={center.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                      <CenterCard center={center} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="h-10 w-10" />
                <CarouselNext className="h-10 w-10" />
              </Carousel>
            ) : (
              <p className="text-muted-foreground text-sm py-8">No wellness centers listed yet for {config.displayName}.</p>
            )}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="container py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Latest Wellness Articles
          </h2>
          <Link to="/articles" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="px-10 sm:px-12">
          {loadingArticles ? (
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-64 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          ) : articleCardData.length > 0 ? (
            <Carousel opts={{ align: "start" }}>
              <CarouselContent>
                {articleCardData.map((article) => (
                  <CarouselItem key={article.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                    <ArticleCard article={article} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="h-10 w-10" />
              <CarouselNext className="h-10 w-10" />
            </Carousel>
          ) : (
            <p className="text-muted-foreground text-sm py-8">No articles yet.</p>
          )}
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
            {/* Other islands */}
            {areasServed.map(island => (
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
