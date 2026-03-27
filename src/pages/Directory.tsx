import { useState, useMemo, useEffect, useCallback, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProviderCard } from "@/components/ProviderCard";
import { CenterCard } from "@/components/CenterCard";
// FeaturedResultsRow removed — featured listings now inline with enhanced cards
const DirectoryMap = lazy(() => import("@/components/DirectoryMap").then(m => ({ default: m.DirectoryMap })));
import type { MapLocation } from "@/components/DirectoryMap";
import { Skeleton } from "@/components/ui/skeleton";
import { usePractitioners } from "@/hooks/usePractitioners";
import { useCenters } from "@/hooks/useCenters";
import { useDirectorySearch, DirectoryResult } from "@/hooks/useDirectorySearch";
import { useSearchListings } from "@/hooks/useSearchListings";
import type { Provider, Center } from "@/data/mockData";
import { haversineDistance } from "@/lib/geoUtils";
import { Map, Search, SlidersHorizontal, X, Frown, Navigation, User, Building2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

type ListingType = "all" | "practitioner" | "center";

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

// Approximate centroids used for distance sorting when user picks a city instead of sharing GPS
// Build city coords with island prefix to avoid collisions (e.g., Kauai Waimea != Big Island Waimea)
const CITY_COORDS_BY_ISLAND: Record<string, Record<string, { lat: number; lng: number }>> = {
  big_island: {
    'Kailua-Kona': { lat: 19.6400, lng: -155.9969 }, 'Hilo': { lat: 19.7297, lng: -155.0900 },
    'Waimea': { lat: 20.0133, lng: -155.6718 }, 'Pahoa': { lat: 19.4942, lng: -154.9447 },
    'Captain Cook': { lat: 19.4992, lng: -155.9194 }, 'Keaau': { lat: 19.6261, lng: -155.0497 },
    'Holualoa': { lat: 19.6228, lng: -155.9317 }, 'Volcano': { lat: 19.4256, lng: -155.2347 },
    'Waikoloa': { lat: 19.9306, lng: -155.7797 }, 'Hawi': { lat: 20.2428, lng: -155.8330 },
    'Honokaa': { lat: 20.0817, lng: -155.4719 }, 'Ocean View': { lat: 19.1000, lng: -155.7667 },
  },
  maui: {
    'Lahaina': { lat: 20.8783, lng: -156.6825 }, 'Kihei': { lat: 20.7645, lng: -156.4450 },
    'Wailea': { lat: 20.6881, lng: -156.4414 }, 'Kahului': { lat: 20.8893, lng: -156.4729 },
    'Wailuku': { lat: 20.8936, lng: -156.5000 }, 'Makawao': { lat: 20.8564, lng: -156.3100 },
    'Paia': { lat: 20.9108, lng: -156.3703 }, 'Haiku': { lat: 20.9197, lng: -156.3231 },
    'Kula': { lat: 20.7878, lng: -156.3358 }, 'Hana': { lat: 20.7578, lng: -155.9928 },
  },
  oahu: {
    'Honolulu': { lat: 21.3069, lng: -157.8583 }, 'Waikiki': { lat: 21.2793, lng: -157.8294 },
    'Kailua': { lat: 21.4022, lng: -157.7394 }, 'Kaneohe': { lat: 21.4022, lng: -157.8003 },
    'Pearl City': { lat: 21.3972, lng: -157.9756 }, 'Kapolei': { lat: 21.3347, lng: -158.0764 },
    'Haleiwa': { lat: 21.5950, lng: -158.1028 }, 'Mililani': { lat: 21.4511, lng: -158.0147 },
    'Hawaii Kai': { lat: 21.2919, lng: -157.7000 }, 'Manoa': { lat: 21.3094, lng: -157.8019 },
  },
  kauai: {
    'Lihue': { lat: 21.9781, lng: -159.3508 }, 'Kapaa': { lat: 22.0753, lng: -159.3192 },
    'Hanalei': { lat: 22.2039, lng: -159.5017 }, 'Princeville': { lat: 22.2153, lng: -159.4811 },
    'Poipu': { lat: 21.8742, lng: -159.4586 }, 'Koloa': { lat: 21.9056, lng: -159.4656 },
    'Hanapepe': { lat: 21.9092, lng: -159.5950 }, 'Waimea': { lat: 21.9544, lng: -159.6411 },
    'Kilauea': { lat: 22.2128, lng: -159.4028 }, 'Kalaheo': { lat: 21.9244, lng: -159.5281 },
  },
  molokai: {
    'Kaunakakai': { lat: 21.1975, lng: -157.0281 },
  },
};

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
    type: 'practitioner',
    bio: r.bio || '',
    modality: (r.modality_labels?.[0]) || (r.modalities?.[0]) || '',
    modalities: r.modality_labels?.length ? r.modality_labels : (r.modalities || []),
    location: r.city || '',
    image: r.photo_url || '',
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    rating: 0,
    tier: r.tier || 'free',
    sessionType: r.session_type || '',
    acceptsNewClients: r.accepts_new_clients ?? undefined,
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
    rating: 0,
    tier: r.tier || 'free',
    services: [],
    centerType: r.center_type || '',
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

const CENTER_TYPE_OPTIONS = [
  { value: 'spa',            label: 'Spa' },
  { value: 'wellness_center', label: 'Wellness Center' },
  { value: 'yoga_studio',    label: 'Yoga Studio' },
  { value: 'clinic',         label: 'Clinic' },
  { value: 'retreat_center', label: 'Retreat Center' },
  { value: 'fitness_center', label: 'Fitness Center' },
];

interface FilterPanelProps {
  island: string;
  modality: string;
  city: string;
  centerType: string;
  sessionType: string;
  acceptsClients: boolean;
  listingType: ListingType;
  onModality: (v: string) => void;
  onCity: (v: string) => void;
  onCenterType: (v: string) => void;
  onSessionType: (v: string) => void;
  onAcceptsClients: (v: boolean) => void;
  onClear: () => void;
  activeCount: number;
}

function FilterPanel({
  island, modality, city, centerType, sessionType, acceptsClients, listingType,
  onModality, onCity, onCenterType, onSessionType, onAcceptsClients, onClear, activeCount
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

      {/* Center type (centers or all mode) */}
      {(listingType === 'center' || listingType === 'all') && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Center Type</Label>
          <Select value={centerType || "_all"} onValueChange={v => onCenterType(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Any type</SelectItem>
              {CENTER_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
      {listingType === 'practitioner' && (
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
      {listingType === 'practitioner' && (
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
  highlightModality?: string;
}

function NoResultsState({ query, island, onClear, suggestions, highlightModality }: NoResultsStateProps) {
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
            {suggestions.map(s => {
              const r = s as DirectoryResult;
              return r.listing_type === 'center'
                ? <CenterCard key={s.id} center={resultToCenter(r)} highlightModality={highlightModality} compact />
                : <ProviderCard key={s.id} provider={resultToProvider(r)} highlightModality={highlightModality} compact />;
            })}
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
  const urlCenterType = searchParams.get('centerType') || '';
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

  const [listingType, setListingType] = useState<ListingType>("all");
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
  const [centerType, setCenterType] = useState(urlCenterType);
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
  const handleCenterType = (v: string) => { setCenterType(v); updateParam('centerType', v); };
  const handleSessionType = (v: string) => { setSessionType(v); updateParam('sessionType', v); };
  const handleAcceptsClients = (v: boolean) => { setAcceptsClients(v); updateParam('acceptsClients', v ? '1' : ''); };
  const handleIsland = (v: string) => { setIsland(v); updateParam('island', v); };

  const [locating, setLocating] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const handleClearLocation = useCallback(() => {
    try { localStorage.removeItem('aloha_user_location'); } catch { /* ignore */ }
    setSortByDistance(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('ulat'); next.delete('ulng');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSetLocationFromCity = useCallback((cityName: string) => {
    // Look up city coords using current island context
    const islandForLookup = island === 'all' ? 'big_island' : island;
    const coords = CITY_COORDS_BY_ISLAND[islandForLookup]?.[cityName];
    if (!coords) return;
    try { localStorage.setItem('aloha_user_location', JSON.stringify(coords)); } catch { /* ignore */ }
    setSortByDistance(true);
    setShowCityPicker(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('ulat', String(coords.lat));
      next.set('ulng', String(coords.lng));
      return next;
    }, { replace: true });
  }, [setSearchParams, island]);

  const handleSetLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        try { localStorage.setItem('aloha_user_location', JSON.stringify({ lat: latitude, lng: longitude })); } catch { /* ignore */ }
        setSortByDistance(true);
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('ulat', String(latitude));
          next.set('ulng', String(longitude));
          return next;
        }, { replace: true });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }, [setSearchParams]);

  const handleClearFilters = () => {
    setModality(''); setCity(''); setCenterType(''); setSessionType(''); setAcceptsClients(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('modality'); next.delete('city'); next.delete('centerType'); next.delete('sessionType'); next.delete('acceptsClients');
      return next;
    }, { replace: true });
  };

  // Only count practitioner-specific filters when they're actually applied
  const effectiveSessionType = listingType === 'practitioner' ? sessionType : '';
  const effectiveAcceptsClients = listingType === 'practitioner' && acceptsClients;
  const activeFilterCount = [modality, city, centerType, effectiveSessionType, effectiveAcceptsClients ? '1' : ''].filter(Boolean).length;
  const effectiveQuery = searchQuery.trim();

  // Reset pagination when any filter changes
  useEffect(() => { setPage(0); }, [effectiveQuery, island, modality, city, centerType, effectiveSessionType, effectiveAcceptsClients, listingType]);

  // ── NEW SEARCH PATH ────────────────────────────────────────────────────────
  // Map listing type to the tab format the hook expects
  const searchTab = listingType === 'all' ? 'all' as const
    : listingType === 'practitioner' ? 'practitioners' as const
    : 'centers' as const;

  const newSearch = useDirectorySearch({
    searchQuery: effectiveQuery,
    island,
    modality,
    city,
    sessionType: listingType === 'center' ? '' : sessionType,
    // Centers don't have an "accepting new clients" concept — only apply for practitioner-only mode
    acceptsClients: listingType === 'practitioner' ? acceptsClients : false,
    tab: searchTab,
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
  const hasActiveSearch = effectiveQuery.trim() !== '' || modality !== '' || city !== '' || centerType !== '' || effectiveSessionType !== '' || effectiveAcceptsClients;
  const isNoResults = USE_NEW_SEARCH && !newSearch.isLoading && hasActiveSearch && accumulatedResults.length === 0;

  // Fallback suggestions: browse top listings on same island (shown when no results)
  const { data: fallbackData } = useSearchListings(
    {
      island: island !== 'all' ? island : 'big_island',
      listingType: listingType === 'all' ? undefined : listingType,
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

  // ── Unified results (both types in one list) ────────────────────────────────

  interface UnifiedItem {
    raw: DirectoryResult;
    provider?: Provider;
    center?: Center;
  }

  const unifiedResults = useMemo(() => {
    let list: UnifiedItem[] = accumulatedResults.map(r => {
      if (r.listing_type === 'practitioner') {
        const p = resultToProvider(r);
        if (userLocation && r.lat && r.lng) {
          p.distanceMiles = haversineDistance(userLocation.lat, userLocation.lng, r.lat, r.lng);
        }
        return { raw: r, provider: p };
      } else {
        const c = resultToCenter(r);
        if (userLocation && r.lat && r.lng) {
          c.distanceMiles = haversineDistance(userLocation.lat, userLocation.lng, r.lat, r.lng);
        }
        return { raw: r, center: c };
      }
    });

    // Client-side center type filter (not in RPC)
    if (centerType) {
      list = list.filter(item => item.raw.listing_type !== 'center' || item.center?.centerType === centerType);
    }

    // Sort by distance if enabled — featured listings always stay at the top,
    // then non-featured sorted by distance
    if (sortByDistance && userLocation) {
      list.sort((a, b) => {
        const aTier = a.provider?.tier ?? a.center?.tier ?? 'free';
        const bTier = b.provider?.tier ?? b.center?.tier ?? 'free';
        const aFeatured = aTier === 'featured' ? 0 : 1;
        const bFeatured = bTier === 'featured' ? 0 : 1;
        if (aFeatured !== bFeatured) return aFeatured - bFeatured;
        // Within same tier group, nearest first
        const da = a.provider?.distanceMiles ?? a.center?.distanceMiles ?? Infinity;
        const db = b.provider?.distanceMiles ?? b.center?.distanceMiles ?? Infinity;
        return da - db;
      });
    }

    return list;
  }, [accumulatedResults, userLocation, sortByDistance, centerType]);

  // Backward compat: keep these for old search path
  const newProviders = useMemo(() =>
    unifiedResults.filter(i => i.provider).map(i => i.provider!),
    [unifiedResults]
  );
  const newCenters = useMemo(() =>
    unifiedResults.filter(i => i.center).map(i => i.center!),
    [unifiedResults]
  );

  // ── OLD SEARCH PATH (fallback — only fetches when new search is disabled) ──
  const fetchIsland = island === 'all' ? 'big_island' : island;
  const { data: oldPractitioners = [], isLoading: loadingOldP } = usePractitioners(fetchIsland, !USE_NEW_SEARCH);
  const { data: oldCenters = [], isLoading: loadingOldC } = useCenters(fetchIsland, !USE_NEW_SEARCH);

  const oldFilteredPractitioners = useMemo(() => {
    if (USE_NEW_SEARCH) return [];
    const cityFiltered = city
      ? oldPractitioners.filter(p => p.location?.toLowerCase() === city.toLowerCase())
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
      ? oldCenters.filter(c => c.location?.toLowerCase() === city.toLowerCase())
      : oldCenters;
    let results = filterCenters(cityFiltered, effectiveQuery, modality);
    if (centerType) results = results.filter(c => c.centerType === centerType);
    return [...results].sort((a, b) => {
      const td = tierWeight(a.tier) - tierWeight(b.tier);
      return td !== 0 ? td : a.name.localeCompare(b.name);
    });
  }, [oldCenters, effectiveQuery, modality, city, centerType]);

  // ── Unified: pick old or new ──────────────────────────────────────────────
  const isLoading = USE_NEW_SEARCH ? newSearch.isLoading : (loadingOldP || loadingOldC);
  const resultCount = USE_NEW_SEARCH ? unifiedResults.length : (oldFilteredPractitioners.length + oldFilteredCenters.length);

  const mapLocations = useMemo<MapLocation[]>(() => {
    if (USE_NEW_SEARCH) {
      return unifiedResults
        .filter(item => {
          const lat = item.raw.lat ?? 0;
          const lng = item.raw.lng ?? 0;
          return lat !== 0 && lng !== 0 && lat !== 19.8968;
        })
        .map(item => ({
          id: item.raw.id,
          name: item.raw.name,
          lat: item.raw.lat!,
          lng: item.raw.lng!,
          image: item.provider?.image || item.center?.image || '',
          modality: item.provider?.modality || item.center?.modality || '',
          location: item.raw.city || '',
          listing_type: item.raw.listing_type as 'practitioner' | 'center',
          tier: item.raw.tier || 'free',
        }));
    }
    // Old search fallback — combine both types
    const all = [
      ...oldFilteredPractitioners.map(p => ({
        id: p.id, name: p.name, lat: p.lat, lng: p.lng, image: p.image,
        modality: p.modality, location: p.location, listing_type: 'practitioner' as const, tier: p.tier,
      })),
      ...oldFilteredCenters.map(c => ({
        id: c.id, name: c.name, lat: c.lat, lng: c.lng, image: c.image,
        modality: c.modality, location: c.location, listing_type: 'center' as const, tier: c.tier,
      })),
    ];
    return all.filter(l => l.lat !== 0 && l.lng !== 0 && l.lat !== 19.8968);
  }, [unifiedResults, oldFilteredPractitioners, oldFilteredCenters]);

  const crossIslandNote = detectedIsland && detectedIsland !== island
    ? `Showing results from ${ISLANDS.find(i => i.value === detectedIsland)?.label} based on your search location.`
    : null;

  const filterPanelProps: FilterPanelProps = {
    island, modality, city, centerType, sessionType, acceptsClients, listingType,
    onModality: handleModality,
    onCity: handleCity,
    onCenterType: handleCenterType,
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

            {/* Type filter — segmented control */}
            <div className="hidden sm:flex rounded-lg border border-input overflow-hidden text-sm" role="group" aria-label="Filter by listing type">
              {([
                { value: 'all' as const, label: 'All', icon: null },
                { value: 'practitioner' as const, label: 'Practitioners', icon: <User className="h-3.5 w-3.5" /> },
                { value: 'center' as const, label: 'Centers', icon: <Building2 className="h-3.5 w-3.5" /> },
              ] as const).map((opt, i) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setListingType(opt.value);
                    if (opt.value !== 'practitioner') {
                      setAcceptsClients(false); setSessionType('');
                      // Clear practitioner-specific URL params to prevent bleed on reload
                      setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        next.delete('sessionType'); next.delete('acceptsClients');
                        return next;
                      }, { replace: true });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${
                    i > 0 ? 'border-l border-input' : ''
                  } ${
                    listingType === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  aria-pressed={listingType === opt.value}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Mobile type filter — dropdown */}
            <Select value={listingType} onValueChange={(v) => {
              setListingType(v as ListingType);
              if (v !== 'practitioner') {
                setAcceptsClients(false); setSessionType('');
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.delete('sessionType'); next.delete('acceptsClients');
                  return next;
                }, { replace: true });
              }
            }}>
              <SelectTrigger className="w-32 flex-shrink-0 text-sm sm:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="practitioner">Practitioners</SelectItem>
                <SelectItem value="center">Centers</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* Map toggle — mobile only (desktop has always-on map) */}
            <button onClick={() => setShowMap(!showMap)}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted lg:hidden">
              <Map className="h-4 w-4" />
              {showMap ? "List" : "Map"}
            </button>
          </div>
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
                onChange={e => { setSearchQuery(e.target.value); updateParam('q', e.target.value); }}
                aria-label="Filter practitioners by name, modality, or city"
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
              {centerType && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {CENTER_TYPE_OPTIONS.find(o => o.value === centerType)?.label ?? centerType}
                  <button onClick={() => handleCenterType('')} aria-label="Remove center type filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {effectiveSessionType && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {sessionType === 'in_person' ? 'In Person' : sessionType === 'online' ? 'Online' : 'Both'}
                  <button onClick={() => handleSessionType('')} aria-label="Remove session type filter"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {effectiveAcceptsClients && (
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
            <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
              {isLoading ? "Loading…" : `${resultCount} result${resultCount !== 1 ? "s" : ""} found`}
            </p>
            {userLocation ? (
              <div className="flex items-center gap-2">
                {!isLoading && resultCount > 0 && (
                  <label htmlFor="sortByDistance" className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
                    <Navigation className="h-3.5 w-3.5" />
                    <input
                      id="sortByDistance"
                      type="checkbox"
                      className="accent-primary"
                      checked={sortByDistance}
                      onChange={e => setSortByDistance(e.target.checked)}
                    />
                    Nearest first
                  </label>
                )}
                <button
                  onClick={handleClearLocation}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  aria-label="Clear location"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSetLocation}
                  disabled={locating}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Navigation className="h-3.5 w-3.5 shrink-0" />
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
                <span className="text-xs text-muted-foreground/50">or</span>
                {showCityPicker ? (
                  <select
                    autoFocus
                    className="text-xs border rounded px-1.5 py-0.5 bg-background text-foreground"
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) {
                        handleSetLocationFromCity(e.target.value);
                      }
                    }}
                  >
                    <option value="" disabled>Pick your town</option>
                    {(ISLAND_CITIES[island === 'all' ? 'big_island' : island] ?? []).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setShowCityPicker(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    choose your town
                  </button>
                )}
              </div>
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
              highlightModality={effectiveQuery}
            />
          ) : (
            <div>
              {/* Results — featured/premium get enhanced cards, free get condensed */}
              <div className="space-y-2">
                {USE_NEW_SEARCH
                  ? unifiedResults.map(item =>
                      item.raw.listing_type === 'center' && item.center
                        ? <CenterCard key={item.raw.id} center={item.center} highlightModality={effectiveQuery} compact />
                        : item.provider
                        ? <ProviderCard key={item.raw.id} provider={item.provider} highlightModality={effectiveQuery} compact />
                        : null
                    )
                  : [
                      ...oldFilteredPractitioners.map(p => <ProviderCard key={p.id} provider={p} highlightModality={effectiveQuery} compact />),
                      ...oldFilteredCenters.map(c => <CenterCard key={c.id} center={c} highlightModality={effectiveQuery} compact />),
                    ]
                }
              </div>

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

        {/* Map — always visible on desktop (lg+), toggled on mobile */}
        <div className={`${showMap ? 'block' : 'hidden'} lg:block flex-1`} style={{ minHeight: "calc(100vh - 8rem)" }}>
          <div className="sticky top-0 h-[calc(100vh-8rem)]">
            <Suspense fallback={<div className="flex h-full items-center justify-center bg-muted"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
              <DirectoryMap locations={mapLocations} visible={showMap} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Directory;
