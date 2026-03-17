import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, CheckCircle } from "lucide-react";

// ── Island badge (compact, for use in cards) ─────────────────────────────────
const ISLAND_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  big_island: { label: "Big Island", icon: "🌋", color: "#7c3aed", bg: "#f5f3ff" },
  maui:       { label: "Maui",       icon: "🌿", color: "#065f46", bg: "#ecfdf5" },
  oahu:       { label: "Oʻahu",      icon: "🏙️",  color: "#1e40af", bg: "#eff6ff" },
  kauai:      { label: "Kauaʻi",    icon: "🌺",  color: "#92400e", bg: "#fef3c7" },
};
function IslandPill({ island }: { island: string }) {
  const cfg = ISLAND_CFG[island];
  if (!cfg) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}
import type { Provider } from "@/data/mockData";
import { Link } from "react-router-dom";
import { formatDistance } from "@/lib/geoUtils";
import { TierBadge } from "@/components/TierBadge";

// ── Avatar fallback: initials on a gradient background ───────────────────────
const GRADIENT_PAIRS = [
  ["from-teal-400 to-cyan-500", "text-white"],
  ["from-emerald-400 to-green-500", "text-white"],
  ["from-violet-400 to-purple-500", "text-white"],
  ["from-amber-400 to-orange-500", "text-white"],
  ["from-rose-400 to-pink-500", "text-white"],
];

