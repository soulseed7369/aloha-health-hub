import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { MapPin, Building2, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import type { Center } from "@/data/mockData";
import { Link } from "react-router-dom";
import { formatDistance } from "@/lib/geoUtils";
import { TierBadge } from "@/components/TierBadge";
import {
  modalityBadgeClass,
  tierCardClasses,
  isRecentlyUpdated,
  isValidListingImage,
  sortModalities,
  ISLAND_CFG,
  GRADIENT_PAIRS,
  avatarGradient,
  centerTypeLabel,
  getOpenStatus,
} from "@/lib/cardUtils";

// ── Island badge (compact, for use in cards) ─────────────────────────────────
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

// ── Avatar fallback with Building2 icon ──────────────────────────────────────
function AvatarFallback({ name, className }: { name: string; className?: string }) {
  const { gradient, textColor } = avatarGradient(name);
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${textColor} ${className}`}
    >
      <Building2 className="h-8 w-8 opacity-80" />
    </div>
  );
}

interface CenterCardProps {
  center: Center;
  highlightModality?: string;
  /** Compact mode: slim horizontal layout for directory list views */
  compact?: boolean;
}

export function CenterCard({
  center,
  highlightModality,
  compact = false,
}: CenterCardProps) {
  const displayModalities = center.modalities ?? (center.modality ? [center.modality] : []);
  const sorted = sortModalities(displayModalities, highlightModality);
  const hasImage = isValidListingImage(center.image);

  // ── Compact (directory list) layout ────────────────────────────────────────
  if (compact) {
    const isFeatured = center.tier === 'featured';
    const isPremium = center.tier === 'premium';
    const isEnhanced = isFeatured || isPremium;

    // Featured/premium: show ALL modalities. Free: cap at 3.
    const visibleModalities = isEnhanced ? sorted : sorted.slice(0, 3);
    const extraCount = isEnhanced ? 0 : displayModalities.length - visibleModalities.length;

    return (
      <Link
        to={`/center/${center.id}`}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <Card
          className={`overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.01] ${tierCardClasses(center.tier)} ${isFeatured ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-sky-300"}`}
        >
          <div className="flex gap-3 p-3">
            {/* Avatar column: image + type label underneath */}
            <div className="flex flex-col items-center flex-shrink-0 gap-1">
              {hasImage ? (
                <OptimizedImage
                  src={center.image}
                  alt={`Photo of ${center.name}`}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <AvatarFallback
                  name={center.name}
                  className="h-16 w-16 rounded-lg"
                />
              )}
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-sky-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                {center.centerType ? centerTypeLabel(center.centerType) : 'Center'}
              </span>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {/* Row 1: Name + verified + tier badge */}
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <h3 className="truncate font-display text-sm font-semibold group-hover:text-primary transition-colors leading-tight">
                    {center.name}
                  </h3>
                  {isEnhanced && (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" aria-label="Verified" />
                  )}
                </div>
                {center.tier && center.tier !== "free" && (
                  <TierBadge tier={center.tier} />
                )}
              </div>

              {/* Row 2: Location + open status on same line */}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-muted-foreground leading-tight">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{center.location?.split(",")[0]}</span>
                {center.distanceMiles != null && (
                  <span className="flex-shrink-0 text-muted-foreground/70">
                    · {formatDistance(center.distanceMiles)}
                  </span>
                )}
                {getOpenStatus(center.workingHours)?.isOpen && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                    · <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Open
                  </span>
                )}
              </div>

              {/* Row 3: Modality pills */}
              {visibleModalities.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1" role="list" aria-label="Services">
                  {visibleModalities.map((m) => (
                    <span
                      key={m}
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-normal leading-none ${modalityBadgeClass(m)}`}
                      role="listitem"
                    >
                      {m}
                    </span>
                  ))}
                  {extraCount > 0 && (
                    <Badge variant="outline" className="text-[11px] font-normal px-1.5 py-0.5 leading-none">
                      +{extraCount} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Featured/Premium: Description excerpt — free tier hides this */}
              {isEnhanced && (center.description || center.bio) && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-snug">
                  {center.description || center.bio}
                </p>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // ── Full (homepage) vertical card layout ───────────────────────────────────
  const [currentSlide, setCurrentSlide] = useState(0);
  const showPhotoCarousel =
    center.photos && center.photos.length > 0 && center.tier === "featured";
  const visibleModalities = sorted.slice(0, 2);
  const extraCount = displayModalities.length - visibleModalities.length;

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentSlide((prev) =>
      prev === 0 ? (center.photos?.length ?? 1) - 1 : prev - 1
    );
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentSlide((prev) => ((prev + 1) % (center.photos?.length ?? 1)));
  };

  return (
    <Link
      to={`/center/${center.id}`}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card
        className={`relative flex h-80 flex-col overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 ${tierCardClasses(center.tier)} ${center.tier === "featured" ? "border-l-4 border-l-amber-400" : ""}`}
      >
        {/* Tier badge — top-right */}
        {center.tier && center.tier !== "free" && (
          <div className="absolute right-3 top-3 z-10">
            <TierBadge tier={center.tier} />
          </div>
        )}

        {showPhotoCarousel ? (
          <>
            {/* Photo carousel for featured tier */}
            <div className="relative h-[140px] w-full overflow-hidden bg-gray-100">
              <div className="absolute inset-0 flex">
                {center.photos?.map((photo, idx) => (
                  <OptimizedImage
                    key={idx}
                    src={photo}
                    alt={`${center.name} photo ${idx + 1}`}
                    width={320}
                    height={140}
                    className={`h-[140px] w-full object-cover transition-opacity duration-300 ${
                      idx === currentSlide ? "opacity-100" : "opacity-0 absolute"
                    }`}
                    loading={idx === currentSlide ? "eager" : "lazy"}
                  />
                ))}
              </div>

              {/* Center type label — top-left corner */}
              {center.centerType && (
                <div className="absolute top-2 left-2 z-[5] bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-teal-700 text-[10px] font-medium border border-teal-200/60">
                  {centerTypeLabel(center.centerType)}
                </div>
              )}

              {/* Prev/next buttons on hover */}
              <button
                onClick={handlePrevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-[6] opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-[6] opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                aria-label="Next photo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Dot indicators at bottom */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[5] flex gap-1">
                {center.photos?.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      idx === currentSlide
                        ? "bg-white w-3"
                        : "bg-white/50 hover:bg-white/75"
                    }`}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Avatar — centered at top for non-featured or featured without photos */}
            <div className="flex justify-center pt-5 relative">
              {hasImage ? (
                <OptimizedImage
                  src={center.image}
                  alt={`Photo of ${center.name}`}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-background shadow"
                  loading="lazy"
                />
              ) : (
                <AvatarFallback
                  name={center.name}
                  className="h-20 w-20 rounded-full ring-2 ring-background shadow"
                />
              )}
              {/* Center type label in top-left corner */}
              {center.centerType && (
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-teal-700 text-[10px] font-medium border border-teal-200/60">
                  {centerTypeLabel(center.centerType)}
                </div>
              )}
            </div>
          </>
        )}

        {/* Info section */}
        <div className="flex flex-1 flex-col px-4 pt-3 pb-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <h3 className="truncate font-display text-base font-semibold group-hover:text-primary transition-colors leading-snug">
              {center.name}
            </h3>
            {(center.tier === "premium" || center.tier === "featured") && (
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" aria-label="Verified" />
            )}
          </div>
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
            <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">
              {center.description}
            </p>
          )}
          {!center.description && <div className="flex-1" />}

          {/* Color-coded modality chips + open/closed status */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
            {visibleModalities.length > 0 &&
              visibleModalities.map((m) => (
                <span
                  key={m}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-normal ${modalityBadgeClass(m)}`}
                  role="listitem"
                >
                  {m}
                </span>
              ))}
            {extraCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal py-0">
                +{extraCount}
              </Badge>
            )}
            {getOpenStatus(center.workingHours) &&
              (getOpenStatus(center.workingHours)?.isOpen ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Open
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/60">Closed</span>
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
