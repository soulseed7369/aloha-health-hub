import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";

interface GuideCTAProps {
  /**
   * "mid"  — compact inline callout (used between guide sections)
   * "end"  — full-width closing CTA (used at the bottom of a guide)
   */
  variant?: "mid" | "end";
  /** Optional island pre-filter for the directory link */
  island?: "big-island" | "maui" | "oahu" | "kauai";
  /** Optional modality anchor for the directory link */
  modality?: string;
  /** Override the headline */
  headline?: string;
  /** Override the body copy */
  body?: string;
}

const ISLAND_PATHS: Record<string, string> = {
  "big-island": "/big-island",
  maui: "/maui",
  oahu: "/oahu",
  kauai: "/kauai",
};

export function GuideCTA({
  variant = "mid",
  island,
  modality,
  headline,
  body,
}: GuideCTAProps) {
  const directoryPath = island ? ISLAND_PATHS[island] : "/directory";
  const directoryHref = modality
    ? `${directoryPath}?modality=${encodeURIComponent(modality)}`
    : directoryPath;

  if (variant === "mid") {
    return (
      <aside className="my-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-foreground">
              {headline ?? "Ready to find your practitioner?"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {body ??
                "Browse verified holistic health practitioners across Hawaiʻi — filter by modality, island, and session type."}
            </p>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link to={directoryHref}>
              <Search className="h-4 w-4" />
              Search Directory
            </Link>
          </Button>
        </div>
      </aside>
    );
  }

  // variant === "end"
  return (
    <section className="mt-16 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/30 to-sage/10 px-8 py-12 text-center sm:px-16">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">
        Hawaiʻi Wellness Directory
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
        {headline ?? "Find Your Healer in Hawaiʻi"}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        {body ??
          "Browse hundreds of vetted holistic health practitioners across Oʻahu, Maui, the Big Island, and Kauaʻi. Filter by modality, location, and session type to find your perfect match."}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="gap-2">
          <Link to={directoryHref}>
            <Search className="h-4 w-4" />
            Browse Practitioners
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link to="/list-your-practice">
            List Your Practice
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Are you a practitioner?{" "}
        <Link to="/list-your-practice" className="underline hover:text-primary">
          Add your listing — free to start.
        </Link>
      </p>
    </section>
  );
}
