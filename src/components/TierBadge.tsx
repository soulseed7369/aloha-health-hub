import { Crown, Star } from "lucide-react";

interface TierBadgeProps {
  tier?: string;
  className?: string;
}

/**
 * Small tasteful badge rendered in the top-right corner of listing cards.
 * Featured = amber crown, Premium = silver star (icon only), Free = nothing.
 */
export function TierBadge({ tier, className = "" }: TierBadgeProps) {
  if (tier === "featured") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-300/60 ${className}`}
        aria-label="Featured listing"
      >
        <Crown className="h-3 w-3" aria-hidden="true" />
        Featured
      </span>
    );
  }

  if (tier === "premium") {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-slate-100 p-1 ring-1 ring-slate-300/60 ${className}`}
        aria-label="Premium listing"
        title="Premium listing"
      >
        <Star className="h-3.5 w-3.5 fill-slate-400 text-slate-400" aria-hidden="true" />
      </span>
    );
  }

  return null;
}
