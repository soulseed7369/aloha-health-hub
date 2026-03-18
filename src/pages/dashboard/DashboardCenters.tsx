import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  ExternalLink,
  Plus,
  Trash2,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Pencil,
  Lock,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useMyCenters,
  useAddCenter,
  useDeleteCenter,
  useCenterLocations,
  useAddCenterLocation,
  useUpdateCenterLocation,
  useDeleteCenterLocation,
  useSetPrimaryLocation,
  emptyLocationForm,
  type CenterFormData,
  type LocationFormData,
} from "@/hooks/useMyCenters";
import type { CenterRow, CenterLocationRow } from "@/types/database";
import { CenterEventsAndAmenities } from "./DashboardCenterEvents";

// ─── Constants ────────────────────────────────────────────────────────────────

const centerTypeLabels: Record<CenterRow["center_type"], string> = {
  spa: "Spa",
  wellness_center: "Wellness Center",
  yoga_studio: "Yoga Studio",
  clinic: "Clinic",
  retreat_center: "Retreat Center",
  fitness_center: "Fitness Center",
};

const ISLAND_OPTIONS = [
  { value: "big_island", label: "Big Island" },
  { value: "maui",       label: "Maui" },
  { value: "oahu",       label: "Oʻahu" },
  { value: "kauai",      label: "Kauaʻi" },
];

const emptyForm: CenterFormData = {
  name: "",
  center_type: "wellness_center",
  description: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  website_url: "",
  external_website_url: "",
};

// ─── LocationForm ─────────────────────────────────────────────────────────────

