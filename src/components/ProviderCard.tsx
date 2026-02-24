import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import type { Provider } from "@/data/mockData";
import { Link } from "react-router-dom";

interface ProviderCardProps {
  provider: Provider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex gap-4 p-4">
        <img
          src={provider.image}
          alt={provider.name}
          className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-primary">
            {provider.modality}
          </p>
          <h3 className="mb-1 truncate font-display text-base font-semibold">
            {provider.name}
          </h3>
          <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {provider.location}
            </span>
            <span className="flex items-center gap-1 text-primary">
              <Star className="h-3.5 w-3.5 fill-current" />
              {provider.rating}
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/profile/${provider.id}`}>View Profile</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
