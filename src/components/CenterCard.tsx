import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MapPin, Building2 } from "lucide-react";
import type { Center } from "@/data/mockData";
import { Link } from "react-router-dom";
import { formatDistance } from "@/lib/geoUtils";
import { TierBadge } from "@/components/TierBadge";

// ── Avatar fallback ──────────────────────────────────────────────────────────
const GRADIENT_PAIRS = [
  ["from-teal-400 to-cyan-500", "text-white"],
  ["from-emerald-400 to-green-500", "text-white"],
  ["from-violet-400 to-purple-500", "text-white"],
  ["from-amber-400 to-orange-500", "text-white"],
  ["from-rose-400 to-pink-500", "text-white"],
];

function AvatarFallback({ name, className }: { name: string; className?: string }) {
  const idx = name.charCodeAt(0) % GRADIENT_PAIRS.length;
  const [gradient, textColor] = GRADIENT_PAIRS[idx];
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${textColor} ${className}`}>
      <Building2 className="h-8 w-8 opacity-80" />
    </div>
  );
}

// ── Tier → border / shadow classes ───────────────────────────────────────────
function tierCardClasses(tier?: string) {
  if (tier === "featured") return "border-2 border-amber-300 shadow-lg bg-amber-50/30";
  if (tier === "premium")  return "border border-sage/40 shadow";
  return "border border-border shadow-sm";
}

interface CenterCardProps {
  center: Center;
  highlightModality?: string;
  /** Compact mode: slim horizontal layout for directory list views */
  compact?: boolean;
}

export function CenterCard({ center, highlightModality, compact = false }: CenterCardProps) {
  const displayModalities = center.modalities ?? (center.modality ? [center.modality] : []);

  // Bubble the searched/matched modality to the front
  const sorted = highlightModality
    ? [...displayModalities].sort((a, b) => {
        const hl = highlightModality.toLowerCase();
        const aMatch = a.toLowerCase().includes(hl) || hl.includes(a.toLowerCase());
        const bMatch = b.toLowerCase().includes(hl) || hl.includes(b.toLowerCase());
        return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
      })
    : displayModalities;

  const hasImage = !!center.image && !center.image.includes("no%20image") && !center.image.includes("no image");

  // ── Compact (directory list) layout ────────────────────────────────────────
  if (compact) {
    const visibleModalities = sorted.slice(0, 3);
    const extraCount = displayModalities.length - visibleModalities.length;
    return (
      <Link to={`/center/${center.id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        <Card className={`overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.01] ${tierCardClasses(center.tier)} ${center.tier === 'featured' ? 'border-l-4 border-l-amber-400' : ''}`}>
          <div className="flex gap-4 p-4">
            {/* Image / fallback */}
            {hasImage ? (
              <img
                src={center.image}
                alt={`Photo of ${center.name}`}
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <AvatarFallback name={center.name} className="h-16 w-16 flex-shrink-0 rounded-lg" />
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors">
                  {center.name}
                </h3>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {center.verified && center.tier === "featured" && (
                    <VerifiedBadge size="sm" />
                  )}
                  {center.tier && center.tier !== "free" && (
                    <TierBadge tier={center.tier} />
                  )}
                </div>
              </div>
              <div className="mb-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{center.location}</span>
                {center.distanceMiles != null && (
                  <span className="ml-1 flex-shrink-0 text-xs text-muted-foreground/70">
                    · {formatDistance(center.distanceMiles)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1" role="list" aria-label="Services">
                {visibleModalities.map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs font-normal" role="listitem">{m}</Badge>
                ))}
                {extraCount > 0 && (
                  <Badge variant="outline" className="text-xs font-normal">+{extraCount} more</Badge>
                )}
                {displayModalities.length === 0 && center.services.slice(0, 3).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs font-normal" role="listitem">{s}</Badge>
                ))}
              </div>
              {/* Description excerpt for featured tier */}
              {center.tier === 'featured' && center.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{center.description}</p>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // ── Full (homepage) vertical card layout ───────────────────────────────────
  const visibleModalities = sorted.slice(0, 2);
  const extraCount = displayModalities.length - visibleModalities.length;
  const subtitle = visibleModalities[0] ?? center.services?.[0];

  return (
    <Link to={`/center/${center.id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className={`relative flex h-80 flex-col overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 ${tierCardClasses(center.tier)} ${center.tier === 'featured' ? 'border-l-4 border-l-amber-400' : ''}`}>
        {/* Tier badge — top-right */}
        {center.tier && center.tier !== "free" && (
          <div className="absolute right-3 top-3 z-10">
            <TierBadge tier={center.tier} />
          </div>
        )}

        {/* Avatar — centered at top */}
        <div className="flex justify-center pt-5">
          {hasImage ? (
            <img
              src={center.image}
              alt={`Photo of ${center.name}`}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-background shadow"
              loading="lazy"
            />
          ) : (
            <AvatarFallback name={center.name} className="h-20 w-20 rounded-full ring-2 ring-background shadow" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col px-4 pt-3 pb-4 text-center">
          <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors leading-snug">
            {center.name}
          </h3>
          {center.verified && center.tier === "featured" && (
            <div className="flex justify-center mt-1">
              <VerifiedBadge size="sm" />
            </div>
          )}
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{center.location}</span>
            {center.distanceMiles != null && (
              <span className="flex-shrink-0 text-muted-foreground/60">
                · {formatDistance(center.distanceMiles)}
              </span>
            )}
          </div>
          {center.description && (
            <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">{center.description}</p>
          )}
          {!center.description && <div className="flex-1" />}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1" role="list" aria-label="Services">
            {visibleModalities.length > 1 && visibleModalities.slice(1).map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px] font-normal py-0" role="listitem">{m}</Badge>
            ))}
            {extraCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal py-0">+{extraCount}</Badge>
            )}
            {displayModalities.length === 0 && center.services?.slice(0, 2).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] font-normal py-0" role="listitem">{s}</Badge>
            ))}
          </div>
          <div className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity group-hover:opacity-90">
            View Center →
          </div>
        </div>
      </Card>
    </Link>
  );
}
