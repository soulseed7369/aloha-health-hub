import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const CENTER_TYPE_LABELS: Record<string, string> = {
  spa: "Spa",
  wellness_center: "Wellness Center",
  clinic: "Clinic",
  retreat_center: "Retreat Center",
};

interface CenterCardProps {
  center: Center;
  highlightModality?: string;
}

export function CenterCard({ center, highlightModality }: CenterCardProps) {
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

  // Show up to 2 modality pills on the card
  const visibleModalities = sorted.slice(0, 2);
  const extraCount = displayModalities.length - visibleModalities.length;
  const hasImage = !!center.image && !center.image.includes("no%20image") && !center.image.includes("no image");

  // Subtitle: first modality or first service
  const subtitle = visibleModalities[0] ?? center.services?.[0];

  return (
    <Link to={`/center/${center.id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className={`relative flex h-80 flex-col overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 ${tierCardClasses(center.tier)}`}>
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
          {/* Name */}
          <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors leading-snug">
            {center.name}
          </h3>

          {/* Subtitle: center type or top modality */}
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}

          {/* Location + distance */}
          <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{center.location}</span>
            {center.distanceMiles != null && (
              <span className="flex-shrink-0 text-muted-foreground/60">
                · {formatDistance(center.distanceMiles)}
              </span>
            )}
          </div>

          {/* Description snippet */}
          {center.description && (
            <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">
              {center.description}
            </p>
          )}

          {/* Spacer when no description */}
          {!center.description && <div className="flex-1" />}

          {/* Modality / service pills */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1" role="list" aria-label="Services">
            {visibleModalities.length > 1 && visibleModalities.slice(1).map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px] font-normal py-0" role="listitem">
                {m}
              </Badge>
            ))}
            {extraCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal py-0">
                +{extraCount}
              </Badge>
            )}
            {/* Legacy services fallback */}
            {displayModalities.length === 0 && center.services?.slice(0, 2).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] font-normal py-0" role="listitem">
                {s}
              </Badge>
            ))}
          </div>

          {/* CTA — pinned to bottom */}
          <div className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity group-hover:opacity-90">
            View Center →
          </div>
        </div>
      </Card>
    </Link>
  );
}
