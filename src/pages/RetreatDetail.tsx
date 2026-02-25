import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { mockRetreatEvents } from "@/data/mockData";

export default function RetreatDetail() {
  const { id } = useParams();
  const retreat = mockRetreatEvents.find((r) => r.id === id);

  if (!retreat) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Retreat not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/retreats">Back to Retreats</Link>
        </Button>
      </div>
    );
  }

  const start = parseISO(retreat.startDate);
  const end = parseISO(retreat.endDate);

  return (
    <div className="container py-8">
      <Link
        to="/retreats"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All Retreats
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cover image */}
          <div className="overflow-hidden rounded-xl">
            <img
              src={retreat.image}
              alt={retreat.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <Sparkles className="h-3 w-3" />
              {retreat.feature}
            </Badge>

            <h1 className="font-display text-2xl font-bold leading-snug sm:text-3xl">
              {retreat.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {retreat.location}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* Description placeholder */}
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <h2 className="font-display text-lg font-semibold text-foreground">
              About This Retreat
            </h2>
            <p>
              Immerse yourself in {retreat.durationDays} transformative days on Hawai'i Island.
              This retreat combines ancient Hawaiian healing wisdom with modern wellness practices,
              set against the stunning backdrop of {retreat.area}. Expect daily guided sessions,
              farm-to-table nourishment, and ample time for personal reflection.
            </p>
            <h2 className="font-display text-lg font-semibold text-foreground">
              What's Included
            </h2>
            <ul>
              <li>All guided sessions and workshops</li>
              <li>Accommodations for {retreat.durationDays - 1} nights</li>
              <li>Organic, locally-sourced meals</li>
              <li>Airport transfer coordination</li>
              <li>{retreat.feature}</li>
            </ul>
          </div>
        </div>

        {/* Sticky sidebar summary card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden shadow-md">
            <CardContent className="space-y-5 p-6">
              {retreat.price && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Starting from</p>
                  <p className="font-display text-3xl font-bold text-foreground">{retreat.price}</p>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Dates</p>
                    <p className="text-muted-foreground">
                      {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
                    </p>
                    <p className="text-muted-foreground">{retreat.durationDays} days</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Location</p>
                    <p className="text-muted-foreground">{retreat.location}</p>
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2" size="lg" asChild>
                <a href="https://example.com/book" target="_blank" rel="noopener noreferrer">
                  View Details & Book with Host
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                You will be redirected to the host's website to complete your booking.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
