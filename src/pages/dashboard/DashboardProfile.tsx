import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, ExternalLink } from "lucide-react";

const regions = ["Kailua-Kona", "Hilo", "Waimea", "Kohala Coast", "Captain Cook", "Volcano Village", "Pahoa", "Holualoa", "Honokaa"];

export default function DashboardProfile() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My Practitioner Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your public directory listing. All fields are optional.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo placeholder */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-input bg-muted">
              <Camera className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <Button variant="outline" size="sm">Upload Photo</Button>
              <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, max 2 MB</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Dr. Leilani Kamaka" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Primary Title / Modality</Label>
              <Input id="title" placeholder="Certified Acupuncturist" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>City / Region</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r.toLowerCase().replace(/\s+/g, "-")}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Tell potential clients about your practice, philosophy, and experience..."
            className="min-h-[140px]"
          />
        </CardContent>
      </Card>

      {/* Lead-Gen CTA */}
      <Card className="border-primary/30 bg-terracotta-light/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ExternalLink className="h-4 w-4 text-primary" />
            Direct Booking Link
          </CardTitle>
          <CardDescription>
            Where should we send patients to book with you? (e.g., your Square, Mindbody, or personal website link)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="https://your-booking-page.com" type="url" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg">Save Profile</Button>
      </div>
    </div>
  );
}
