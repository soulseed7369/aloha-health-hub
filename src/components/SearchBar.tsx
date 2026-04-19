import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LocateFixed, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-homepage.jpg";
import { useAliasMap } from "@/hooks/useSearchListings";
import { useNameSuggestions } from "@/hooks/useNameSuggestions";
import { findCityOnIsland, CITY_COORDS_BY_ISLAND, ISLAND_CITIES, ISLAND_DISPLAY_NAMES } from "@/lib/islandCities";

// Island tabs — all four islands live
const ISLAND_TABS = [
  { value: 'all',         label: 'All Islands', comingSoon: false, route: '/'           },
  { value: 'big_island',  label: 'Big Island',  comingSoon: false, route: '/big-island' },
  { value: 'maui',        label: 'Maui',        comingSoon: false, route: '/maui'       },
  { value: 'oahu',        label: 'Oahu',        comingSoon: false, route: '/oahu'       },
  { value: 'kauai',       label: 'Kauai',       comingSoon: false, route: '/kauai'      },
];

/** Set of island values that are currently active (not coming soon). */
const ACTIVE_ISLANDS = new Set(ISLAND_TABS.filter(t => !t.comingSoon).map(t => t.value));

/** Map lat/lng to a Hawaii island DB key, or null if outside all islands. */
function detectIslandFromCoords(lat: number, lng: number): string | null {
  if (lat >= 18.9 && lat <= 20.3 && lng >= -156.1 && lng <= -154.8) return 'big_island';
  if (lat >= 20.5 && lat <= 21.1 && lng >= -156.7 && lng <= -155.9) return 'maui';
  if (lat >= 21.2 && lat <= 21.75 && lng >= -158.3 && lng <= -157.6) return 'oahu';
  if (lat >= 21.8 && lat <= 22.3 && lng >= -159.8 && lng <= -159.3) return 'kauai';
  return null;
}

// Top 6 modalities — quick-tap chips below the hero search box.
// Kept to one row to reduce homepage density. Full 44 live in the guide.
const POPULAR_SEARCHES = [
  'Yoga',
  'Massage',
  'Acupuncture',
  'Reiki',
  'Meditation',
  'Breathwork',
];

const AXIS_LABELS: Record<string, string> = {
  modality: 'Modality',
  concern: 'Concern',
  approach: 'Approach',
  format: 'Format',
  audience: 'Audience',
  city: 'Locations',
};

const LOCATION_STORAGE_KEY = 'aloha_user_location';

interface Suggestion {
  id: number;
  label: string;
  axis: string;
  /** Set for name suggestions — navigate directly to profile on select */
  listingId?: string;
  listingType?: 'practitioner' | 'center';
  /** Set for city suggestions — select sets location + island */
  cityLat?: number;
  cityLng?: number;
  cityIsland?: string;
}

interface HeroImageSet {
  /** WebP srcSet string, e.g. "/hero-640w.webp 640w, /hero-1024w.webp 1024w" */
  srcSet: string;
  /** Sizes attribute for responsive loading */
  sizes: string;
  /** Fallback src (full-size WebP or original JPEG) */
  src: string;
}

interface SearchBarProps {
  island?: string;
  heroImageUrl?: string;
  /** Responsive hero images — when provided, overrides heroImageUrl with srcSet */
  heroImages?: HeroImageSet;
  heroTitle?: string;
  heroSubtitle?: string;
  /** Short trust/count badge rendered inside the hero above the search card, e.g. "120+ practitioners · Free to browse" */
  trustBadge?: string;
}

