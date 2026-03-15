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
import { useDirectorySearch, DirectoryResult } from "@/hooks/useDirectorySearch";
import { useSearchListings } from "@/hooks/useSearchListings";
import type { Provider, Center } from "@/data/mockData";
import { haversineDistance } from "@/lib/geoUtils";
import { Map, Search, SlidersHorizontal, X, Frown, Navigation } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

type DirectoryTab = "practitioners" | "centers";

// Feature flag: set VITE_USE_NEW_SEARCH=false in .env to revert to old client-side search
const USE_NEW_SEARCH = import.meta.env.VITE_USE_NEW_SEARCH !== 'false';

// ── Canonical modalities (shown in filter dropdown) ──────────────────────────
const FILTER_MODALITIES = [
  "Acupuncture", "Art Therapy", "Astrology", "Ayurveda", "Breathwork", "Chiropractic", "Counseling",
  "Energy Healing", "Family Constellation", "Fitness", "Functional Medicine", "Hawaiian Healing", "Herbalism",
  "Hypnotherapy", "IV Therapy", "Life Coaching", "Lomilomi / Hawaiian Healing", "Longevity",
  "Massage", "Meditation", "Nature Therapy", "Naturopathic", "Nutrition", "Physical Therapy",
  "Psychic", "Psychotherapy", "Reiki", "Ritualist", "Somatic Therapy", "Soul Guidance",
  "Sound Healing", "TCM (Traditional Chinese Medicine)", "Trauma-Informed Care", "Women's Health", "Yoga",
];

// ── Island / city lookup ─────────────────────────────────────────────────────

const ISLAND_CITIES: Record<string, string[]> = {
  big_island: ['Kailua-Kona', 'Hilo', 'Waimea', 'Pahoa', 'Captain Cook', 'Keaau', 'Holualoa', 'Volcano', 'Waikoloa', 'Hawi', 'Honokaa', 'Ocean View'],
  oahu: ['Honolulu', 'Waikiki', 'Kailua', 'Kaneohe', 'Pearl City', 'Kapolei', 'Haleiwa', 'Mililani', 'Hawaii Kai', 'Manoa'],
  maui: ['Lahaina', 'Kihei', 'Wailea', 'Kahului', 'Wailuku', 'Makawao', 'Paia', 'Haiku', 'Kula', 'Hana'],
  kauai: ['Lihue', 'Kapaa', 'Hanalei', 'Princeville', 'Poipu', 'Koloa', 'Hanapepe', 'Waimea', 'Kilauea'],
  molokai: ['Kaunakakai'],
};

function detectIslandFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bbig island\b/.test(lower)) return 'big_island';
  if (/\boahu\b/.test(lower)) return 'oahu';
  if (/\bmaui\b/.test(lower)) return 'maui';
  if (/\bkauai\b/.test(lower)) return 'kauai';
  if (/\bmolokai\b/.test(lower)) return 'molokai';
  const townMap: Record<string, string> = {
    kona: 'big_island', hilo: 'big_island', waimea: 'big_island', pahoa: 'big_island',
    honolulu: 'oahu', waikiki: 'oahu', kailua: 'oahu', kaneohe: 'oahu',
    lahaina: 'maui', kihei: 'maui', wailea: 'maui', kahului: 'maui', paia: 'maui',
    lihue: 'kauai', kapaa: 'kauai', hanalei: 'kauai', poipu: 'kauai',
  };
  for (const [town, isl] of Object.entries(townMap)) {
    if (lower.includes(town)) return isl;
  }
  return null;
}

const ISLANDS = [
  { value: 'all', label: 'All Islands' },
  { value: 'big_island', label: 'Big Island' },
  // Maui, Oahu, Kauai, Molokai hidden until those directories are ready
];

// ── Adapters: DirectoryResult → Provider / Center shapes ─────────────────────

function resultToProvider(r: DirectoryResult): Provider {
  return {
    id: r.id,
    name: r.name,
    bio: r.bio || '',
    modality: (r.modality_labels?.[0]) || (r.modalities?.[0]) || '',
    modalities: r.modality_labels?.length ? r.modality_labels : (r.modalities || []),
    location: r.city || '',
    image: r.photo_url || '',
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    tier: r.tier || 'free',
    sessionType: r.session_type || '',
    acceptsNewClients: r.accepts_new_clients ?? undefined,
    phone: r.phone || '',
    email: r.email || '',
    website: r.website_url || '',
    externalBookingUrl: r.external_booking_url || undefined,
    matchedConcerns: r.concern_labels?.length ? r.concern_labels : undefined,
    matchedApproaches: r.approach_labels?.length ? r.approach_labels : undefined,
  };
}

