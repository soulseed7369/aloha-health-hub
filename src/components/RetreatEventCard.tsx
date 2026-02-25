import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import type { RetreatEvent } from "@/data/mockData";

interface RetreatEventCardProps {
  retreat: RetreatEvent;
}

export function RetreatEventCard({ retreat }: RetreatEventCardProps) {
  const start = parseISO(retreat.startDate);
  const end = parseISO(retreat.endDate);
  const dateLabel = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      {/* Image with duration badge */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={retreat.image}
          alt={retreat.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <Badge className="absolute right-3 top-3 bg-foreground/70 text-primary-foreground backdrop-blur-sm">
          {retreat.durationDays} Days
        </Badge>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-5">
        <p className="text-sm font-medium text-primary">{dateLabel}</p>
        <h3 className="font-display text-lg font-semibold leading-snug">
          {retreat.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          {retreat.location}
        </p>
        <Badge variant="outline" className="w-fit gap-1.5 text-xs font-normal">
          <Sparkles className="h-3 w-3" />
          {retreat.feature}
        </Badge>

        <div className="mt-1 flex items-center justify-between">
          {retreat.price && (
            <span className="text-sm font-semibold text-foreground">
              From {retreat.price}
            </span>
          )}
          <Button size="sm" className="ml-auto" asChild>
            <Link to={`/retreats/${retreat.id}`}>View &amp; Book</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
