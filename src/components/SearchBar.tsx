import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LocateFixed, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-homepage.jpg";
import { useAliasMap } from "@/hooks/useSearchListings";

// Island tabs — Big Island live, others coming soon
const ISLAND_TABS = [
  { value: 'big_island', label: 'Big Island', comingSoon: false },
  { value: 'maui',       label: 'Maui',       comingSoon: true  },
  { value: 'oahu',       label: 'Oahu',       comingSoon: true  },
  { value: 'kauai',      label: 'Kauai',      comingSoon: true  },
];

/** Map lat/lng to a Hawaii island DB key, or null if outside all islands. */
function detectIslandFromCoords(lat: number, lng: number): string | null {
  if (lat >= 18.9 && lat <= 20.3 && lng >= -156.1 && lng <= -154.8) return 'big_island';
  if (lat >= 20.5 && lat <= 21.1 && lng >= -156.7 && lng <= -155.9) return 'maui';
  if (lat >= 21.2 && lat <= 21.75 && lng >= -158.3 && lng <= -157.6) return 'oahu';
  if (lat >= 21.8 && lat <= 22.3 && lng >= -159.8 && lng <= -159.3) return 'kauai';
  return null;
}

// Top 10 modalities — shown as quick-tap chips below the hero search box
const POPULAR_SEARCHES = [
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
];

const AXIS_LABELS: Record<string, string> = {
  modality: 'Modality',
  concern: 'Concern',
  approach: 'Approach',
  format: 'Format',
  audience: 'Audience',
};

const LOCATION_STORAGE_KEY = 'aloha_user_location';

interface Suggestion {
  id: number;
  label: string;
  axis: string;
}

interface SearchBarProps {
  island?: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  /** Short trust/count badge rendered inside the hero above the search card, e.g. "120+ practitioners · Free to browse" */
  trustBadge?: string;
}

export function SearchBar({
  island: initialIsland = 'big_island',
  heroImageUrl,
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

  // Zip code UI state
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
        setLocationLabel(null);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: latitude, lng: longitude }));
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
    if (zipInput.trim().length < 2) return;
    setGeocoding(true);
    setZipError('');
    try {
      const query = /^\d{5}$/.test(zipInput.trim()) ? zipInput.trim() : `${zipInput.trim()}, Hawaii`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'AlohaHealthHub/1.0' } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const latitude = parseFloat(data[0].lat);
        const longitude = parseFloat(data[0].lon);
        setUserLat(latitude);
        setUserLng(longitude);
        const detected = detectIslandFromCoords(latitude, longitude);
        if (detected && island === 'all') setIsland(detected);
        const islandNames: Record<string, string> = { big_island: 'Big Island', maui: 'Maui', oahu: 'Oahu', kauai: 'Kauai' };
        const islandName = detected ? islandNames[detected] : null;
        const label = islandName ? `${zipInput.trim()} · ${islandName}` : zipInput.trim();
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedWhat(what), 200);
    return () => clearTimeout(t);
  }, [what]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!aliasMap || debouncedWhat.length < 2) return [];
    const q = debouncedWhat.toLowerCase();
    const seen = new Set<number>();
    const results: Suggestion[] = [];

    for (const [key, term] of aliasMap) {
      if (seen.has(term.id)) continue;
      if (key.includes(q) || term.label.toLowerCase().includes(q)) {
        seen.add(term.id);
        results.push({ id: term.id, label: term.label, axis: term.axis });
      }
      if (results.length >= 8) break;
    }
    return results;
  }, [aliasMap, debouncedWhat]);

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

  const handleSelect = useCallback((label: string) => {
    setWhat(label);
    setIsOpen(false);
    setHighlightIdx(-1);
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleSearch = (overrideWhat?: string) => {
    setIsOpen(false);
    const params = new URLSearchParams();
    const q = overrideWhat ?? what.trim();
    if (q) params.set('q', q);
    if (island && island !== 'all') params.set('island', island);
    if (userLat !== null && userLng !== null) {
      params.set('ulat', String(userLat));
      params.set('ulng', String(userLng));
    }
    navigate(`/directory?${params.toString()}`);
  };

  const handleChipClick = (label: string) => handleSearch(label);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setIsOpen(false); return; }
    if (e.key === 'Enter') {
      if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
        handleSelect(suggestions[highlightIdx].label);
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
      <img
        src={bgImage}
        alt="Hawaii wellness"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-foreground/45" />
      <div className="container relative z-10">
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-primary-foreground md:text-4xl">
          {heroTitle}
        </h1>
        <p className="mb-6 text-center text-lg text-primary-foreground/85">
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
          <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
            {ISLAND_TABS.map(tab => {
              const isActive = island === tab.value;
              if (tab.comingSoon) {
                return (
                  <span
                    key={tab.value}
                    title="Coming soon"
                    className="relative shrink-0 cursor-default select-none rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-foreground/70"
                  >
                    {tab.label}
                    <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground/80">soon</span>
                  </span>
                );
              }
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setIsland(tab.value)}
                  className={`shrink-0 rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
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
                          {AXIS_LABELS[axis] || axis}
                        </div>
                        {items.map(item => {
                          const flatIdx = suggestions.indexOf(item);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${flatIdx === highlightIdx ? 'bg-accent' : ''}`}
                              onMouseDown={() => handleSelect(item.label)}
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
                    {locationLabel ? `Near ${locationLabel}` : 'Using your location'}
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
                  <span className="text-muted-foreground/50 text-xs">or</span>
                  <button
                    type="button"
                    onClick={() => setShowZipInput(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Enter zip / town
                  </button>
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
