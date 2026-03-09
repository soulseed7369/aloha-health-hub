import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProviderCard } from "@/components/ProviderCard";
import { CenterCard } from "@/components/CenterCard";
import { DirectoryMap } from "@/components/DirectoryMap";
import { Skeleton } from "@/components/ui/skeleton";
import { usePractitioners } from "@/hooks/usePractitioners";
import { useCenters, useCentersAsProviders } from "@/hooks/useCenters";
import type { Provider, Center } from "@/data/mockData";
import { Map, Search, SlidersHorizontal, X } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

type DirectoryTab = "practitioners" | "centers";

// ── Canonical modalities (subset shown in filter) ─────────────────────────────
const FILTER_MODALITIES = [
  "Acupuncture", "Art Therapy", "Ayurveda", "Breathwork", "Chiropractic", "Counseling",
  "Energy Healing", "Family Constellation", "Functional Medicine", "Herbalism", "Hypnotherapy",
  "IV Therapy", "Life Coaching", "Lomilomi / Hawaiian Healing", "Longevity", "Massage", "Meditation",
  "Nature Therapy", "Naturopathic", "Nutrition", "Physical Therapy",
  "Psychic", "Psychotherapy", "Reiki", "Somatic Therapy", "Sound Healing",
  "TCM (Traditional Chinese Medicine)", "Trauma-Informed Care", "Yoga",
];

// ── Island / city lookup for smart search ─────────────────────────────────────

const TOWN_TO_ISLAND: Record<string, string> = {};

const ISLAND_TOWNS: Record<string, string[]> = {
  big_island: [
    'hilo', 'kailua-kona', 'kona', 'waimea', 'captain cook', 'pahoa', 'holualoa',
    'hawi', 'honokaa', 'volcano', 'waikoloa', 'keaau', 'ocean view', 'kapaau',
    'kawaihae', 'na alehu', 'milolii', 'napoopoo', 'kealakekua', 'kamuela',
  ],
  oahu: [
    'honolulu', 'waikiki', 'kailua', 'kaneohe', 'pearl city', 'aiea', 'mililani',
    'kapolei', 'ewa beach', 'haleiwa', 'waipahu', 'hawaii kai', 'manoa', 'nuuanu',
  ],
  maui: [
    'lahaina', 'kihei', 'wailea', 'kahului', 'wailuku', 'hana', 'makawao', 'paia',
    'haiku', 'kula', 'upcountry', 'pukalani', 'napili', 'kapalua', 'kaanapali',
    'lanai city',
  ],
  kauai: [
    'lihue', 'kapaa', 'hanalei', 'princeville', 'poipu', 'koloa', 'hanapepe',
    'waimea', 'eleele', 'kalaheo', 'lawai', 'anahola', 'kilauea', 'haena',
  ],
  molokai: ['kaunakakai', 'hoolehua', 'maunaloa', 'kualapuu', 'halawa', 'pukoo'],
};

const ISLAND_CITIES: Record<string, string[]> = {
  big_island: ['Kailua-Kona', 'Hilo', 'Waimea', 'Pahoa', 'Captain Cook', 'Keaau', 'Holualoa', 'Volcano', 'Waikoloa', 'Hawi', 'Honokaa', 'Ocean View'],
  oahu: ['Honolulu', 'Waikiki', 'Kailua', 'Kaneohe', 'Pearl City', 'Kapolei', 'Haleiwa', 'Mililani', 'Hawaii Kai', 'Manoa'],
  maui: ['Lahaina', 'Kihei', 'Wailea', 'Kahului', 'Wailuku', 'Makawao', 'Paia', 'Haiku', 'Kula', 'Hana'],
  kauai: ['Lihue', 'Kapaa', 'Hanalei', 'Princeville', 'Poipu', 'Koloa', 'Hanapepe', 'Waimea', 'Kilauea'],
  molokai: ['Kaunakakai'],
};

for (const [isl, towns] of Object.entries(ISLAND_TOWNS)) {
  for (const town of towns) {
    TOWN_TO_ISLAND[town] = isl;
  }
}

function detectIslandFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bbig island\b/.test(lower)) return 'big_island';
  if (/\boahu\b/.test(lower)) return 'oahu';
  if (/\bmaui\b/.test(lower)) return 'maui';
  if (/\bkauai\b/.test(lower)) return 'kauai';
  if (/\bmolokai\b/.test(lower)) return 'molokai';
  for (const [town, isl] of Object.entries(TOWN_TO_ISLAND)) {
    if (lower.includes(town)) return isl;
  }
  return null;
}

const ISLANDS = [
  { value: 'all', label: 'All Islands' },
  { value: 'big_island', label: 'Big Island' },
  { value: 'oahu', label: "Oʻahu" },
  { value: 'maui', label: 'Maui' },
  { value: 'kauai', label: "Kauaʻi" },
  { value: 'molokai', label: "Molokaʻi" },
];

// ── Smart filter with stemming ────────────────────────────────────────────────

function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('tion')) return word.slice(0, -4);
  if (word.endsWith('ation')) return word.slice(0, -5);
  if (word.endsWith('er')) return word.slice(0, -2);
  if (word.endsWith('ors')) return word.slice(0, -3);
  if (word.endsWith('or')) return word.slice(0, -2);
  if (word.endsWith('ist')) return word.slice(0, -3);
  if (word.endsWith('ists')) return word.slice(0, -4);
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 4) return word.slice(0, -1);
  return word;
}

function tokenMatch(target: string, queryToken: string): boolean {
  const targetLower = target.toLowerCase();
  const tokenLower = queryToken.toLowerCase();
  if (targetLower.includes(tokenLower)) return true;
  const stemmedToken = stem(tokenLower);
  if (stemmedToken.length >= 3) {
    const targetWords = targetLower.split(/[\s,\-\/]+/);
    return targetWords.some(w => w.startsWith(stemmedToken) || stem(w).startsWith(stemmedToken));
  }
  return false;
}

function smartFilter(target: string, query: string): boolean {
  if (!query.trim()) return true;
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return true;
  return tokens.every(token => tokenMatch(target, token));
}

function filterProviders(
  items: Provider[],
  query: string,
  modality: string,
  sessionType: string,
  acceptsClients: boolean,
): Provider[] {
  return items.filter(p => {
    if (!smartFilter(`${p.name} ${p.modality} ${p.location || ''}`, query)) return false;
    if (modality) {
      const allMods = (p.modalities ?? [p.modality]).join(' ').toLowerCase();
      if (!allMods.includes(modality.toLowerCase())) return false;
    }
    if (sessionType && p.sessionType && p.sessionType !== sessionType && sessionType !== 'both') {
      // Only filter if sessionType is set on the record
      if (p.sessionType !== 'both') return false;
    }
    if (acceptsClients && p.acceptsNewClients !== true) return false;
    return true;
  });
}

function filterCenters(items: Center[], query: string, modality: string): Center[] {
  return items.filter(c => {
    if (!smartFilter(`${c.name} ${c.modality} ${c.location || ''}`, query)) return false;
    if (modality) {
      const allMods = (c.modalities ?? [c.modality]).join(' ').toLowerCase();
      if (!allMods.includes(modality.toLowerCase())) return false;
    }
    return true;
  });
}

// ── Filter panel UI ───────────────────────────────────────────────────────────

interface FilterPanelProps {
  island: string;
  modality: string;
  city: string;
  sessionType: string;
  acceptsClients: boolean;
  tab: DirectoryTab;
  onModality: (v: string) => void;
  onCity: (v: string) => void;
  onSessionType: (v: string) => void;
  onAcceptsClients: (v: boolean) => void;
  onClear: () => void;
  activeCount: number;
}

