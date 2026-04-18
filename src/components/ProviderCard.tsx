import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { MapPin, CheckCircle } from "lucide-react";
import type { Provider } from "@/data/mockData";
import { Link } from "react-router-dom";
import { formatDistance } from "@/lib/geoUtils";
import { TierBadge } from "@/components/TierBadge";
import {
  ISLAND_CFG,
  GRADIENT_PAIRS,
  modalityBadgeClass,
  isRecentlyUpdated,
  tierCardClasses,
  avatarGradient,
  isValidListingImage,
  sortModalities,
  getObjectPosition,
  inferTitleFromModality,
} from "@/lib/cardUtils";

// ── P-3 design tokens ────────────────────────────────────────────────────────
const CIRCLE_SIZE = 130;
const CIRCLE_OV   = CIRCLE_SIZE / 2; // 65px — how far the circle bleeds above the card

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

const TIER_ACC: Record<string, string> = {
  featured: "#d97706",
  premium:  "#0d9488",
  free:     "#78716c",
};

// Max modality pills per tier
const MOD_CAP: Record<string, number> = {
  featured: 3,
  premium:  3,
  free:     2,
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  in_person: "In-Person",
  online:    "Online",
  both:      "In-Person & Online",
};

const SESSION_ICON: Record<string, string> = {
  in_person: "📍",
  online:    "💻",
  both:      "🌐",
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

// ── Avatar fallback: initials on gradient background ─────────────────────────
function AvatarFallback({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const { gradient, textColor } = avatarGradient(name);
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} font-semibold ${textColor} ${className}`}>
      {initials}
    </div>
  );
}

// ── Verified dot ──────────────────────────────────────────────────────────────
function VerifiedDot() {
  return (
    <span
      style={{
        width: 15, height: 15, borderRadius: "50%", background: "#14b8a6",
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
      aria-label="Verified"
    >
      <svg width={8} height={8} viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function VerifiedPill() {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0,
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 99, padding: "2px 7px",
        fontSize: 10, fontWeight: 700, color: "#16a34a",
        letterSpacing: "0.02em", fontFamily: "'Nunito', sans-serif",
      }}
      aria-label="Verified"
    >
      <svg width={9} height={9} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Verified
    </span>
  );
}

// ── Accepts indicator ─────────────────────────────────────────────────────────
function AcceptsIndicator({ accepts }: { accepts?: boolean }) {
  const isAccepting = accepts === true;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 5, fontSize: 10,
        fontWeight: 600, color: isAccepting ? "#059669" : "#a8a29e",
      }}
    >
      <div
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: isAccepting ? "#10b981" : "#d1d5db", flexShrink: 0,
        }}
      />
      {isAccepting ? "Accepting new clients" : "Not accepting"}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ProviderCard
// ────────────────────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: Provider;
  highlightModality?: string;
  /** Compact mode: slim horizontal layout for directory list views */
  compact?: boolean;
}

export function ProviderCard({ provider, highlightModality, compact = false }: ProviderCardProps) {
  const displayModalities = provider.modalities ?? (provider.modality ? [provider.modality] : []);

  // Bubble the searched/matched modality to the front
  const sorted = sortModalities(displayModalities, highlightModality);

  // Exclude missing images, the old hardcoded stock-photo placeholder, and ALL Unsplash URLs
  const hasImage = isValidListingImage(provider.image);

  // ── Compact (directory list) layout ────────────────────────────────────────
  if (compact) {
    const isFeatured = provider.tier === 'featured';
    const isPremium = provider.tier === 'premium';
    const isEnhanced = isFeatured || isPremium;

    // Featured/premium: show ALL modalities. Free: cap at 3.
    const visibleModalities = isEnhanced ? sorted : sorted.slice(0, 3);
    const extraCount = isEnhanced ? 0 : displayModalities.length - visibleModalities.length;

    return (
      <Link to={`/profile/${provider.id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        <Card className={`overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.01] ${tierCardClasses(provider.tier)} ${isFeatured ? 'border-l-4 border-l-amber-400' : ''}`}>
          <div className="flex gap-3 p-3">
            {/* Avatar column: image + type label underneath */}
            <div className="flex flex-col items-center flex-shrink-0 gap-1">
              {hasImage ? (
                <OptimizedImage
                  src={provider.image}
                  alt={`Photo of ${provider.name}`}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-lg object-cover"
                  style={{ objectPosition: getObjectPosition((provider as any).photoPosition) }}
                  loading="lazy"
                />
              ) : (
                <AvatarFallback name={provider.name} className="h-16 w-16 rounded-lg text-lg" />
              )}
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Practitioner
              </span>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {/* Row 1: Name + verified + tier badge */}
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <h3 className={`truncate font-display font-semibold group-hover:text-primary transition-colors leading-tight ${isEnhanced ? 'text-sm' : 'text-sm'}`}>
                    {provider.name}
                  </h3>
                  {isEnhanced && (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" aria-label="Verified" />
                  )}
                </div>
                {provider.tier && provider.tier !== "free" && (
                  <TierBadge tier={provider.tier} />
                )}
              </div>

              {/* Row 1b: Job title */}
              <p className="text-xs text-muted-foreground leading-tight truncate">
                {provider.title || inferTitleFromModality(provider.modalities?.[0] ?? provider.modality)}
              </p>

              {/* Row 2: Location + accepting clients on same line */}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-muted-foreground leading-tight">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{provider.location?.split(',')[0]}</span>
                {provider.distanceMiles != null && (
                  <span className="flex-shrink-0 text-muted-foreground/70">· {formatDistance(provider.distanceMiles)}</span>
                )}
                {provider.acceptsNewClients === true && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                    · <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Accepting
                  </span>
                )}
                {isEnhanced && provider.sessionType && (
                  <span className="text-muted-foreground/70">· {SESSION_TYPE_LABELS[provider.sessionType] ?? provider.sessionType}</span>
                )}
              </div>

              {/* Row 3: Modality pills */}
              {visibleModalities.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {visibleModalities.map((m) => (
                    <span key={m} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-normal leading-none ${modalityBadgeClass(m)}`}>{m}</span>
                  ))}
                  {extraCount > 0 && (
                    <Badge variant="outline" className="text-[11px] font-normal px-1.5 py-0.5 leading-none">+{extraCount} more</Badge>
                  )}
                </div>
              )}

              {/* Featured/Premium: Bio excerpt — free tier hides this */}
              {isEnhanced && provider.bio && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-snug">{provider.bio}</p>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // ── Full card layout — P-3: Left / Two-Section ─────────────────────────────
  const tier     = tierKey(provider.tier);
  const isPaid   = tier === "featured" || tier === "premium";
  const maxMods  = MOD_CAP[tier];
  const visibleMods = sorted.slice(0, maxMods);
  const extraCount  = displayModalities.length - visibleMods.length;
  const btnStyle    = getButtonStyle(tier);

  return (
    <Link
      to={`/profile/${provider.id}`}
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
                src={provider.image}
                alt={`Photo of ${provider.name}`}
                width={CIRCLE_SIZE}
                height={CIRCLE_SIZE}
                className="h-full w-full object-cover"
                style={{ objectPosition: getObjectPosition((provider as any).photoPosition) }}
                loading="lazy"
              />
            ) : (
              <AvatarFallback name={provider.name} className="h-full w-full text-xl" />
            )}
          </div>

          {/* ── Floating tier badge ── */}
          {isPaid && (
            <div style={{ position: "absolute", top: 11, right: 13, zIndex: 5 }}>
              <TierBadge tier={provider.tier} />
            </div>
          )}

          {/* ── HEADER section ── */}
          <div style={{ marginBottom: 11 }}>
            {/* Name + verified */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2, flexWrap: "wrap" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#1c1917",
                  lineHeight: 1.2,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {provider.name}
              </h3>
              {(tier === "featured" || tier === "premium") ? <VerifiedPill /> : (provider.verified && <VerifiedDot />)}
            </div>

            {/* Job title — custom if set, otherwise inferred from primary modality */}
            {(provider.title || provider.modality) && (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TIER_ACC[tier],
                  marginBottom: 3,
                  letterSpacing: "0.02em",
                }}
              >
                {provider.title || inferTitleFromModality(provider.modalities?.[0] ?? provider.modality)}
              </p>
            )}

            {/* Location + session type */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                color: "#a8a29e",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <MapPin className="h-2.5 w-2.5" />
                {provider.location}
              </span>
              {isPaid && provider.sessionType && SESSION_TYPE_LABELS[provider.sessionType] && (
                <>
                  <span style={{ color: "#e7e5e4" }}>·</span>
                  <span>{SESSION_ICON[provider.sessionType]} {SESSION_TYPE_LABELS[provider.sessionType]}</span>
                </>
              )}
            </div>
          </div>

          {/* ── Tier-tinted section divider ── */}
          <div
            style={{
              height: 1.5,
              background: getDividerBg(tier),
              marginBottom: 11,
            }}
          />

          {/* ── BODY section ── */}
          {/* Modality pills */}
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
              <span style={{ fontSize: 10, color: "#a8a29e", alignSelf: "center" }}>+{extraCount}</span>
            )}
          </div>

          {/* Bio — shown for all tiers */}
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
            {provider.bio || "Available for sessions on the island."}
          </p>

          {/* Spacer — pushes bottom row to card bottom */}
          <div style={{ flex: 1 }} />

          {/* ── Bottom row ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <AcceptsIndicator accepts={provider.acceptsNewClients} />
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
              {isPaid ? "Book →" : "View →"}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
