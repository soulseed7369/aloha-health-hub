import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Building, ExternalLink, ImagePlus, Plus } from "lucide-react";
import { useState } from "react";

export default function DashboardCenters() {
  const [showForm, setShowForm] = useState(false);

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

      {/* Empty state */}
      {!showForm && (
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
              <div className="space-y-2">
                <Label htmlFor="centerName">Center Name</Label>
                <Input id="centerName" placeholder="Big Island Wellness Collective" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Input id="address" placeholder="75-5660 Palani Rd, Kailua-Kona, HI 96740" />
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Textarea placeholder="Describe your center's specialties and atmosphere..." className="min-h-[100px]" />
              </div>
              {/* Image placeholder */}
              <div className="space-y-2">
                <Label>Image Gallery</Label>
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/50">
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">Upload images</span>
                  </div>
                </div>
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
            <CardContent>
              <Input placeholder="https://your-center-website.com" type="url" />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="lg">Save Center</Button>
          </div>
        </>
      )}
    </div>
  );
}
