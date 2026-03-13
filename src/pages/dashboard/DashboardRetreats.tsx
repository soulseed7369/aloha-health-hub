import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMyRetreats, useAddRetreat, useDeleteRetreat, type RetreatFormData } from "@/hooks/useMyRetreats";

const emptyForm: RetreatFormData = {
  title: "",
  venue_name: "",
  city: "",
  description: "",
  start_date: "",
  end_date: "",
  starting_price: "",
  registration_url: "",
};

export default function DashboardRetreats() {
  const { data: retreats = [], isLoading } = useMyRetreats();
  const addMutation = useAddRetreat();
  const deleteMutation = useDeleteRetreat();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RetreatFormData>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleChange = (field: keyof RetreatFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Retreat title is required.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error("Start and end dates are required.");
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error("End date must be on or after start date.");
      return;
    }
    try {
      await addMutation.mutateAsync(form);
      toast.success("Retreat listing saved as draft.");
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      toast.error("Failed to save retreat. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleDelete = async (retreatId: string, title: string) => {
    setDeletingId(retreatId);
    try {
      await deleteMutation.mutateAsync(retreatId);
      toast.success(`"${title}" has been removed.`);
    } catch (err) {
      toast.error("Failed to remove retreat. Please try again.");
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
          <h1 className="font-display text-2xl font-bold">My Retreats & Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish upcoming time-bound retreats or workshops.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Retreat
          </Button>
        )}
      </div>

      {/* Existing retreats list */}
      {retreats.length > 0 && !showForm && (
        <div className="space-y-3">
          {retreats.map((retreat) => (
            <Card key={retreat.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{retreat.title}</p>
                    <Badge
                      variant={retreat.status === "published" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {retreat.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {retreat.start_date} → {retreat.end_date}
                    {retreat.city ? ` · ${retreat.city}` : ""}
                  </p>
                  {retreat.starting_price != null && (
                    <p className="text-sm font-medium">
                      From ${retreat.starting_price.toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  disabled={deletingId === retreat.id}
                  onClick={() => handleDelete(retreat.id, retreat.title)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {retreats.length === 0 && !showForm && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No retreats yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Create your first retreat or event listing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showForm && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Retreat Listing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retreatTitle">
                  Retreat Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="retreatTitle"
                  placeholder="7-Day Silent Mountain & Ocean Meditation Retreat"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                />
              </div>

              {/* Date range */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    End Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name</Label>
                  <Input
                    id="venueName"
                    placeholder="Mauna Kea Retreat Center"
                    value={form.venue_name}
                    onChange={(e) => handleChange("venue_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retreatCity">City / Area</Label>
                  <Input
                    id="retreatCity"
                    placeholder="Kohala Coast"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Retreat Description & Itinerary</Label>
                <Textarea
                  placeholder="Describe the retreat experience, daily schedule, what's included..."
                  className="min-h-[140px]"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Starting Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1500"
                  value={form.starting_price}
                  onChange={(e) => handleChange("starting_price", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Display only — shown as "From $X" on the listing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Lead-Gen CTA */}
          <Card className="border-primary/30 bg-terracotta-light/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="h-4 w-4 text-primary" />
                External Registration Link
              </CardTitle>
              <CardDescription>
                Enter the link to your external checkout page or retreat website. Users clicking
                "Book Now" will be redirected here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="https://your-retreat-checkout.com"
                type="url"
                value={form.registration_url}
                onChange={(e) => handleChange("registration_url", e.target.value)}
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
              {addMutation.isPending ? "Saving…" : "Save Retreat"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
