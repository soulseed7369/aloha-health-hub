import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMyCenters, useAddCenter, useDeleteCenter, type CenterFormData } from "@/hooks/useMyCenters";
import type { CenterRow } from "@/types/database";

const centerTypeLabels: Record<CenterRow["center_type"], string> = {
  spa: "Spa",
  wellness_center: "Wellness Center",
  yoga_studio: "Yoga Studio",
  clinic: "Clinic",
  retreat_center: "Retreat Center",
};

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

export default function DashboardCenters() {
  const { data: centers = [], isLoading } = useMyCenters();
  const addMutation = useAddCenter();
  const deleteMutation = useDeleteCenter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CenterFormData>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleChange = (field: keyof CenterFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Center name is required.");
      return;
    }
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
    setDeletingId(centerId);
    try {
      await deleteMutation.mutateAsync(centerId);
      toast.success(`"${centerName}" has been removed.`);
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
            Manage listings for physical clinics, spas, or shared wellness spaces.
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
            <Card key={center.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
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
                  {center.city && (
                    <p className="text-sm text-muted-foreground">{center.city}</p>
                  )}
                  {center.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {center.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  disabled={deletingId === center.id}
                  onClick={() => handleDelete(center.id, center.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
            <p className="font-medium text-muted-foreground">You haven't added a center yet.</p>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(centerTypeLabels).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
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
                  placeholder="Describe your center's specialties and atmosphere..."
                  className="min-h-[100px]"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lead-Gen CTA */}
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
            <CardContent className="space-y-3">
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
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Saving…" : "Save Center"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
