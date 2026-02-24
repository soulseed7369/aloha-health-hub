import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

export function SearchBar() {
  return (
    <section className="tapa-texture bg-sand py-16">
      <div className="container">
        <h1 className="mb-2 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Find Your Path to Wellness
        </h1>
        <p className="mb-8 text-center text-muted-foreground">
          Discover holistic practitioners, retreats & wellness centers across Hawai'i Island
        </p>
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="What are you looking for? (e.g., Massage, Retreat)"
              className="bg-background pl-10"
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Where? (e.g., Kona, Hilo)"
              className="bg-background pl-10"
            />
          </div>
          <Button className="sm:px-8">Search</Button>
        </div>
      </div>
    </section>
  );
}
