import { Star, MapPin, User, Building2 } from "lucide-react";
import { OptimizedImage } from "./OptimizedImage";
import { Link } from "react-router-dom";
import type { Provider, Center } from "@/data/mockData";
import { isValidListingImage, avatarGradient } from "@/lib/cardUtils";

export interface FeaturedItem {
  id: string;
  listing_type: "practitioner" | "center";
  provider?: Provider;
  center?: Center;
}

interface FeaturedResultsRowProps {
  items: FeaturedItem[];
  highlightModality?: string;
}

/** Compact avatar fallback */
function MiniAvatar({ name, type }: { name: string; type: "practitioner" | "center" }) {
  const { gradient, textColor } = avatarGradient(name);
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${textColor} h-12 w-12 rounded-full flex-shrink-0`}>
      {type === "center"
        ? <Building2 className="h-5 w-5 opacity-80" />
        : <span className="text-sm font-semibold">{name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")}</span>
      }
    </div>
  );
}

/**
 * Renders up to 3 featured listings as compact horizontal cards.
 * Always horizontal — scrollable on mobile, flex row on desktop.
 */
export function FeaturedResultsRow({ items }: FeaturedResultsRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-4" aria-label="Featured listings">
      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Featured
        </span>
      </div>

      {/* Compact horizontal cards */}
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
        {items.map((item) => {
          const name = item.provider?.name || item.center?.name || "";
          const image = item.provider?.image || item.center?.image || "";
          const location = item.provider?.location || item.center?.location || "";
          const modality = item.provider?.modality || item.center?.modality || "";
          const hasImage = isValidListingImage(image);
          const linkTo = item.listing_type === "center"
            ? `/center/${item.id}`
            : `/profile/${item.id}`;

          return (
            <Link
              key={item.id}
              to={linkTo}
              className="group snap-start flex-shrink-0 w-[200px] rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-3 transition-all hover:shadow-md hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-2.5">
                {/* Small circular avatar */}
                {hasImage ? (
                  <OptimizedImage
                    src={image}
                    alt={name}
                    width={48}
                    height={48}
                    className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <MiniAvatar name={name} type={item.listing_type} />
                )}

                {/* Name + info stacked tight */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                    {name}
                  </p>
                  {modality && (
                    <p className="truncate text-[11px] text-muted-foreground mt-0.5">{modality}</p>
                  )}
                  {location && (
                    <p className="flex items-center gap-0.5 text-[11px] text-muted-foreground/70 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{location.split(",")[0]}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Type label */}
              <div className="mt-2 flex items-center gap-1">
                {item.listing_type === "center"
                  ? <Building2 className="h-2.5 w-2.5 text-sky-500" />
                  : <User className="h-2.5 w-2.5 text-emerald-500" />
                }
                <span className={`text-[10px] font-medium ${item.listing_type === "center" ? "text-sky-600" : "text-emerald-600"}`}>
                  {item.listing_type === "center" ? "Center" : "Practitioner"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mt-3 border-b border-border" />
    </section>
  );
}
