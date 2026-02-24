import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderCard } from "@/components/ProviderCard";
import { DirectoryMap } from "@/components/DirectoryMap";
import { mockProviders } from "@/data/mockData";
import { Map } from "lucide-react";

type FilterType = "all" | "practitioner" | "center" | "retreat";

const Directory = () => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showMap, setShowMap] = useState(false);

  const filtered = filter === "all"
    ? mockProviders
    : mockProviders.filter((p) => p.type === filter);

  return (
    <main className="flex flex-1 flex-col">
      {/* Filter Tabs */}
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="container flex items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="practitioner">Practitioners</TabsTrigger>
              <TabsTrigger value="center">Wellness Centers</TabsTrigger>
              <TabsTrigger value="retreat">Retreats</TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Mobile map toggle */}
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted lg:hidden"
          >
            <Map className="h-4 w-4" />
            {showMap ? "List" : "Map"}
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* List — hidden on mobile when map is shown */}
        <div className={`flex-1 overflow-y-auto p-4 lg:block lg:max-h-[calc(100vh-8rem)] lg:max-w-lg xl:max-w-xl ${showMap ? "hidden" : "block"}`}>
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} results found
          </p>
          <div className="space-y-3">
            {filtered.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>

        {/* Map */}
        <div className={`flex-1 lg:block ${showMap ? "block" : "hidden"}`} style={{ minHeight: showMap ? "calc(100vh - 8rem)" : undefined }}>
          <div className="sticky top-0 h-[calc(100vh-8rem)]">
            <DirectoryMap locations={filtered} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Directory;
