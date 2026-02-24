import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, CheckCircle } from "lucide-react";
import type { Practitioner } from "@/data/mockData";
import { Link } from "react-router-dom";

interface PractitionerCardProps {
  practitioner: Practitioner;
}

export function PractitionerCard({ practitioner }: PractitionerCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <img
            src={practitioner.image}
            alt={practitioner.name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-secondary"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-base font-semibold">
                {practitioner.name}
              </h3>
              {practitioner.verified && (
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-sage" />
              )}
            </div>
            <p className="text-sm text-primary">{practitioner.modality}</p>
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {practitioner.location}
          </span>
          <span className="flex items-center gap-1 text-primary">
            <Star className="h-3.5 w-3.5 fill-current" />
            {practitioner.rating}
          </span>
        </div>
        {practitioner.acceptingClients && (
          <Badge variant="secondary" className="text-xs">
            Accepting New Clients
          </Badge>
        )}
        <Link
          to={`/profile/${practitioner.id}`}
          className="mt-3 block text-center text-sm font-medium text-accent hover:underline"
        >
          View Profile →
        </Link>
      </CardContent>
    </Card>
  );
}
