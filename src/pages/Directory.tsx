import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderCard } from "@/components/ProviderCard";
import { mockProviders } from "@/data/mockData";
import { MapPin } from "lucide-react";

type FilterType = "all" | "practitioner" | "center" | "retreat";

const Directory = () => {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all"
    ? mockProviders
    : mockProviders.filter((p) => p.type === filter);

  return (
    <main className="flex flex-1 flex-col">
      {/* Filter Tabs */}
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="container">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="practitioner">Practitioners</TabsTrigger>
              <TabsTrigger value="center">Wellness Centers</TabsTrigger>
              <TabsTrigger value="retreat">Retreats</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 lg:max-h-[calc(100vh-8rem)] lg:max-w-lg xl:max-w-xl">
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} results found
          </p>
          <div className="space-y-3">
            {filtered.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="hidden flex-1 bg-ocean-light lg:block">
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Interactive Map</p>
              <p className="text-sm">Map integration ready for Leaflet</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Directory;
