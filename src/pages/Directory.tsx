import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderCard } from "@/components/ProviderCard";
import { CenterCard } from "@/components/CenterCard";
import { DirectoryMap } from "@/components/DirectoryMap";
import { mockPractitioners, mockCenters, type Provider } from "@/data/mockData";
import { Map } from "lucide-react";

type DirectoryTab = "practitioners" | "centers";

const Directory = () => {
  const [tab, setTab] = useState<DirectoryTab>("practitioners");
  const [showMap, setShowMap] = useState(false);

  // Build provider-shaped array for map from whichever tab is active
  const mapLocations: Provider[] = useMemo(() => {
    if (tab === "practitioners") {
      return mockPractitioners.map((p) => ({
        id: p.id, name: p.name, image: p.image,
        type: "practitioner" as const, modality: p.modality,
        location: p.location, rating: p.rating, lat: p.lat, lng: p.lng,
      }));
    }
    return mockCenters.map((c) => ({
      id: c.id, name: c.name, image: c.image,
      type: "center" as const, modality: c.modality,
      location: c.location, rating: c.rating, lat: c.lat, lng: c.lng,
    }));
  }, [tab]);

  return (
    <main className="flex flex-1 flex-col">
      {/* Tab Bar */}
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="container flex items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as DirectoryTab)} className="min-w-0 flex-1">
            <TabsList className="w-full">
              <TabsTrigger value="practitioners" className="flex-1">Individual Practitioners</TabsTrigger>
              <TabsTrigger value="centers" className="flex-1">Spas &amp; Wellness Centers</TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Mobile map toggle */}
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted lg:hidden"
          >
            <Map className="h-4 w-4" />
            {showMap ? "List" : "Map"}
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* List */}
        <div className={`flex-1 overflow-y-auto p-4 lg:block lg:max-h-[calc(100vh-8rem)] lg:max-w-lg xl:max-w-xl ${showMap ? "hidden" : "block"}`}>
          <p className="mb-4 text-sm text-muted-foreground">
            {mapLocations.length} results found
          </p>
          <div className="space-y-3">
            {tab === "practitioners"
              ? mockPractitioners.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={{ id: p.id, name: p.name, image: p.image, type: "practitioner", modality: p.modality, location: p.location, rating: p.rating, lat: p.lat, lng: p.lng }}
                  />
                ))
              : mockCenters.map((c) => (
                  <CenterCard key={c.id} center={c} />
                ))}
          </div>
        </div>

        {/* Map */}
        <div className={`flex-1 lg:block ${showMap ? "block" : "hidden"}`} style={{ minHeight: showMap ? "calc(100vh - 8rem)" : undefined }}>
          <div className="sticky top-0 h-[calc(100vh-8rem)]">
            <DirectoryMap locations={mapLocations} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Directory;
