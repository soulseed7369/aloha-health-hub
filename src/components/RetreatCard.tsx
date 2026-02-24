import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import type { Retreat } from "@/data/mockData";
import { Link } from "react-router-dom";

interface RetreatCardProps {
  retreat: Retreat;
}

export function RetreatCard({ retreat }: RetreatCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={retreat.image}
          alt={retreat.name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>
      <CardContent className="p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
          {retreat.type}
        </p>
        <h3 className="mb-2 font-display text-lg font-semibold leading-tight">
          {retreat.name}
        </h3>
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {retreat.location}
          </span>
          <span className="flex items-center gap-1 text-primary">
            <Star className="h-3.5 w-3.5 fill-current" />
            {retreat.rating}
          </span>
        </div>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to={`/profile/${retreat.id}`}>View Details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