function resultToCenter(r: DirectoryResult): Center {
  return {
    id: r.id,
    name: r.name,
    description: r.bio || '',
    modality: (r.modality_labels?.[0]) || (r.modalities?.[0]) || '',
    modalities: r.modality_labels?.length ? r.modality_labels : (r.modalities || []),
    location: r.city || '',
    image: r.photo_url || '',
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    tier: r.tier || 'free',
    services: [],
    centerType: '',
  };
}

// ── OLD SEARCH — kept for feature flag fallback ──────────────────────────────
// (only loaded when USE_NEW_SEARCH is false)

const MODALITY_SYNONYMS: Record<string, string> = {
  'soul retrieval': 'soul guidance', 'spiritual': 'soul guidance energy healing',
  'lomi': 'lomilomi hawaiian healing massage', 'lomilomi': 'lomilomi hawaiian healing massage',
  'energy work': 'energy healing', 'reiki master': 'reiki', 'bodywork': 'massage',
  'deep tissue': 'massage', 'cranio': 'craniosacral', 'sound bath': 'sound healing',
  'nervous system': 'nervous system regulation somatic therapy', 'somatic': 'somatic therapy',
  'trauma': 'trauma-informed care', 'therapist': 'psychotherapy counseling',
  'therapy': 'psychotherapy counseling', 'life coach': 'life coaching',
  'coaching': 'life coaching', 'chiropractor': 'chiropractic', 'acupuncturist': 'acupuncture',
  'chinese medicine': 'tcm traditional chinese medicine', 'naturopath': 'naturopathic',
  'functional medicine': 'functional medicine naturopathic', 'nutritionist': 'nutrition',
  'herbalist': 'herbalism', 'ayurvedic': 'ayurveda', 'doula': 'birth doula',
  'midwifery': 'midwife', 'astrologer': 'astrology', 'tarot': 'psychic soul guidance',
  'physical therapist': 'physical therapy', 'watsu': 'watsu water therapy',
  'yoga teacher': 'yoga', 'breathwork': 'breathwork', 'meditation': 'meditation',
  'mindfulness': 'meditation', 'hypnosis': 'hypnotherapy',
};

function expandQuery(query: string): string {
  const lower = query.toLowerCase();
  const extras: string[] = [];
  for (const [phrase, expansion] of Object.entries(MODALITY_SYNONYMS)) {
    if (lower.includes(phrase)) extras.push(expansion);
  }
  return extras.length > 0 ? `${query} ${extras.join(' ')}` : query;
}

function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('tion')) return word.slice(0, -4);
  if (word.endsWith('er')) return word.slice(0, -2);
  if (word.endsWith('ist')) return word.slice(0, -3);
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

function filterProviders(items: Provider[], query: string, modality: string, sessionType: string, acceptsClients: boolean): Provider[] {
  const expanded = expandQuery(query);
  return items.filter(p => {
    const modalityText = (p.modalities ?? [p.modality]).join(' ');
    const target = `${p.name} ${modalityText} ${p.location || ''}`;
    const expandedTarget = expanded !== query ? `${target} ${expanded.slice(query.length).trim()}` : target;
    if (!smartFilter(expandedTarget, query)) return false;
    if (modality) {
      const allMods = (p.modalities ?? [p.modality]).join(' ').toLowerCase();
      if (!allMods.includes(modality.toLowerCase())) return false;
    }
    if (sessionType && p.sessionType && p.sessionType !== sessionType && sessionType !== 'both') {
      if (p.sessionType !== 'both') return false;
    }
    if (acceptsClients && p.acceptsNewClients !== true) return false;
    return true;
  });
}

function filterCenters(items: Center[], query: string, modality: string): Center[] {
  const expanded = expandQuery(query);
  return items.filter(c => {
    const modalityText = (c.modalities ?? [c.modality]).join(' ');
    const target = `${c.name} ${modalityText} ${c.location || ''}`;
    const expandedTarget = expanded !== query ? `${target} ${expanded.slice(query.length).trim()}` : target;
    if (!smartFilter(expandedTarget, query)) return false;
    if (modality) {
      const allMods = (c.modalities ?? [c.modality]).join(' ').toLowerCase();
      if (!allMods.includes(modality.toLowerCase())) return false;
    }
    return true;
  });
}

