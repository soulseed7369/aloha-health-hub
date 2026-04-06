import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";

// ── Map location type (works for both practitioners and centers) ─────────────

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image?: string;
  modality?: string;
  location?: string;
  listing_type: "practitioner" | "center";
  tier?: string;
}

// ── Map resizer ──────────────────────────────────────────────────────────────

function MapResizer({ visible }: { visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => map.invalidateSize(), 50);
      return () => clearTimeout(t);
    }
  }, [map, visible]);
  return null;
}

// ── Auto-fit bounds to all markers ───────────────────────────────────────────

function FitBounds({ locations }: { locations: MapLocation[] }) {
  const map = useMap();
  useEffect(() => {
    // Only fit bounds if there are multiple locations; single location can zoom in
    if (locations.length <= 1) return;
    const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
    if (bounds.isValid()) {
      // maxZoom: 9 ensures we never zoom tighter than the initial Big Island view
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
    }
  }, [map, locations]);
  return null;
}

// ── Pin styles ───────────────────────────────────────────────────────────────

type PinVariant = "practitioner" | "center" | "featured";

function getPinVariant(loc: MapLocation): PinVariant {
  if (loc.tier === "featured") return "featured";
  return loc.listing_type;
}

const PIN_STYLES: Record<PinVariant, { fill: string; shape: string; inner: string }> = {
  practitioner: {
    fill: "hsl(143, 25%, 45%)",
    shape: "teardrop",
    inner: '<circle cx="16" cy="14" r="6" fill="white" opacity="0.9"/>',
  },
  center: {
    fill: "hsl(200, 45%, 45%)",
    shape: "teardrop",
    inner: '<rect x="11" y="9" width="10" height="10" rx="2" fill="white" opacity="0.9"/>',
  },
  featured: {
    fill: "hsl(38, 80%, 50%)",
    shape: "teardrop",
    inner:
      '<polygon points="16,8 18.2,13 23.5,13.5 19.5,17 20.8,22 16,19.5 11.2,22 12.5,17 8.5,13.5 13.8,13" fill="white" opacity="0.95"/>',
  },
};

function createMapIcon(loc: MapLocation) {
  const variant = getPinVariant(loc);
  const style = PIN_STYLES[variant];
  const safeName = loc.name.replace(/"/g, "&quot;");
  const size = variant === "featured" ? 36 : 32;
  const height = variant === "featured" ? 46 : 42;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 32 42" fill="none" role="img" aria-label="${safeName}">
    <title>${safeName}</title>
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26C32 7.163 24.837 0 16 0z" fill="${style.fill}"/>
    ${style.inner}
  </svg>`;

  // Wrap SVG in an inner div so the bounce animation's transform doesn't
  // conflict with Leaflet's own transform: translate3d(...) on the outer container.
  return L.divIcon({
    html: `<div class="map-marker-inner">${svg}</div>`,
    className: `custom-map-marker custom-map-marker--${variant}`,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height + 4],
  });
}

// ── Component ────────────────────────────────────────────────────────────────

interface DirectoryMapProps {
  locations: MapLocation[];
  visible?: boolean;
  hoveredId?: string | null;
}

export function DirectoryMap({ locations, visible = true, hoveredId }: DirectoryMapProps) {
  // Store refs to each Leaflet Marker instance so we can animate them on hover
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  // Toggle bounce class on the hovered marker's DOM element
  useEffect(() => {
    markerRefs.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      if (id === hoveredId) {
        el.classList.add('map-marker-bounce');
      } else {
        el.classList.remove('map-marker-bounce');
      }
    });
  }, [hoveredId]);

  // Sort so featured pins render on top (later in SVG = higher z-index)
  const sorted = useMemo(
    () => [...locations].sort((a, b) => {
      const rank = (l: MapLocation) => (l.tier === "featured" ? 1 : 0);
      return rank(a) - rank(b);
    }),
    [locations]
  );

  if (locations.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-muted/30 text-center p-8">
        <p className="text-lg font-medium text-muted-foreground">No GPS coordinates available</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Map pins will appear here once listings have GPS coordinates.
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[19.8968, -155.5828]}
      zoom={9}
      className="h-full w-full"
      scrollWheelZoom={false}
      style={{ minHeight: "400px" }}
      aria-label="Interactive map of wellness providers"
    >
      <MapResizer visible={visible} />
      <FitBounds locations={sorted} />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/" target="_blank" rel="noopener noreferrer">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {sorted.map((loc) => {
        const profileUrl =
          loc.listing_type === "center"
            ? `/center/${loc.id}`
            : `/profile/${loc.id}`;
        const typeLabel =
          loc.listing_type === "center" ? "View Center" : "View Profile";

        return (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createMapIcon(loc)}
            aria-label={`Map pin for ${loc.name}`}
            ref={(m) => {
              if (m) markerRefs.current.set(loc.id, m);
              else markerRefs.current.delete(loc.id);
            }}
          >
            <Popup>
              <div
                className="flex items-center gap-3 py-1 pr-2"
                style={{ minWidth: 200 }}
                role="dialog"
                aria-label={`Details for ${loc.name}`}
              >
                {loc.image ? (
                  <img
                    src={loc.image}
                    alt={`Photo of ${loc.name}`}
                    className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {loc.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{loc.name}</p>
                  {loc.modality && (
                    <p className="text-xs text-gray-500">{loc.modality}</p>
                  )}
                  {loc.location && (
                    <p className="text-xs text-gray-400">{loc.location}</p>
                  )}
                  <Link
                    to={profileUrl}
                    className="mt-1 inline-block text-xs font-medium"
                    style={{ color: "hsl(200, 70%, 25%)" }}
                    aria-label={`${typeLabel} for ${loc.name}`}
                  >
                    {typeLabel} &rarr;
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
