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

// ── C-2 design tokens (matches ProviderCard P-3 system) ──────────────────────
const CIRCLE_SIZE = 130;
const CIRCLE_OV   = CIRCLE_SIZE / 2; // 65px

const TIER_RING: Record<string, string> = {
  featured: "#f59e0b",
  premium:  "#14b8a6",
  free:     "#d1d5db",
};

const TIER_GLOW: Record<string, string> = {
  featured: "0 0 0 2px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.18), 0 4px 18px rgba(0,0,0,0.07)",
  premium:  "0 0 0 2px rgba(45,212,191,0.46), 0 0 24px rgba(45,212,191,0.14), 0 4px 18px rgba(0,0,0,0.06)",
  free:     "0 2px 14px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
};

const PHOTO_GLOW: Record<string, string> = {
  featured: "0 6px 24px rgba(251,191,36,0.42)",
  premium:  "0 6px 20px rgba(45,212,191,0.36)",
  free:     "0 4px 16px rgba(0,0,0,0.13)",
};

const TIER_BORDER: Record<string, string> = {
  featured: "1.5px solid #f59e0b",
  premium:  "1.5px solid #14b8a6",
  free:     "1px solid #e7e5e4",
};

// Center type: prominent colored label
const CENTER_TYPE_COLOR: Record<string, string> = {
  spa:             "#be185d",
  wellness_center: "#0d9488",
  clinic:          "#1d4ed8",
  retreat_center:  "#7c3aed",
  fitness_center:  "#b45309",
  yoga_studio:     "#0d9488",
};

// Max service pills per tier
const SVC_CAP: Record<string, number> = {
  featured: 4,
  premium:  3,
  free:     2,
};

function tierKey(tier?: string): "featured" | "premium" | "free" {
  if (tier === "featured" || tier === "premium") return tier;
  return "free";
}

function getDividerBg(tier: string): string {
  if (tier === "featured") return "linear-gradient(90deg,#fde68a,#fef3c7,transparent)";
  if (tier === "premium")  return "linear-gradient(90deg,#99f6e4,#f0fdfa,transparent)";
  return "linear-gradient(90deg,#e7e5e4,transparent)";
}