function FilterPanel({
  island, modality, city, sessionType, acceptsClients, tab,
  onModality, onCity, onSessionType, onAcceptsClients, onClear, activeCount
}: FilterPanelProps) {
  const cities = island !== 'all' ? (ISLAND_CITIES[island] ?? []) : [];

  return (
    <div className="space-y-5">
      {activeCount > 0 && (
        <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
          Clear all filters
        </button>
      )}

      {/* Modality */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modality</Label>
        <Select value={modality || "_all"} onValueChange={v => onModality(v === "_all" ? "" : v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Any modality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Any modality</SelectItem>
            {FILTER_MODALITIES.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City */}
      {cities.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label>
          <Select value={city || "_all"} onValueChange={v => onCity(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Any city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Any city</SelectItem>
              {cities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Session type (practitioners only) */}
      {tab === 'practitioners' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session Type</Label>
          <div className="flex flex-col gap-1.5">
            {[
              { value: '', label: 'Any' },
              { value: 'in_person', label: 'In Person' },
              { value: 'online', label: 'Online' },
              { value: 'both', label: 'Both' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="sessionType"
                  value={opt.value}
                  checked={sessionType === opt.value}
                  onChange={() => onSessionType(opt.value)}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Accepting clients (practitioners only) */}
      {tab === 'practitioners' && (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="acceptsClients" className="text-sm cursor-pointer">
            Accepting new clients
          </Label>
          <Switch
            id="acceptsClients"
            checked={acceptsClients}
            onCheckedChange={onAcceptsClients}
          />
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const Directory = () => {
  usePageMeta("Find Practitioners & Wellness Centers", "Browse certified practitioners, holistic health centers, and spas across the islands of Hawaiʻi. Filter by modality, location, and more.");

  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get('q') || '';
  const urlLocation = searchParams.get('location') || '';
  const urlIsland = searchParams.get('island') || 'big_island';
  const urlModality = searchParams.get('modality') || '';
  const urlCity = searchParams.get('city') || '';
  const urlSessionType = searchParams.get('sessionType') || '';
  const urlAcceptsClients = searchParams.get('acceptsClients') === '1';

  const detectedIsland = useMemo(() => {
    const combined = `${urlLocation} ${urlQ}`;
    return detectIslandFromText(combined);
  }, [urlLocation, urlQ]);

  const [tab, setTab] = useState<DirectoryTab>("practitioners");
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlQ);
  const [island, setIsland] = useState(detectedIsland || urlIsland);
  const [modality, setModality] = useState(urlModality);
  const [city, setCity] = useState(urlCity);
  const [sessionType, setSessionType] = useState(urlSessionType);
  const [acceptsClients, setAcceptsClients] = useState(urlAcceptsClients);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Sync island from smart detection
  useEffect(() => {
    if (detectedIsland && detectedIsland !== urlIsland) {
      setIsland(detectedIsland);
    } else {
      setIsland(urlIsland);
    }
  }, [detectedIsland, urlIsland]);

  // Persist filters to URL params
  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleModality = (v: string) => { setModality(v); updateParam('modality', v); };
  const handleCity = (v: string) => { setCity(v); updateParam('city', v); };
  const handleSessionType = (v: string) => { setSessionType(v); updateParam('sessionType', v); };
  const handleAcceptsClients = (v: boolean) => { setAcceptsClients(v); updateParam('acceptsClients', v ? '1' : ''); };
  const handleIsland = (v: string) => { setIsland(v); updateParam('island', v); };
  const handleClearFilters = () => {
    setModality(''); setCity(''); setSessionType(''); setAcceptsClients(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('modality'); next.delete('city'); next.delete('sessionType'); next.delete('acceptsClients');
      return next;
    }, { replace: true });
  };

  const activeFilterCount = [modality, city, sessionType, acceptsClients ? '1' : ''].filter(Boolean).length;

  const fetchIsland = island === 'all' ? 'big_island' : island;
  const { data: practitioners = [], isLoading: loadingPractitioners } = usePractitioners(fetchIsland);
  const { data: centers = [], isLoading: loadingCenters } = useCenters(fetchIsland);
  const { data: centersAsProviders = [] } = useCentersAsProviders(fetchIsland);

  const isLoading = tab === "practitioners" ? loadingPractitioners : loadingCenters;

  const effectiveQuery = [searchQuery, urlLocation].filter(Boolean).join(' ');

  // Client-side filtering
  const filteredPractitioners = useMemo(
    () => filterProviders(
      // Augment mock data to apply city filter via location field
      city
        ? practitioners.filter(p => p.location?.toLowerCase() === city.toLowerCase())
        : practitioners,
      effectiveQuery,
      modality,
      sessionType,
      acceptsClients,
    ),
    [practitioners, effectiveQuery, modality, city, sessionType, acceptsClients]
  );

  const filteredCenters = useMemo(
    () => filterCenters(
      city
        ? centers.filter(c => c.location?.toLowerCase() === city.toLowerCase())
        : centers,
      effectiveQuery,
      modality,
    ),
    [centers, effectiveQuery, modality, city]
  );

  const mapLocations = useMemo(() => {
    const raw = tab === "practitioners" ? filteredPractitioners : filteredCenters;
    return raw.filter(l => l.lat !== 0 && l.lng !== 0 && l.lat !== 19.8968);
  }, [tab, filteredPractitioners, filteredCenters]);

  const resultCount = tab === "practitioners" ? filteredPractitioners.length : filteredCenters.length;
  const crossIslandNote = detectedIsland && detectedIsland !== urlIsland
    ? `Showing results from ${ISLANDS.find(i => i.value === detectedIsland)?.label} based on your search location.`
    : null;

  const filterPanelProps: FilterPanelProps = {
    island, modality, city, sessionType, acceptsClients, tab,
    onModality: handleModality,
    onCity: handleCity,
    onSessionType: handleSessionType,
    onAcceptsClients: handleAcceptsClients,
    onClear: handleClearFilters,
    activeCount: activeFilterCount,
  };

  return (
    <main className="flex flex-1 flex-col">
      {/* Tab Bar + Controls */}
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="container space-y-2">
          {/* Row 1: island selector + map toggle (mobile) */}
          <div className="flex items-center gap-2">
            <Select value={island} onValueChange={handleIsland}>
              <SelectTrigger className="w-36 flex-shrink-0 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISLANDS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* Mobile map toggle */}
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <Map className="h-4 w-4" />
              {showMap ? "List" : "Map"}
            </button>
          </div>

          {/* Row 2: tabs — full width on all screen sizes */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as DirectoryTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="practitioners" className="flex-1 text-xs sm:text-sm">
                <span className="sm:hidden">Practitioners</span>
                <span className="hidden sm:inline">Individual Practitioners</span>
              </TabsTrigger>
              <TabsTrigger value="centers" className="flex-1 text-xs sm:text-sm">
                <span className="sm:hidden">Spas &amp; Centers</span>
                <span className="hidden sm:inline">Spas &amp; Wellness Centers</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0 border-r border-border overflow-y-auto p-4">
          <p className="mb-4 text-sm font-semibold">Filters</p>
          <FilterPanel {...filterPanelProps} />
        </aside>

        {/* List */}
        <div className={`flex-1 overflow-y-auto p-4 lg:block lg:max-h-[calc(100vh-8rem)] lg:max-w-lg xl:max-w-xl ${showMap ? "hidden" : "block"}`}>
          {/* Search + mobile filter button */}
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by name, modality, city…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Mobile filters button */}
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0 lg:hidden gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filter Results</SheetTitle>
                </SheetHeader>
                <FilterPanel {...filterPanelProps} />
                <Button className="mt-6 w-full" onClick={() => setFilterSheetOpen(false)}>
                  Show {resultCount} result{resultCount !== 1 ? "s" : ""}
                </Button>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips (mobile + desktop) */}
          {activeFilterCount > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {modality && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {modality}
                  <button onClick={() => handleModality('')} aria-label="Remove modality filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {city && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {city}
                  <button onClick={() => handleCity('')} aria-label="Remove city filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {sessionType && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {sessionType === 'in_person' ? 'In Person' : sessionType === 'online' ? 'Online' : 'Both'}
                  <button onClick={() => handleSessionType('')} aria-label="Remove session type filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {acceptsClients && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Accepting Clients
                  <button onClick={() => handleAcceptsClients(false)} aria-label="Remove accepting clients filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          )}

          {crossIslandNote && (
            <p className="mb-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
              🏝️ {crossIslandNote}
            </p>
          )}

          <p className="mb-4 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${resultCount} result${resultCount !== 1 ? "s" : ""} found`}
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {tab === "practitioners"
                ? filteredPractitioners.map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))
                : filteredCenters.map((c) => (
                    <CenterCard key={c.id} center={c} />
                  ))}

              {resultCount === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No listings match your filters on {ISLANDS.find(i => i.value === island)?.label || 'this island'}.</p>
                  <button
                    onClick={handleClearFilters}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div className={`flex-1 lg:block ${showMap ? "block" : "hidden"}`} style={{ minHeight: showMap ? "calc(100vh-8rem)" : undefined }}>
          <div className="sticky top-0 h-[calc(100vh-8rem)]">
            <DirectoryMap locations={mapLocations} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Directory;
