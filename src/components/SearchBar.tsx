import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-homepage.jpg";

export function SearchBar() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Background image */}
      <img
        src={heroImage}
        alt="Big Island of Hawaii at golden hour with lush greenery and ocean"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/40" />

      <div className="container relative z-10">
        <h1 className="mb-2 text-center font-display text-3xl font-bold text-primary-foreground md:text-5xl">
          Find Your Path to Wellness
        </h1>
        <p className="mb-8 text-center text-lg text-primary-foreground/85">
          Discover holistic practitioners, retreats & wellness centers across Hawai'i Island
        </p>
        <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-xl bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="What are you looking for? (e.g., Massage, Retreat)"
              className="border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Where? (e.g., Kona, Hilo)"
              className="border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
            />
          </div>
          <Button className="sm:px-8">Search</Button>
        </div>
      </div>
    </section>
  );
}