function getButtonStyle(tier: string): { background: string; color: string } {
  if (tier === "featured") return { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white" };
  if (tier === "premium")  return { background: "linear-gradient(135deg,#14b8a6,#0d9488)", color: "white" };
  return { background: "#f5f5f4", color: "#78716c" };
}

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
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${textColor} ${className}`}>
      <Building2 className="h-8 w-8 opacity-80" />
    </div>
  );
}

// ── Verified dot ──────────────────────────────────────────────────────────────
function VerifiedDot() {
  return (
    <span
      style={{
        width: 14, height: 14, borderRadius: "50%", background: "#14b8a6",
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
      aria-label="Verified"
    >
      <svg width={7} height={7} viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

// ── Open / Closed row ─────────────────────────────────────────────────────────
function OpenRow({ isOpen }: { isOpen: boolean }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 5, fontSize: 10,
        fontWeight: 600, color: isOpen ? "#059669" : "#a8a29e",
      }}
    >
      <div
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: isOpen ? "#10b981" : "#d1d5db", flexShrink: 0,
        }}
      />
      {isOpen ? "Open now" : "Currently closed"}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CenterCard
// ────────────────────────────────────────────────────────────────────────────

interface CenterCardProps {
  center: Center;
  highlightModality?: string;
  /** Compact mode: slim horizontal layout for directory list views */
  compact?: boolean;
}

export function CenterCard({ center, highlightModality, compact = false }: CenterCardProps) {
  const displayModalities = center.modalities ?? (center.modality ? [center.modality] : []);
  const sorted    = sortModalities(displayModalities, highlightModality);
  const hasImage  = isValidListingImage(center.image);
  const openStatus = getOpenStatus(center.workingHours);

  // ── Compact (directory list) layout ────────────────────────────────────────
  if (compact) {
    const isFeatured = center.tier === 'featured';
    const isPremium  = center.tier === 'premium';
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
                <AvatarFallback name={center.name} className="h-16 w-16 rounded-lg" />
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
                {openStatus?.isOpen && (
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

  // ── Full card layout — C-2: Center Rich (Nunito + Cormorant, matched to P-3) ─
  const tier    = tierKey(center.tier);
  const isPaid  = tier === "featured" || tier === "premium";
  const maxSvc  = SVC_CAP[tier];
  const visibleMods = sorted.slice(0, maxSvc);
  const extraCount  = displayModalities.length - visibleMods.length;
  const btnStyle    = getButtonStyle(tier);
  const typeColor   = center.centerType ? (CENTER_TYPE_COLOR[center.centerType] ?? "#64748b") : "#64748b";
  const typeLabel   = center.centerType ? centerTypeLabel(center.centerType) : undefined;

  return (
    <Link
      to={`/center/${center.id}`}
      className="block h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[20px]"
    >
      {/* Outer wrapper: creates space for the circle that bleeds above the card */}
      <div
        style={{
          paddingTop: CIRCLE_OV,
          height: "100%",
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        {/* White card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            position: "relative",
            background: "white",
            borderRadius: 20,
            border: TIER_BORDER[tier],
            boxShadow: TIER_GLOW[tier],
            padding: `${CIRCLE_OV + 12}px 15px 15px`,
            transition: "transform .2s",
          }}
          className="group-hover:-translate-y-1"
        >
          {/* ── Floating circle photo ── */}
          <div
            style={{
              position: "absolute",
              top: -CIRCLE_OV,
              left: "50%",
              transform: "translateX(-50%)",
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: "50%",
              border: `4px solid ${TIER_RING[tier]}`,
              boxShadow: PHOTO_GLOW[tier],
              overflow: "hidden",
              background: "white",
              zIndex: 2,
            }}
          >
            {hasImage ? (
              <OptimizedImage
                src={center.image}
                alt={`Photo of ${center.name}`}
                width={CIRCLE_SIZE}
                height={CIRCLE_SIZE}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <AvatarFallback name={center.name} className="h-full w-full" />
            )}
          </div>

          {/* ── Floating tier badge ── */}
          {isPaid && (
            <div style={{ position: "absolute", top: 11, right: 13, zIndex: 5 }}>
              <TierBadge tier={center.tier} />
            </div>
          )}

          {/* ── HEADER section ── */}
          <div style={{ marginBottom: 11 }}>
            {/* Center type — prominent colored uppercase label */}
            {typeLabel && (
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: typeColor,
                  marginBottom: 3,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {typeLabel}
              </p>
            )}

            {/* Name — Cormorant Garamond for paid, Nunito 800 for free */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 3 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: isPaid ? 18 : 16,
                  fontWeight: isPaid ? 400 : 800,
                  fontFamily: isPaid ? "'Cormorant Garamond', serif" : "'Nunito', sans-serif",
                  color: "#1c1917",
                  lineHeight: 1.25,
                  flex: 1,
                }}
              >
                {center.name}
              </h3>
              {center.verified && (
                <div style={{ marginTop: isPaid ? 5 : 3 }}>
                  <VerifiedDot />
                </div>
              )}
            </div>

            {/* Location */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                fontSize: 10,
                color: "#a8a29e",
              }}
            >
              <MapPin className="h-2.5 w-2.5" />
              {center.location}
              {center.island && `, ${center.island.replace("_", " ")}`}
            </div>
          </div>

          {/* ── Tier-tinted section divider (matches P-3) ── */}
          <div
            style={{
              height: 1.5,
              background: getDividerBg(tier),
              marginBottom: 11,
            }}
          />

          {/* ── BODY section ── */}
          {/* Service pills (from modalities) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 9 }}>
            {visibleMods.map((m) => (
              <span
                key={m}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${modalityBadgeClass(m)}`}
              >
                {m}
              </span>
            ))}
            {extraCount > 0 && (
              <span style={{ fontSize: 10, color: "#a8a29e", alignSelf: "center" }}>+{extraCount} more</span>
            )}
          </div>

          {/* Description — shown for all tiers */}
          <p
            style={{
              fontSize: 11,
              color: "#6b7280",
              lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            {center.description || center.bio || "A local wellness center serving the community."}
          </p>

          {/* Spacer — pushes bottom row to card bottom */}
          <div style={{ flex: 1 }} />

          {/* ── Bottom row ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {/* Open/closed status — only shown when working hours are available */}
            {openStatus !== null ? (
              <OpenRow isOpen={openStatus.isOpen} />
            ) : (
              <div /> /* empty to keep flex layout */
            )}
            <button
              style={{
                padding: "6px 14px",
                borderRadius: 9,
                fontSize: 11,
                fontWeight: 800,
                border: "none",
                background: btnStyle.background,
                color: btnStyle.color,
                cursor: "pointer",
                flexShrink: 0,
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {isPaid ? "Explore →" : "View →"}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