function LocationForm({
  centerId,
  initialValues = emptyLocationForm,
  locationId,
  isFirst,
  onDone,
  onCancel,
}: {
  centerId: string;
  initialValues?: LocationFormData;
  locationId?: string;
  isFirst?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<LocationFormData>({
    ...emptyLocationForm,
    ...initialValues,
    // First location is always primary
    is_primary: isFirst ? true : initialValues.is_primary,
  });

  const addMutation    = useAddCenterLocation(centerId);
  const updateMutation = useUpdateCenterLocation(centerId);
  const isPending      = addMutation.isPending || updateMutation.isPending;

  const set = (field: keyof LocationFormData, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.island) { toast.error("Island is required."); return; }
    try {
      if (locationId) {
        await updateMutation.mutateAsync({ id: locationId, form });
      } else {
        await addMutation.mutateAsync(form);
      }
      toast.success(locationId ? "Location updated." : "Location added.");
      onDone();
    } catch (err) {
      toast.error("Failed to save location.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {locationId ? "Edit Location" : isFirst ? "Primary Location" : "New Location"}
        </CardTitle>
        {isFirst && (
          <CardDescription>
            This is your main address shown in search results and the directory.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Location Name <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            placeholder='e.g. "Kailua-Kona Branch" or "Waikiki Studio"'
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Island <span className="text-destructive">*</span></Label>
            <Select value={form.island} onValueChange={(v) => set("island", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ISLAND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City / Town</Label>
            <Input
              placeholder="Kailua-Kona"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Street Address</Label>
          <Input
            placeholder="75-5660 Palani Rd, Kailua-Kona, HI 96740"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              type="tel"
              placeholder="(808) 555-0123"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="info@location.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>

        {/* Primary toggle — only shown when editing a non-first location */}
        {!isFirst && (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.is_primary}
              onChange={(e) => set("is_primary", e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium">Set as primary location</p>
              <p className="text-xs text-muted-foreground">
                The primary location appears first in directory search results.
              </p>
            </div>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : locationId ? "Update" : "Add Location"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── LocationCard ─────────────────────────────────────────────────────────────

function LocationCard({
  location,
  centerId,
  canDelete,
}: {
  location: CenterLocationRow;
  centerId: string;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const deleteMutation     = useDeleteCenterLocation(centerId);
  const setPrimaryMutation = useSetPrimaryLocation(centerId);

  const handleDelete = async () => {
    if (!confirm(`Remove this location? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(location.id);
      toast.success("Location removed.");
    } catch {
      toast.error("Failed to remove location.");
    }
  };

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync(location.id);
      toast.success("Primary location updated.");
    } catch {
      toast.error("Failed to update primary location.");
    }
  };

  if (editing) {
    return (
      <LocationForm
        centerId={centerId}
        locationId={location.id}
        initialValues={{
          name:          location.name ?? "",
          island:        location.island,
          city:          location.city ?? "",
          address:       location.address ?? "",
          phone:         location.phone ?? "",
          email:         location.email ?? "",
          working_hours: location.working_hours ?? {},
          is_primary:    location.is_primary,
        }}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const label = location.name
    ? location.name
    : [location.city, ISLAND_OPTIONS.find(o => o.value === location.island)?.label]
        .filter(Boolean)
        .join(", ");

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm truncate">{label || "Unnamed location"}</span>
          {location.is_primary && (
            <Badge variant="default" className="text-xs gap-1">
              <Star className="h-3 w-3" /> Primary
            </Badge>
          )}
        </div>
        {location.address && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{location.address}</p>
        )}
        {(location.phone || location.email) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {[location.phone, location.email].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!location.is_primary && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            disabled={setPrimaryMutation.isPending}
            onClick={handleSetPrimary}
            title="Set as primary"
          >
            <Star className="h-3 w-3 mr-1" /> Primary
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── LocationsPanel ───────────────────────────────────────────────────────────

function LocationsPanel({ centerId, tier = 'free' }: { centerId: string; tier?: 'free' | 'premium' | 'featured' }) {
  const { data: locations = [], isLoading } = useCenterLocations(centerId);
  const [adding, setAdding]       = useState(false);
  const [expanded, setExpanded]   = useState(true);

  const isFirst = locations.length === 0 && !adding;
  const isFree = tier === 'free';
  const canAddLocation = !isFree || locations.length === 0;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((p) => !p)}
        >
          <MapPin className="h-4 w-4" />
          Locations ({locations.length})
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {!adding && expanded && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setAdding(true)}
            disabled={!canAddLocation}
            title={!canAddLocation ? `Free tier limited to 1 location` : ''}
          >
            <Plus className="h-3.5 w-3.5" />
            {locations.length === 0 ? "Add Primary Location" : "Add Location"}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          )}

          {!isLoading && locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              centerId={centerId}
              canDelete={locations.length > 1}
            />
          ))}

          {!isLoading && locations.length === 0 && !adding && (
            <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
              No locations added yet. Add your primary address to appear in search results.
            </p>
          )}

          {adding && (
            <LocationForm
              centerId={centerId}
              isFirst={locations.length === 0}
              onDone={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardCenters() {
  const { data: centers = [], isLoading } = useMyCenters();
  const addMutation    = useAddCenter();
  const deleteMutation = useDeleteCenter();

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<CenterFormData>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleChange = (field: keyof CenterFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Center name is required."); return; }
    try {
      await addMutation.mutateAsync(form);
      toast.success("Center listing saved as draft.");
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      toast.error("Failed to save center. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleDelete = async (centerId: string, centerName: string) => {
    if (!confirm(`Remove "${centerName}"? This cannot be undone.`)) return;
    setDeletingId(centerId);
    try {
      await deleteMutation.mutateAsync(centerId);
      toast.success(`"${centerName}" has been removed.`);
      if (expandedId === centerId) setExpandedId(null);
    } catch (err) {
      toast.error("Failed to remove center. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Centers & Spas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage listings for clinics, spas, studios, and shared wellness spaces.
            Each center can have multiple locations.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Center
          </Button>
        )}
      </div>

      {/* Existing centers list */}
      {centers.length > 0 && !showForm && (
        <div className="space-y-3">
          {centers.map((center) => (
            <Card key={center.id} className="overflow-hidden">
              {/* Center header row */}
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() =>
                      setExpandedId(expandedId === center.id ? null : center.id)
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{center.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {centerTypeLabels[center.center_type]}
                      </Badge>
                      <Badge
                        variant={center.status === "published" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {center.status}
                      </Badge>
                    </div>
                    {center.description && (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {center.description}
                      </p>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setExpandedId(expandedId === center.id ? null : center.id)
                      }
                    >
                      {expandedId === center.id
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deletingId === center.id}
                      onClick={() => handleDelete(center.id, center.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded: Locations + Events + Amenities */}
                {expandedId === center.id && (
                  <div className="mt-4 border-t pt-3">
                    <LocationsPanel centerId={center.id} tier={center.tier ?? 'free'} />
                    <CenterEventsAndAmenities center={center} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {centers.length === 0 && !showForm && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No centers added yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Click "Add Center" to create your first listing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showForm && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Center Listing</CardTitle>
              <CardDescription>
                You can add locations (primary and additional branches) after creating the center.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="centerName">
                    Center Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="centerName"
                    placeholder="Big Island Wellness Collective"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.center_type}
                    onValueChange={(val) =>
                      handleChange("center_type", val as CenterRow["center_type"])
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(centerTypeLabels).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="centerCity">City</Label>
                  <Input
                    id="centerCity"
                    placeholder="Kailua-Kona"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="centerAddress">Physical Address</Label>
                <Input
                  id="centerAddress"
                  placeholder="75-5660 Palani Rd, Kailua-Kona, HI 96740"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="centerPhone">Phone</Label>
                  <Input
                    id="centerPhone"
                    type="tel"
                    placeholder="(808) 555-0123"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="centerEmail">Contact Email</Label>
                  <Input
                    id="centerEmail"
                    type="email"
                    placeholder="info@center.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Short Description</Label>
                <Textarea
                  placeholder="Describe your center's specialties and atmosphere…"
                  className="min-h-[100px]"
                  value={form.description}
                  maxLength={250}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {form.description.length}/250 characters
                  </p>
                  <p className="text-xs text-amber-600">
                    Upgrade to Premium for unlimited description
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-terracotta-light/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="h-4 w-4 text-primary" />
                Center Website or Booking URL
              </CardTitle>
              <CardDescription>
                Where should visitors go to learn more or book services?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="https://your-center-website.com"
                type="url"
                value={form.website_url}
                onChange={(e) => handleChange("website_url", e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setForm(emptyForm); }}
            >
              Cancel
            </Button>
            <Button size="lg" onClick={handleSave} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Saving…" : "Save Center"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