export function SearchBar({
  island: initialIsland = 'big_island',
  heroImageUrl,
  heroImages,
  heroTitle = "Find Your Path to Wellness",
  heroSubtitle = "Discover holistic practitioners & wellness centers across Hawai'i",
  trustBadge,
}: SearchBarProps = {}) {
  const navigate = useNavigate();
  const [what, setWhat] = useState('');
  const [island, setIsland] = useState(initialIsland);
  const [debouncedWhat, setDebouncedWhat] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // ── Animated placeholder (typewriter cycle) ──────────────────────────────
  const PLACEHOLDER_EXAMPLES = useMemo(() => [
    'yoga in Kona',
    'help with anxiety',
    'deep tissue massage',
    'lomilomi near Hilo',
    'trauma-informed therapy',
    'sleep issues',
    'gentle energy healing',
    'neck pain Waimea',
    'pregnancy massage',
    'holistic healing',
  ], []);

  const [placeholderText, setPlaceholderText] = useState('');
  const placeholderIdx = useRef(0);

  useEffect(() => {
    // Don't animate when user has typed something
    if (what) return;

    let charIdx = 0;
    let deleting = false;
    let timer: number;
    let cancelled = false;
    const phrase = () => PLACEHOLDER_EXAMPLES[placeholderIdx.current % PLACEHOLDER_EXAMPLES.length];

    const tick = () => {
      if (cancelled) return;
      if (!deleting) {
        charIdx++;
        setPlaceholderText(phrase().slice(0, charIdx));
        if (charIdx === phrase().length) {
          deleting = true;
          timer = window.setTimeout(tick, 2000);
          return;
        }
        timer = window.setTimeout(tick, 70);
      } else {
        charIdx--;
        setPlaceholderText(phrase().slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          placeholderIdx.current++;
          timer = window.setTimeout(tick, 400);
          return;
        }
        timer = window.setTimeout(tick, 35);
      }
    };

    timer = window.setTimeout(tick, 1000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [what, PLACEHOLDER_EXAMPLES]);

  // ── Geolocation / location state ──────────────────────────────────────────
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  // Location picker UI state
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showZipInput, setShowZipInput] = useState(false);
  const [zipInput, setZipInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [zipError, setZipError] = useState('');

  // Restore saved location on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        const { lat, lng, label } = JSON.parse(saved);
        if (typeof lat === 'number' && typeof lng === 'number') {
          setUserLat(lat);
          setUserLng(lng);
          if (typeof label === 'string') setLocationLabel(label);
        }
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  // Focus zip input when shown
  useEffect(() => {
    if (showZipInput) {
      setTimeout(() => zipInputRef.current?.focus(), 50);
    }
  }, [showZipInput]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setShowZipInput(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);

        // Auto-select island from coordinates (only if that island is live)
        const islandNames: Record<string, string> = { big_island: 'Big Island', maui: 'Maui', oahu: 'Oahu', kauai: 'Kauai' };
        const detected = detectIslandFromCoords(latitude, longitude);
        const isLive = detected && ACTIVE_ISLANDS.has(detected);

        if (isLive) {
          setIsland(detected);
          setLocationLabel(`Your location · ${islandNames[detected]}`);
        } else if (detected) {
          // On a coming-soon island — keep current island, still save coords for distance
          setLocationLabel(`Your location · ${islandNames[detected]} (coming soon)`);
        } else {
          // Outside Hawaii
          setLocationLabel('Your location');
        }

        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
          lat: latitude, lng: longitude,
          label: isLive ? `Your location · ${islandNames[detected]}` :
                 detected ? `Your location · ${islandNames[detected]} (coming soon)` : 'Your location',
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setShowZipInput(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleZipSearch = async () => {
    const raw = zipInput.trim();
    if (raw.length < 2) return;
    setGeocoding(true);
    setZipError('');

    const isZip = /^\d{5}$/.test(raw);

    // For city/town input (not a zip code), resolve against the *current*
    // island's city list before falling back to Nominatim. This prevents
    // ambiguous towns (Kailua on Oahu vs Kailua-Kona on Big Island; Waimea
    // on Big Island vs Kauai) from being geocoded to the wrong island.
    if (!isZip && island && island !== 'all') {
      const localHit = findCityOnIsland(raw, island);
      if (localHit) {
        setUserLat(localHit.lat);
        setUserLng(localHit.lng);
        const islandName = ISLAND_DISPLAY_NAMES[island] ?? island;
        const label = `${localHit.city} · ${islandName}`;
        setLocationLabel(label);
        localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify({ lat: localHit.lat, lng: localHit.lng, label })
        );
        setShowZipInput(false);
        setZipInput('');
        setGeocoding(false);
        return;
      }
    }

    try {
      // Bias Nominatim by the current island's name so ambiguous towns
      // resolve to the right island.
      const islandHint = !isZip && island && island !== 'all'
        ? (ISLAND_DISPLAY_NAMES[island] ?? '')
        : '';
      const query = isZip
        ? raw
        : islandHint
          ? `${raw}, ${islandHint}, Hawaii`
          : `${raw}, Hawaii`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'HawaiiWellness/1.0' } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const latitude = parseFloat(data[0].lat);
        const longitude = parseFloat(data[0].lon);
        setUserLat(latitude);
        setUserLng(longitude);
        const detected = detectIslandFromCoords(latitude, longitude);
        if (detected && ACTIVE_ISLANDS.has(detected)) setIsland(detected);
        const islandName = detected ? (ISLAND_DISPLAY_NAMES[detected] ?? null) : null;
        const label = islandName ? `${raw} · ${islandName}` : raw;
        setLocationLabel(label);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: latitude, lng: longitude, label }));
        setShowZipInput(false);
        setZipInput('');
      } else {
        setZipError('Location not found — try a different town or zip');
      }
    } catch {
      setZipError('Could not look up location');
    }
    setGeocoding(false);
  };

  const handleClearLocation = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUserLat(null);
    setUserLng(null);
    setLocationLabel(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  };

  const handleCancelZip = () => {
    setShowZipInput(false);
    setZipInput('');
    setZipError('');
  };

  // ── Autocomplete ────────────────────────────────────────────────────────────
  const { aliasMap } = useAliasMap();
  const { data: nameSuggestions = [] } = useNameSuggestions(debouncedWhat, island);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedWhat(what), 200);
    return () => clearTimeout(t);
  }, [what]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const results: Suggestion[] = [];

    // Taxonomy suggestions first (up to 6)
    if (aliasMap && debouncedWhat.length >= 2) {
      const q = debouncedWhat.toLowerCase();
      const seen = new Set<number>();
      for (const [key, term] of aliasMap) {
        if (seen.has(term.id)) continue;
        if (key.includes(q) || term.label.toLowerCase().includes(q)) {
          seen.add(term.id);
          results.push({ id: term.id, label: term.label, axis: term.axis });
        }
        if (results.length >= 6) break;
      }
    }

    // Name suggestions after (up to 3, virtual negative ids to avoid collision)
    for (let i = 0; i < Math.min(nameSuggestions.length, 3); i++) {
      const ns = nameSuggestions[i];
      results.push({
        id: -(i + 1),
        label: ns.label,
        axis: 'listing',
        listingId: ns.listingId,
        listingType: ns.listingType,
      });
    }

    // City suggestions — so "kailua" shows "Kailua, Oʻahu" and "Kailua-Kona,
    // Big Island" as distinct options, letting users pick the right place.
    if (debouncedWhat.length >= 2) {
      const q = debouncedWhat.toLowerCase();
      const islandsToSearch = island && island !== 'all'
        ? [island]
        : Object.keys(CITY_COORDS_BY_ISLAND);
      let cityIdx = -1000; // synthetic negative ids that don't collide with name suggestions
      for (const isl of islandsToSearch) {
        for (const [city, coords] of Object.entries(CITY_COORDS_BY_ISLAND[isl] ?? {})) {
          const c = city.toLowerCase();
          if (c.startsWith(q) || c.includes(q)) {
            const islandName = ISLAND_DISPLAY_NAMES[isl] ?? isl;
            results.push({
              id: cityIdx--,
              label: `${city}, ${islandName}`,
              axis: 'city',
              cityLat: coords.lat,
              cityLng: coords.lng,
              cityIsland: isl,
            });
          }
        }
      }
    }

    return results;
  }, [aliasMap, debouncedWhat, nameSuggestions, island]);

  const grouped = useMemo(() => {
    const groups: Record<string, Suggestion[]> = {};
    for (const s of suggestions) {
      if (!groups[s.axis]) groups[s.axis] = [];
      groups[s.axis].push(s);
    }
    return groups;
  }, [suggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((s: Suggestion) => {
    setIsOpen(false);
    setHighlightIdx(-1);
    if (s.listingId) {
      navigate(s.listingType === 'center' ? `/center/${s.listingId}` : `/profile/${s.listingId}`);
      return;
    }
    if (s.cityLat !== undefined && s.cityLng !== undefined) {
      // City selected — set location, switch island, navigate to directory
      const lat = s.cityLat;
      const lng = s.cityLng;
      setUserLat(lat);
      setUserLng(lng);
      const cityIsland = s.cityIsland ?? island;
      if (cityIsland && ACTIVE_ISLANDS.has(cityIsland)) setIsland(cityIsland);
      const label = s.label; // already "City, Island"
      setLocationLabel(label);
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat, lng, label }));
      // Navigate with location + island; keep any existing what query
      const params = new URLSearchParams();
      const q = what.trim();
      if (q) params.set('q', q);
      params.set('island', cityIsland && ACTIVE_ISLANDS.has(cityIsland) ? cityIsland : 'all');
      params.set('ulat', String(lat));
      params.set('ulng', String(lng));
      navigate(`/directory?${params.toString()}`);
      return;
    }
    setWhat(s.label);
  }, [navigate, island, what]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleSearch = (overrideWhat?: string) => {
    setIsOpen(false);
    const params = new URLSearchParams();
    const q = overrideWhat ?? what.trim();
    if (q) params.set('q', q);
    // Always emit island so Directory doesn't fall back to its own default.
    params.set('island', island || 'all');
    if (userLat !== null && userLng !== null) {
      params.set('ulat', String(userLat));
      params.set('ulng', String(userLng));
    }
    navigate(`/directory?${params.toString()}`);
  };

  // Chip clicks navigate with `?modality=` (not `?q=`) so the Directory's
  // contextual guide banner picks them up — each chip is a canonical modality.
  const handleChipClick = (label: string) => {
    setIsOpen(false);
    const params = new URLSearchParams();
    params.set('modality', label);
    params.set('island', island || 'all');
    if (userLat !== null && userLng !== null) {
      params.set('ulat', String(userLat));
      params.set('ulng', String(userLng));
    }
    navigate(`/directory?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setIsOpen(false); return; }
    if (e.key === 'Enter') {
      if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
        const s = suggestions[highlightIdx];
        handleSelect(s);
        e.preventDefault();
        return;
      }
      handleSearch();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
  };

  const hasLocation = userLat !== null && userLng !== null;
  const bgImage = heroImageUrl || heroImage;
  const showDropdown = isOpen && suggestions.length > 0;

  return (
    <section className="relative overflow-x-hidden py-20 md:py-28">
      {heroImages ? (
        <picture>
          <source
            type="image/webp"
            srcSet={heroImages.srcSet}
            sizes={heroImages.sizes}
          />
          <img
            src={heroImages.src}
            alt="Hawaii wellness"
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      ) : (
        <img
          src={bgImage}
          alt="Hawaii wellness"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          decoding="async"
        />
      )}
      <div className="absolute inset-0 bg-foreground/45" />
      <div className="container relative z-10">
        <h1 className="mb-2 text-balance text-center font-display text-2xl font-bold text-primary-foreground md:text-4xl">
          {heroTitle}
        </h1>
        <p className="mb-6 text-balance text-center text-base text-primary-foreground/85 md:text-lg">
          {heroSubtitle}
        </p>

        <div className="mx-auto max-w-2xl">

          {/* ── Trust badge ──────────────────────────────────────── */}
          {trustBadge && (
            <div className="mb-5 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-primary-foreground backdrop-blur-sm">
                <span className="text-emerald-300">✦</span>
                {trustBadge}
              </span>
            </div>
          )}

          {/* ── Island tabs ──────────────────────────────────────── */}
          <div className="mb-3 flex items-center justify-center gap-1 sm:gap-1.5">
            {ISLAND_TABS.map(tab => {
              const isActive = island === tab.value;
              if (tab.comingSoon) {
                return (
                  <span
                    key={tab.value}
                    title="Coming soon"
                    className="cursor-default select-none rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[13.5px] font-medium text-primary-foreground/50 sm:px-4 sm:py-1.5 sm:text-sm"
                  >
                    {tab.label}
                  </span>
                );
              }
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { setIsland(tab.value); navigate(tab.route); }}
                  className={`rounded-full px-2.5 py-1 text-[13.5px] font-medium transition-all sm:px-4 sm:py-1.5 sm:text-sm ${
                    isActive
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-primary-foreground/80 hover:bg-white/20 hover:text-primary-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Search card ──────────────────────────────────────────── */}
          <div className="rounded-xl bg-background/80 shadow-xl backdrop-blur-md">
            {/* What field */}
            <div className="flex items-center gap-2 px-3 pt-3">
              <div className="relative flex-1" ref={wrapperRef}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={what ? '' : (placeholderText || 'Search…')}
                  className="h-12 border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0"
                  value={what}
                  onChange={e => { setWhat(e.target.value); setIsOpen(true); setHighlightIdx(-1); }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
                  autoComplete="off"
                />

                {/* Autocomplete dropdown */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-64 overflow-y-auto rounded-lg border bg-background shadow-xl">
                    {Object.entries(grouped).map(([axis, items]) => (
                      <div key={axis}>
                        <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {axis === 'listing' ? 'Practitioners & Centers' : (AXIS_LABELS[axis] || axis)}
                        </div>
                        {items.map(item => {
                          const flatIdx = suggestions.indexOf(item);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${flatIdx === highlightIdx ? 'bg-accent' : ''}`}
                              onMouseDown={() => handleSelect(item)}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="h-12 px-7 flex-shrink-0" onClick={() => handleSearch()}>
                Search
              </Button>
            </div>

            {/* Where / location row — always visible inside the card */}
            <div className="border-t border-border/50 mx-3 mt-2" />
            <div className="flex items-center gap-2 px-3 pb-3 pt-2">
              <LocateFixed className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

              {hasLocation ? (
                /* Location set — show label + clear */
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className="text-sm text-emerald-600 font-medium truncate">
                    {locationLabel ?? 'Using your location'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleClearLocation()}
                    className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear location"
                  >
                    <X className="h-3 w-3" /> Change
                  </button>
                </div>
              ) : showCityPicker ? (
                /* City picker — island-scoped dropdown */
                <div className="flex flex-1 items-center gap-2">
                  <select
                    className="flex-1 h-8 rounded border border-border bg-background text-sm px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    defaultValue=""
                    onChange={(e) => {
                      const cityName = e.target.value;
                      if (!cityName) return;
                      const coords = CITY_COORDS_BY_ISLAND[island]?.[cityName];
                      if (!coords) return;
                      const islandName = ISLAND_DISPLAY_NAMES[island] ?? island;
                      const label = `${cityName} · ${islandName}`;
                      setUserLat(coords.lat);
                      setUserLng(coords.lng);
                      setLocationLabel(label);
                      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: coords.lat, lng: coords.lng, label }));
                      setShowCityPicker(false);
                    }}
                  >
                    <option value="" disabled>Select a town…</option>
                    {(ISLAND_CITIES[island] ?? []).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowCityPicker(false); setShowZipInput(true); }}
                    className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Zip code
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCityPicker(false)}
                    className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : showZipInput ? (
                /* Zip / town entry */
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={zipInputRef}
                      type="text"
                      placeholder="Enter zip code or town name"
                      value={zipInput}
                      onChange={e => { setZipInput(e.target.value); setZipError(''); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleZipSearch();
                        if (e.key === 'Escape') handleCancelZip();
                      }}
                      className="h-8 border-border bg-background text-sm focus-visible:ring-1"
                    />
                    {zipError && (
                      <p className="absolute top-full mt-1 whitespace-nowrap text-xs text-destructive">{zipError}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-8 flex-shrink-0"
                    onClick={handleZipSearch}
                    disabled={geocoding || zipInput.trim().length < 2}
                  >
                    {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Go'}
                  </Button>
                  <button
                    type="button"
                    onClick={handleCancelZip}
                    className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                /* Default — two clear CTAs side by side */
                <div className="flex flex-1 items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {locating
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <LocateFixed className="h-3.5 w-3.5" />
                    }
                    {locating ? 'Locating…' : 'Use my location'}
                  </button>
                  {island && island !== 'all' && (
                    <>
                      <span className="text-muted-foreground/50 text-xs">or</span>
                      <button
                        type="button"
                        onClick={() => setShowCityPicker(true)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Select a town
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Location status shown below card only when no location set and no zip input ── */}
          {/* (status is now shown inline inside the card above) */}

          {/* ── Modality chips ────────────────────────────────────── */}
          <div className={`mt-4 flex flex-wrap items-center justify-center gap-2 transition-opacity duration-150 ${showDropdown ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {POPULAR_SEARCHES.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleChipClick(label)}
                className="rounded-full border border-primary-foreground/25 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/20 hover:border-primary-foreground/50"
              >
                {label}
              </button>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
