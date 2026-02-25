import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, ExternalLink, ImagePlus, Plus } from "lucide-react";
import { useState } from "react";

export default function DashboardRetreats() {
  const [showForm, setShowForm] = useState(false);

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

      {/* Empty state */}
      {!showForm && (
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
                <Label htmlFor="retreatTitle">Retreat Title</Label>
                <Input id="retreatTitle" placeholder="7-Day Silent Mountain & Ocean Meditation Retreat" />
              </div>

              {/* Cover image placeholder */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/50">
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">Upload cover image</span>
                  </div>
                </div>
              </div>

              {/* Date range */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Location / Venue Name</Label>
                <Input id="venue" placeholder="Kohala Coast, Hawai'i Island" />
              </div>

              <div className="space-y-2">
                <Label>Retreat Description & Itinerary</Label>
                <Textarea
                  placeholder="Describe the retreat experience, daily schedule, what's included..."
                  className="min-h-[140px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Starting Price ($)</Label>
                <Input id="price" type="number" placeholder="1500" />
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
                Enter the link to your external checkout page or retreat website. Users clicking "Book Now" will be redirected here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="https://your-retreat-checkout.com" type="url" />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="lg">Save Retreat</Button>
          </div>
        </>
      )}
    </div>
  );
}