const tierWeight = (tier?: string) => tier === 'featured' ? 0 : tier === 'premium' ? 1 : 2;

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
                <input type="radio" name="sessionType" value={opt.value}
                  checked={sessionType === opt.value} onChange={() => onSessionType(opt.value)}
                  className="accent-primary" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Accepting clients (practitioners only) */}
      {tab === 'practitioners' && (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="acceptsClients" className="text-sm cursor-pointer">Accepting new clients</Label>
          <Switch id="acceptsClients" checked={acceptsClients} onCheckedChange={onAcceptsClients} />
        </div>
      )}
    </div>
  );
}

// ── NoResultsState ────────────────────────────────────────────────────────────

interface NoResultsStateProps {
  query: string;
  island: string;
  onClear: () => void;
  suggestions: import("@/hooks/useSearchListings").SearchResult[];
  tab: DirectoryTab;
  highlightModality?: string;
}

function NoResultsState({ query, island, onClear, suggestions, tab, highlightModality }: NoResultsStateProps) {
  const displayQuery = query.trim();
  return (
    <div className="py-8">
      <div className="mb-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
        <Frown className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-base font-semibold text-foreground">
          {displayQuery
            ? <>No results for &ldquo;{displayQuery}&rdquo; on {island}</>
            : <>No results match your filters on {island}</>}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different term, broaden your search, or browse all listings.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onClear}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear search
          </Button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            You might be interested in
          </p>
          <div className="space-y-3">
            {suggestions.map(s =>
              tab === 'practitioners'
                ? <ProviderCard key={s.id} provider={resultToProvider(s as any)} highlightModality={highlightModality} compact />
                : <CenterCard key={s.id} center={resultToCenter(s as any)} highlightModality={highlightModality} compact />
            )}
          </div>
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
  const urlIsland = searchParams.get('island') || 'big_island';
  const urlModality = searchParams.get('modality') || '';
  const urlCity = searchParams.get('city') || '';
  const urlSessionType = searchParams.get('sessionType') || '';
  // Default to true (show only accepting-clients listings) unless URL explicitly sets acceptsClients=0
  const urlAcceptsClients = searchParams.get('acceptsClients') !== '0';

  // User location: prefer URL params (set by SearchBar "Near me"), fall back to localStorage
  // so location persists when navigating directly to /directory or using the inline search
  const userLocation = useMemo(() => {
    const urlULat = parseFloat(searchParams.get('ulat') || '');
    const urlULng = parseFloat(searchParams.get('ulng') || '');
    if (!isNaN(urlULat) && !isNaN(urlULng)) {
      return { lat: urlULat, lng: urlULng };
    }
    try {
      const saved = localStorage.getItem('aloha_user_location');
      if (saved) {
        const { lat, lng } = JSON.parse(saved);
        if (typeof lat === 'number' && typeof lng === 'number') {
          return { lat, lng };
        }
      }
    } catch { /* ignore malformed storage */ }
    return null;
  }, [searchParams]);

  const detectedIsland = useMemo(() => {
    return detectIslandFromText(urlQ);
  }, [urlQ]);

  const [tab, setTab] = useState<DirectoryTab>("practitioners");
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlQ);
  const [island, setIsland] = useState(detectedIsland || urlIsland);
  // Default to sorting by distance when user has location set
  const [sortByDistance, setSortByDistance] = useState(() => {
    try {
      return !!localStorage.getItem('aloha_user_location');
    } catch { return false; }
  });
  const [modality, setModality] = useState(urlModality);
  const [city, setCity] = useState(urlCity);
  const [sessionType, setSessionType] = useState(urlSessionType);
  const [acceptsClients, setAcceptsClients] = useState(urlAcceptsClients);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [accumulatedResults, setAccumulatedResults] = useState<DirectoryResult[]>([]);

  useEffect(() => {
    if (searchParams.get('island')) {
      setIsland(urlIsland);
    } else if (detectedIsland) {
      setIsland(detectedIsland);
    } else {
      setIsland(urlIsland);
    }
  }, [detectedIsland, urlIsland, searchParams]);

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
  const effectiveQuery = searchQuery.trim();

  // Reset pagination when any filter changes
  useEffect(() => { setPage(0); }, [effectiveQuery, island, modality, city, sessionType, acceptsClients, tab]);

  // ── NEW SEARCH PATH ────────────────────────────────────────────────────────
  const newSearch = useDirectorySearch({
    searchQuery: effectiveQuery,
    island,
    modality,
    city,
    sessionType,
    acceptsClients,
    tab,
    page,
    pageSize: 25,
  });

  // Accumulate results across pages
  useEffect(() => {
    if (newSearch.isLoading) return;
    if (page === 0) {
      setAccumulatedResults(newSearch.results);
    } else {
      setAccumulatedResults(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const fresh = newSearch.results.filter(r => !existingIds.has(r.id));
        return [...prev, ...fresh];
      });
    }
  }, [newSearch.results, newSearch.isLoading, page]);

  const newTotalCount = newSearch.totalCount ?? 0;

  // Detect true no-results: search was active but nothing matched
  const hasActiveSearch = effectiveQuery.trim() !== '' || modality !== '' || sessionType !== '' || acceptsClients;
  const isNoResults = USE_NEW_SEARCH && !newSearch.isLoading && hasActiveSearch && accumulatedResults.length === 0;

  // Fallback suggestions: browse top listings on same island (shown when no results)
  const { data: fallbackData } = useSearchListings(
    {
      island: island !== 'all' ? island : 'big_island',
      listingType: tab === 'practitioners' ? 'practitioner' : 'center',
      pageSize: 4,
    },
    isNoResults // only fetch when actually showing no-results state
  );
  const fallbackSuggestions = useMemo(() =>
    (fallbackData?.results ?? []).slice(0, 4),
    [fallbackData]
  );

  // Tier rank: featured=0, premium=1, free/other=2 — used as stable secondary sort
  function tierRank(tier?: string) { return tier === 'featured' ? 0 : tier === 'premium' ? 1 : 2; }

  const newProviders = useMemo(() => {
    const list = accumulatedResults
      .filter(r => r.listing_type === 'practitioner')
      .map(r => {
        const p = resultToProvider(r);
        if (userLocation && r.lat && r.lng) {
          p.distanceMiles = haversineDistance(userLocation.lat, userLocation.lng, r.lat, r.lng);
        }
        return p;
      });
    if (sortByDistance && userLocation) {
      return [...list].sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
    }
    // Always keep featured before premium in display order
    return [...list].sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  }, [accumulatedResults, userLocation, sortByDistance]);

  const newCenters = useMemo(() => {
    const list = accumulatedResults
      .filter(r => r.listing_type === 'center')
      .map(r => {
        const c = resultToCenter(r);
        if (userLocation && r.lat && r.lng) {
          c.distanceMiles = haversineDistance(userLocation.lat, userLocation.lng, r.lat, r.lng);
        }
        return c;
      });
    if (sortByDistance && userLocation) {
      return [...list].sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
    }
    // Always keep featured before premium in display order
    return [...list].sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  }, [accumulatedResults, userLocation, sortByDistance]);

  // ── OLD SEARCH PATH (fallback) ────────────────────────────────────────────
  const fetchIsland = island === 'all' ? 'big_island' : island;
  const { data: oldPractitioners = [], isLoading: loadingOldP } = usePractitioners(fetchIsland);
  const { data: oldCenters = [], isLoading: loadingOldC } = useCenters(fetchIsland);
  const { data: centersAsProviders = [] } = useCentersAsProviders(fetchIsland);

  const oldFilteredPractitioners = useMemo(() => {
    if (USE_NEW_SEARCH) return [];
    const cityFiltered = city
      ? oldPractitioners.filter(p => p.location?.toLowerCase() === city.toLowerCase() || p.tier === 'premium' || p.tier === 'featured')
      : oldPractitioners;
    const results = filterProviders(cityFiltered, effectiveQuery, modality, sessionType, acceptsClients);
    return [...results].sort((a, b) => {
      const td = tierWeight(a.tier) - tierWeight(b.tier);
      return td !== 0 ? td : a.name.localeCompare(b.name);
    });
  }, [oldPractitioners, effectiveQuery, modality, city, sessionType, acceptsClients]);

  const oldFilteredCenters = useMemo(() => {
    if (USE_NEW_SEARCH) return [];
    const cityFiltered = city
      ? oldCenters.filter(c => c.location?.toLowerCase() === city.toLowerCase() || c.tier === 'premium' || c.tier === 'featured')
      : oldCenters;
    const results = filterCenters(cityFiltered, effectiveQuery, modality);
    return [...results].sort((a, b) => {
      const td = tierWeight(a.tier) - tierWeight(b.tier);
      return td !== 0 ? td : a.name.localeCompare(b.name);
    });
  }, [oldCenters, effectiveQuery, modality, city]);

  // ── Unified: pick old or new ──────────────────────────────────────────────
  const practitioners = USE_NEW_SEARCH ? newProviders : oldFilteredPractitioners;
  const centers = USE_NEW_SEARCH ? newCenters : oldFilteredCenters;
  const isLoading = USE_NEW_SEARCH
    ? newSearch.isLoading
    : (tab === "practitioners" ? loadingOldP : loadingOldC);
  const resultCount = tab === "practitioners" ? practitioners.length : centers.length;

  const mapLocations = useMemo(() => {
    const raw = tab === "practitioners"
      ? (USE_NEW_SEARCH ? newProviders : oldFilteredPractitioners)
      : (USE_NEW_SEARCH ? newCenters : oldFilteredCenters);
    return raw.filter((l: any) => l.lat !== 0 && l.lng !== 0 && l.lat !== 19.8968);
  }, [tab, newProviders, newCenters, oldFilteredPractitioners, oldFilteredCenters]);

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
          <div className="flex items-center gap-2">
            <Select value={island} onValueChange={handleIsland}>
              <SelectTrigger className="w-36 flex-shrink-0 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ISLANDS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <button onClick={() => setShowMap(!showMap)}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted lg:hidden">
              <Map className="h-4 w-4" />
              {showMap ? "List" : "Map"}
            </button>
          </div>

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
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Filter by name, modality, city…" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
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
                <SheetHeader className="mb-4"><SheetTitle>Filter Results</SheetTitle></SheetHeader>
                <FilterPanel {...filterPanelProps} />
                <Button className="mt-6 w-full" onClick={() => setFilterSheetOpen(false)}>
                  Show {resultCount} result{resultCount !== 1 ? "s" : ""}
                </Button>
              </SheetContent>
            </Sheet>
          </div>

          {activeFilterCount > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {modality && (
                <Badge variant="secondary" className="gap-1 text-xs">{modality}
                  <button onClick={() => handleModality('')} aria-label="Remove modality filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {city && (
                <Badge variant="secondary" className="gap-1 text-xs">{city}
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
                <Badge variant="secondary" className="gap-1 text-xs">Accepting Clients
                  <button onClick={() => handleAcceptsClients(false)} aria-label="Remove accepting clients filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          )}

          {crossIslandNote && (
            <p className="mb-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
              {crossIslandNote}
            </p>
          )}

          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${resultCount} result${resultCount !== 1 ? "s" : ""} found`}
            </p>
            {userLocation && !isLoading && resultCount > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
                <Navigation className="h-3.5 w-3.5" />
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={sortByDistance}
                  onChange={e => setSortByDistance(e.target.checked)}
                />
                Nearest first
              </label>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : isNoResults ? (
            /* ── No-results state ───────────────────────────────────────── */
            <NoResultsState
              query={effectiveQuery}
              island={ISLANDS.find(i => i.value === island)?.label || 'this island'}
              onClear={handleClearFilters}
              suggestions={fallbackSuggestions}
              tab={tab}
              highlightModality={effectiveQuery}
            />
          ) : (
            <div className="space-y-3">
              {tab === "practitioners"
                ? practitioners.map((p) => <ProviderCard key={p.id} provider={p} highlightModality={effectiveQuery} compact />)
                : centers.map((c) => <CenterCard key={c.id} center={c} highlightModality={effectiveQuery} compact />)}

              {resultCount === 0 && !hasActiveSearch && (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No listings on {ISLANDS.find(i => i.value === island)?.label || 'this island'} yet.</p>
                </div>
              )}

              {USE_NEW_SEARCH && accumulatedResults.length < newTotalCount && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={newSearch.isLoading}
                    className="min-w-40"
                  >
                    {newSearch.isLoading && page > 0 ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading…
                      </span>
                    ) : (
                      `Load more (${newTotalCount - accumulatedResults.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div className={`flex-1 lg:block ${showMap ? "block" : "hidden"}`} style={{ minHeight: showMap ? "calc(100vh - 8rem)" : undefined }}>
          <div className="sticky top-0 h-[calc(100vh-8rem)]">
            <DirectoryMap locations={mapLocations} visible={showMap} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Directory;
