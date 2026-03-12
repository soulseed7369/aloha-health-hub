import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, LocateFixed, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-homepage.jpg";
import { useAliasMap } from "@/hooks/useSearchListings";

const ISLAND_OPTIONS = [
  { value: 'all', label: 'All Islands' },
  { value: 'big_island', label: 'Big Island' },
  { value: 'oahu', label: "Oʻahu" },
  { value: 'maui', label: 'Maui' },
  { value: 'kauai', label: "Kauaʻi" },
];

// Popular searches — shown as quick-tap chips below the search box
const POPULAR_SEARCHES: { label: string; emoji: string }[] = [
  { label: 'Yoga', emoji: '🧘' },
  { label: 'Massage', emoji: '💆' },
  { label: 'Reiki', emoji: '✨' },
  { label: 'Breathwork', emoji: '🌬️' },
  { label: 'Sound Healing', emoji: '🎵' },
  { label: 'Acupuncture', emoji: '🪡' },
  { label: 'Life Coaching', emoji: '🌱' },
  { label: 'Naturopathic', emoji: '🌿' },
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
}

export function SearchBar({
  island: initialIsland = 'big_island',
  heroImageUrl,
  heroTitle = "Find Your Path to Wellness",
  heroSubtitle = "Discover holistic practitioners, retreats & wellness centers across Hawai'i",
}: SearchBarProps = {}) {
  const navigate = useNavigate();
  const [what, setWhat] = useState('');
  const [island, setIsland] = useState(initialIsland);
  const [debouncedWhat, setDebouncedWhat] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // ── Geolocation / location state ──────────────────────────────────────────
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null); // null = GPS, string = zip label

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
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        setLocationLabel(null); // GPS, no label
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: latitude, lng: longitude }));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const handleZipSearch = async () => {
    if (zipInput.trim().length < 2) return;
    setGeocoding(true);
    setZipError('');
    try {
      // Append ", Hawaii" for town queries so "Hilo" doesn't resolve to another state
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
        setLocationLabel(zipInput);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: latitude, lng: longitude, label: zipInput }));
        setShowZipInput(false);
        setZipInput('');
      } else {
        setZipError('Zip code not found');
      }
    } catch {
      setZipError('Could not look up zip code');
    }
    setGeocoding(false);
  };

  const handleClearLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleChipClick = (label: string) => {
    setWhat(label);
    handleSearch(label);
  };

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
    // overflow-x-hidden clips the hero image edges but does NOT clip the autocomplete dropdown vertically
    <section className="relative overflow-x-hidden py-20 md:py-28">
      <img
        src={bgImage}
        alt="Hawaii wellness"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-foreground/45" />
      <div className="container relative z-10">
        <h1 className="mb-2 text-center font-display text-3xl font-bold text-primary-foreground md:text-5xl">
          {heroTitle}
        </h1>
        <p className="mb-6 text-center text-lg text-primary-foreground/85">
          {heroSubtitle}
        </p>

        {/* ── Search card ─────────────────────────────────────── */}
        <div className="mx-auto max-w-2xl">
          {/* Two-row search card */}
          <div className="rounded-xl bg-background/80 shadow-xl backdrop-blur-md">

            {/* Row 1: Search input + Search button */}
            <div className="flex items-center gap-2 p-4 pb-3">
              <div className="relative flex-1" ref={wrapperRef}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Modality, concern, or name…"
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

            {/* Divider */}
            <div className="mx-4 h-px bg-border/40" />

            {/* Row 2: Location + Island selector */}
            <div className="flex items-center gap-3 px-4 py-3">

              {/* ── Location section ─────────────────────────────── */}
              {hasLocation ? (
                // Active location — green indicator
                <button
                  type="button"
                  onClick={handleClearLocation}
                  title="Click to clear location"
                  className="flex items-center gap-1.5 rounded-lg border border-green-500/40 bg-green-50 px-3 h-9 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50 flex-shrink-0"
                >
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                  <span className="whitespace-nowrap">
                    {locationLabel ? `Near: ${locationLabel}` : 'Near me'} ✓
                  </span>
                  <span
                    role="button"
                    aria-label="Clear location"
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                    onClick={handleClearLocation}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ) : showZipInput ? (
                // Town / zip input mode
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative">
                    <Input
                      ref={zipInputRef}
                      type="text"
                      placeholder="Town or zip code"
                      value={zipInput}
                      onChange={e => {
                        setZipInput(e.target.value);
                        setZipError('');
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') handleZipSearch(); if (e.key === 'Escape') handleCancelZip(); }}
                      className="h-9 w-40 text-sm"
                    />
                    {zipError && (
                      <p className="absolute top-full mt-1 whitespace-nowrap text-xs text-destructive">{zipError}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={handleZipSearch}
                    disabled={geocoding || zipInput.trim().length < 2}
                  >
                    {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Go'}
                  </Button>
                  <button
                    type="button"
                    onClick={handleCancelZip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                // Default: GPS + zip options
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating}
                    className="flex items-center gap-1.5 rounded-lg border border-input bg-background/60 px-3 h-9 text-sm text-muted-foreground hover:bg-background hover:text-foreground transition-colors flex-shrink-0"
                  >
                    {locating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LocateFixed className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                    <span className="whitespace-nowrap">
                      {locating ? 'Locating…' : 'Near me'}
                    </span>
                  </button>
                  <span className="text-xs text-muted-foreground">or</span>
                  <button
                    type="button"
                    onClick={() => setShowZipInput(true)}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    enter town or zip
                  </button>
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Island selector */}
              <Select value={island} onValueChange={setIsland}>
                <SelectTrigger className="h-9 w-32 border-input bg-background/60 text-sm flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISLAND_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Popular search chips — hidden while autocomplete dropdown is open ── */}
          <div className={`mt-4 flex flex-wrap items-center justify-center gap-2 transition-opacity duration-150 ${showDropdown ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <span className="text-xs text-primary-foreground/60 font-medium">Try:</span>
            {POPULAR_SEARCHES.map(({ label, emoji }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleChipClick(label)}
                className="flex items-center gap-1 rounded-full bg-background/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:bg-background/35 border border-primary-foreground/20"
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
