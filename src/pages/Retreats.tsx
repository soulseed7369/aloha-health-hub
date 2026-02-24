import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RetreatEventCard } from "@/components/RetreatEventCard";
import { mockRetreatEvents } from "@/data/mockData";
import { CalendarDays, MapPin, Leaf } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import heroRetreats from "@/assets/hero-retreats.jpg";

const locations = ["All Locations", "Kohala Coast", "Kawaihae", "Hilo", "Puna"];
const types = ["All Types", "Meditation", "Yoga", "Culinary"];

const Retreats = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [location, setLocation] = useState("All Locations");
  const [retreatType, setRetreatType] = useState("All Types");

  const filtered = useMemo(() => {
    return mockRetreatEvents.filter((r) => {
      if (location !== "All Locations" && !r.area.toLowerCase().includes(location.toLowerCase())) return false;
      if (retreatType !== "All Types" && r.type !== retreatType) return false;
      if (dateRange?.from) {
        const start = new Date(r.startDate);
        if (start < dateRange.from) return false;
      }
      if (dateRange?.to) {
        const end = new Date(r.endDate);
        if (end > dateRange.to) return false;
      }
      return true;
    });
  }, [location, retreatType, dateRange]);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Background image */}
        <img
          src={heroRetreats}
          alt="Luxury wellness retreat pavilion overlooking the ocean on Hawaii's Big Island"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/45" />
        <div className="container relative z-10 text-center">
          <h1 className="font-display text-4xl font-bold text-primary-foreground md:text-5xl lg:text-6xl">
            Retreats &amp; Immersions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/85">
            Multi-day transformative experiences on Hawai'i Island — from silent mountain meditation to plant-based culinary resets.
          </p>
        </div>

        {/* Filter bar */}
        <div className="container relative z-10 mt-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-accent-foreground/10 bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 sm:w-auto sm:flex-1">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {dateRange?.from ? (
                    <span className="truncate text-sm">
                      {format(dateRange.from, "MMM d")}
                      {dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Select dates</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Location */}
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-full gap-2 sm:w-auto sm:flex-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Retreat Type */}
            <Select value={retreatType} onValueChange={setRetreatType}>
              <SelectTrigger className="w-full gap-2 sm:w-auto sm:flex-1">
                <Leaf className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container py-12 md:py-16">
        <p className="mb-6 text-sm text-muted-foreground">
          {filtered.length} retreat{filtered.length !== 1 ? "s" : ""} found
        </p>
        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((retreat) => (
              <RetreatEventCard key={retreat.id} retreat={retreat} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="font-display text-xl text-muted-foreground">No retreats match your filters</p>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your dates or criteria.</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default Retreats;