function AvatarFallback({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const idx = name.charCodeAt(0) % GRADIENT_PAIRS.length;
  const [gradient, textColor] = GRADIENT_PAIRS[idx];
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} font-semibold ${textColor} ${className}`}>
      {initials}
    </div>
  );
}

// ── Modality → colour class ───────────────────────────────────────────────────
const MODALITY_SAGE = new Set([
  "Massage","Craniosacral","Reiki","Energy Healing","Lomilomi / Hawaiian Healing",
  "Hawaiian Healing","Watsu / Water Therapy","Physical Therapy","Osteopathic",
  "Chiropractic","Network Chiropractic","Acupuncture","TCM (Traditional Chinese Medicine)",
  "Ayurveda","Naturopathic","Functional Medicine","Herbalism","IV Therapy","Longevity",
  "Dentistry","Nervous System Regulation",
]);
const MODALITY_OCEAN = new Set([
  "Yoga","Breathwork","Meditation","Nature Therapy","Sound Healing","Art Therapy",
]);
const MODALITY_TERRA = new Set([
  "Psychotherapy","Counseling","Life Coaching","Hypnotherapy","Family Constellation",
  "Soul Guidance","Astrology","Psychic","Ritualist","Birth Doula","Midwife",
  "Women's Health","Trauma-Informed Care","Somatic Therapy",
]);

/** Returns a Tailwind className string for a modality pill based on its category */
function modalityBadgeClass(m: string): string {
  if (MODALITY_SAGE.has(m))  return "bg-sage-light text-sage border border-sage/30";
  if (MODALITY_OCEAN.has(m)) return "bg-ocean-light text-ocean border border-ocean/30";
  if (MODALITY_TERRA.has(m)) return "bg-terracotta-light text-terracotta border border-terracotta/30";
  return "bg-secondary text-secondary-foreground";
}

// ── Freshness: profile updated within 30 days ────────────────────────────────
function isRecentlyUpdated(updatedAt?: string): boolean {
  if (!updatedAt) return false;
  try {
    return (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24) <= 30;
  } catch { return false; }
}

// ── Tier → border / shadow classes ───────────────────────────────────────────
function tierCardClasses(tier?: string) {
  if (tier === "featured") return "border-2 border-amber-300 shadow-lg bg-amber-50/30";
  if (tier === "premium")  return "border border-sage/40 shadow";
  return "border border-border shadow-sm";
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  in_person: "In Person",
  online: "Online",
  both: "In Person & Online",
};

interface ProviderCardProps {
  provider: Provider;
  highlightModality?: string;
  /** Compact mode: slim horizontal layout for directory list views */
  compact?: boolean;
}

export function ProviderCard({ provider, highlightModality, compact = false }: ProviderCardProps) {
  const displayModalities = provider.modalities ?? (provider.modality ? [provider.modality] : []);

  // Bubble the searched/matched modality to the front
  const sorted = highlightModality
    ? [...displayModalities].sort((a, b) => {
        const hl = highlightModality.toLowerCase();
        const aMatch = a.toLowerCase().includes(hl) || hl.includes(a.toLowerCase());
        const bMatch = b.toLowerCase().includes(hl) || hl.includes(b.toLowerCase());
        return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
      })
    : displayModalities;

  const hasImage = !!provider.image && !provider.image.includes("no%20image") && !provider.image.includes("no image");

  // ── Compact (directory list) layout ────────────────────────────────────────
  if (compact) {
    const visibleModalities = sorted.slice(0, 3);
    const extraCount = displayModalities.length - visibleModalities.length;
    return (
      <Link to={`/profile/${provider.id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        <Card className={`overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.01] ${tierCardClasses(provider.tier)}`}>
          <div className="flex gap-4 p-4">
            {/* Avatar — 72px for stronger human presence */}
            {hasImage ? (
              <img
                src={provider.image}
                alt={`Photo of ${provider.name}`}
                className="h-[72px] w-[72px] flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <AvatarFallback name={provider.name} className="h-[72px] w-[72px] flex-shrink-0 rounded-lg text-xl" />
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* Personal name always primary — never replaced by business name */}
                  <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors leading-tight flex items-center gap-1">
                    {provider.name}
                    {provider.verified && <CheckCircle className="h-3.5 w-3.5 text-sage flex-shrink-0" />}
                  </h3>
                  {/* Business name always a muted subtitle */}
                  {provider.businessName && (
                    <p className="truncate text-xs text-muted-foreground">{provider.businessName}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {isRecentlyUpdated(provider.updatedAt) && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                      ✦ Updated
                    </span>
                  )}
                  {provider.tier && provider.tier !== "free" && (
                    <TierBadge tier={provider.tier} />
                  )}
                </div>
              </div>
              {/* Bio snippet — 1 line teaser */}
              {provider.bio && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground/80 italic leading-snug">{provider.bio}</p>
              )}
              {/* Location row — city + island badge side by side */}
              <div className="mt-1 mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{provider.location?.split(',')[0]}</span>
                {provider.distanceMiles != null && (
                  <span className="flex-shrink-0 text-muted-foreground/70">· {formatDistance(provider.distanceMiles)}</span>
                )}
                {provider.island && <IslandPill island={provider.island} />}
              </div>
              {/* Colour-coded modality pills by category */}
              {visibleModalities.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {visibleModalities.map((m) => (
                    <span key={m} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-normal ${modalityBadgeClass(m)}`}>{m}</span>
                  ))}
                  {extraCount > 0 && (
                    <Badge variant="outline" className="text-xs font-normal">+{extraCount} more</Badge>
                  )}
                </div>
              )}
              {/* Match explanation labels */}
              {(provider.matchedConcerns?.length || provider.matchedApproaches?.length) ? (
                <p className="mb-1 text-xs text-muted-foreground italic">
                  {provider.matchedConcerns && provider.matchedConcerns.length > 0 && (
                    <span>Helps with: {provider.matchedConcerns.slice(0, 3).join(", ")}</span>
                  )}
                  {provider.matchedConcerns?.length && provider.matchedApproaches?.length ? <span className="mx-1">·</span> : null}
                  {provider.matchedApproaches && provider.matchedApproaches.length > 0 && (
                    <span>Approach: {provider.matchedApproaches.slice(0, 3).join(", ")}</span>
                  )}
                </p>
              ) : null}
              {/* Session type + accepting + Book CTA */}
              <div className="flex flex-wrap items-center gap-1.5">
                {provider.sessionType && provider.sessionType !== "in_person" && (
                  <span className="text-xs text-muted-foreground">
                    {SESSION_TYPE_LABELS[provider.sessionType] ?? provider.sessionType}
                  </span>
                )}
                {provider.acceptsNewClients === true && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Accepting Clients
                  </span>
                )}
                {provider.acceptsNewClients === false && (
                  <span className="text-xs text-muted-foreground/60">Not accepting</span>
                )}
                {provider.externalBookingUrl && (
                  <a
                    href={provider.externalBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Book <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // ── Full (homepage) vertical card layout ───────────────────────────────────
  const visibleModalities = sorted.slice(0, 2);
  const extraCount = displayModalities.length - visibleModalities.length;

  return (
    <Link to={`/profile/${provider.id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className={`relative flex h-80 flex-col overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 ${tierCardClasses(provider.tier)}`}>
        {/* Tier badge — top-right */}
        {provider.tier && provider.tier !== "free" && (
          <div className="absolute right-3 top-3 z-10">
            <TierBadge tier={provider.tier} />
          </div>
        )}

        {/* Avatar — centered at top */}
        <div className="flex justify-center pt-5">
          {hasImage ? (
            <img
              src={provider.image}
              alt={`Photo of ${provider.name}`}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-background shadow"
              loading="lazy"
            />
          ) : (
            <AvatarFallback name={provider.name} className="h-20 w-20 rounded-full text-xl ring-2 ring-background shadow" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col px-4 pt-3 pb-4 text-center">
          {/* Personal name always primary */}
          <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors leading-snug">
            {provider.name}
          </h3>
          {/* Business name always a separate muted subtitle — never replaces personal name */}
          {provider.businessName && (
            <p className="truncate text-xs text-muted-foreground">{provider.businessName}</p>
          )}
          <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{provider.location}</span>
            {provider.distanceMiles != null && (
              <span className="flex-shrink-0 text-muted-foreground/60">
                · {formatDistance(provider.distanceMiles)}
              </span>
            )}
          </div>
          {provider.bio && (
            <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">{provider.bio}</p>
          )}
          {!provider.bio && <div className="flex-1" />}
          {(provider.matchedConcerns?.length || provider.matchedApproaches?.length) ? (
            <p className="mt-1 text-[10px] text-muted-foreground italic line-clamp-1">
              {provider.matchedConcerns && provider.matchedConcerns.length > 0 && (
                <span>Helps with: {provider.matchedConcerns.slice(0, 2).join(", ")}</span>
              )}
              {provider.matchedConcerns?.length && provider.matchedApproaches?.length ? <span className="mx-1">·</span> : null}
              {provider.matchedApproaches && provider.matchedApproaches.length > 0 && (
                <span>Approach: {provider.matchedApproaches.slice(0, 2).join(", ")}</span>
              )}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
            {visibleModalities.length > 1 && visibleModalities.slice(1).map((m) => (
              <span key={m} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-normal ${modalityBadgeClass(m)}`}>{m}</span>
            ))}
            {extraCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal py-0">+{extraCount}</Badge>
            )}
            {provider.acceptsNewClients === true && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Accepting
              </span>
            )}
            {provider.sessionType && provider.sessionType !== "in_person" && (
              <span className="text-[10px] text-muted-foreground">
                {SESSION_TYPE_LABELS[provider.sessionType] ?? provider.sessionType}
              </span>
            )}
          </div>
          {isRecentlyUpdated(provider.updatedAt) && (
            <span className="mt-1.5 inline-flex items-center self-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
              ✦ Updated
            </span>
          )}
          <div className="mt-2 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity group-hover:opacity-90">
            View Profile →
          </div>
        </div>
      </Card>
    </Link>
  );
}
