import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink } from "lucide-react";
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
            {/* Avatar */}
            {hasImage ? (
              <img
                src={provider.image}
                alt={`Photo of ${provider.name}`}
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <AvatarFallback name={provider.name} className="h-16 w-16 flex-shrink-0 rounded-lg text-lg" />
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors">
                  {provider.name}
                </h3>
                {provider.tier && provider.tier !== "free" && (
                  <TierBadge tier={provider.tier} className="flex-shrink-0" />
                )}
              </div>
              {provider.businessName && (
                <p className="mb-0.5 truncate text-sm text-muted-foreground">{provider.businessName}</p>
              )}
              <div className="mb-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{provider.location}</span>
                {provider.distanceMiles != null && (
                  <span className="ml-1 flex-shrink-0 text-xs text-muted-foreground/70">
                    · {formatDistance(provider.distanceMiles)}
                  </span>
                )}
              </div>
              {/* Modality pills */}
              {visibleModalities.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {visibleModalities.map((m) => (
                    <Badge key={m} variant="secondary" className="text-xs font-normal">{m}</Badge>
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
          <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors leading-snug">
            {provider.name}
          </h3>
          {(visibleModalities[0] || provider.businessName) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {visibleModalities[0] ?? provider.businessName}
            </p>
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
              <Badge key={m} variant="secondary" className="text-[10px] font-normal py-0">{m}</Badge>
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
          <div className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity group-hover:opacity-90">
            View Profile →
          </div>
        </div>
      </Card>
    </Link>
  );
}
