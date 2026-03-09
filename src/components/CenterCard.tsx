import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2 } from "lucide-react";
import type { Center } from "@/data/mockData";
import { Link } from "react-router-dom";

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

interface CenterCardProps {
  center: Center;
}

export function CenterCard({ center }: CenterCardProps) {
  const displayModalities = center.modalities ?? (center.modality ? [center.modality] : []);
  const visibleModalities = displayModalities.slice(0, 3);
  const extraCount = displayModalities.length - visibleModalities.length;
  const hasImage = !!center.image && !center.image.includes("no%20image") && !center.image.includes("no image");

  return (
    <Link to={`/center/${center.id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.01]">
        <div className="flex gap-4 p-4">
          {/* Image / fallback */}
          {hasImage ? (
            <img
              src={center.image}
              alt={`Photo of ${center.name}`}
              className="h-24 w-24 flex-shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <AvatarFallback name={center.name} className="h-24 w-24 flex-shrink-0 rounded-lg" />
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 truncate font-display text-base font-semibold group-hover:text-primary transition-colors">
              {center.name}
            </h3>

            {/* Location */}
            <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">Location: </span>
              <span className="truncate">{center.location}</span>
            </div>

            {/* Modality / service pills */}
            <div className="flex flex-wrap gap-1" role="list" aria-label="Services">
              {visibleModalities.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs font-normal" role="listitem">
                  {m}
                </Badge>
              ))}
              {extraCount > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{extraCount} more
                </Badge>
              )}
              {/* Legacy services fallback */}
              {displayModalities.length === 0 && center.services.slice(0, 3).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs font-normal" role="listitem">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
