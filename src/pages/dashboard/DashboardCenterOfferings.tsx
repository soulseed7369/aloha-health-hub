import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, Upload, Lock } from "lucide-react";
import { toast } from "sonner";
import { useMyCenters } from "@/hooks/useMyCenters";
import { useMyBillingProfile } from "@/hooks/useStripe";
import { useMyCenterOfferings, useSaveCenterOffering, useDeleteCenterOffering, uploadCenterOfferingImage } from "@/hooks/useMyCenterOfferings";
import type { PriceMode, OfferingRow } from "@/types/database";

interface OfferingFormData {
  title: string;
  offering_type: 'retreat' | 'workshop' | 'immersion' | 'mentorship' | 'ceremony' | 'event';
  description: string;
  price_mode: PriceMode;
  price_fixed: string;
  price_min: string;
  price_max: string;
  start_date: string;
  end_date: string;
  no_fixed_date: boolean;
  location: string;
  registration_url: string;
  max_spots: string;
  status: 'draft' | 'published';
}

const emptyForm: OfferingFormData = {
  title: "",
  offering_type: "retreat",
  description: "",
  price_mode: "fixed",
  price_fixed: "",
  price_min: "",
  price_max: "",
  start_date: "",
  end_date: "",
  no_fixed_date: false,
  location: "",
  registration_url: "",
  max_spots: "",
  status: "draft",
};

const OFFERING_TYPES = [
  { value: 'retreat', label: 'Retreat' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'immersion', label: 'Immersion' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'event', label: 'Event' },
];

const PRICE_MODES = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'range', label: 'Price range' },
  { value: 'sliding', label: 'Sliding scale' },
  { value: 'contact', label: 'Contact for pricing' },
  { value: 'free', label: 'Free' },
];

export default function DashboardCenterOfferings() {
  const { data: centers = [], isLoading: centersLoading } = useMyCenters();
  const center = centers[0] || null;
  const { data: offerings = [], isLoading: offeringsLoading } = useMyCenterOfferings(center?.id ?? null);
  const { data: billing } = useMyBillingProfile();
  const saveMutation = useSaveCenterOffering();
  const deleteMutation = useDeleteCenterOffering();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<OfferingFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLoading = centersLoading || offeringsLoading;
  const tier = billing?.tier ?? center?.tier ?? 'free';
  const isFeatured = tier === 'featured';

  const handleChange = (field: keyof OfferingFormData, value: any) => {
    if (field === 'no_fixed_date' && value) {
      setForm((prev) => ({
        ...prev,
        [field]: value,
        start_date: '',
        end_date: '',
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Offering title is required.");
      return;
    }
    if (!form.no_fixed_date && (!form.start_date || !form.end_date)) {
      toast.error("Please set dates or check 'Ongoing' to skip date requirements.");
      return;
    }
    if (!form.no_fixed_date && form.end_date < form.start_date) {
      toast.error("End date must be on or after start date.");
      return;
    }
    if (['fixed', 'range'].includes(form.price_mode)) {
      if (form.price_mode === 'fixed' && !form.price_fixed) {
        toast.error("Fixed price is required for this pricing mode.");
        return;
      }
      if (form.price_mode === 'range' && (!form.price_min || !form.price_max)) {
        toast.error("Min and max price are required for price range mode.");
        return;
      }
    }

    if (!center?.id) {
      toast.error("Center not found.");
      return;
    }

    try {
      const formData = {
        id: editingId || undefined,
        center_id: center.id,
        title: form.title,
        offering_type: form.offering_type,
        description: form.description,
        price_mode: form.price_mode,
        price_fixed: form.price_fixed,
        price_min: form.price_min,
        price_max: form.price_max,
        image_url: imageUrl || '',
        start_date: form.no_fixed_date ? '' : form.start_date,
        end_date: form.no_fixed_date ? '' : form.end_date,
        location: form.location,
        registration_url: form.registration_url,
        max_spots: form.max_spots,
        spots_booked: 0,
        sort_order: 0,
        status: form.status,
      };

      await saveMutation.mutateAsync(formData);
      const message = editingId ? "Offering updated." : "Offering created.";
      toast.success(message);

      setForm(emptyForm);
      setImageUrl(null);
      setEditingId(null);
      setShowDialog(false);
    } catch (err) {
      toast.error("Failed to save offering. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleDelete = async (offeringId: string, title: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${title}"? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteMutation.mutateAsync(offeringId);
      toast.success(`"${title}" has been removed.`);
    } catch (err) {
      toast.error("Failed to delete offering. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleEdit = (offering: OfferingRow) => {
    setEditingId(offering.id);
    setImageUrl(offering.image_url);
    setForm({
      title: offering.title,
      offering_type: offering.offering_type,
      description: offering.description || '',
      price_mode: offering.price_mode,
      price_fixed: offering.price_fixed ? offering.price_fixed.toString() : '',
      price_min: offering.price_min ? offering.price_min.toString() : '',
      price_max: offering.price_max ? offering.price_max.toString() : '',
      start_date: offering.start_date || '',
      end_date: offering.end_date || '',
      no_fixed_date: !offering.start_date && !offering.end_date,
      location: offering.location || '',
      registration_url: offering.registration_url || '',
      max_spots: offering.max_spots ? offering.max_spots.toString() : '',
      status: offering.status,
    });
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadCenterOfferingImage(file);
      setImageUrl(url);
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image."
      );
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setForm(emptyForm);
    setImageUrl(null);
    setEditingId(null);
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

  if (!center) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="mb-3 h-10 w-10 text-amber-600" />
            <p className="font-medium text-amber-900">No Center</p>
            <p className="mt-2 text-sm text-amber-800">
              You need to set up a center first before you can manage offerings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isFeatured) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="mb-3 h-10 w-10 text-amber-600" />
            <p className="font-medium text-amber-900">Featured Plan Feature</p>
            <p className="mt-2 text-sm text-amber-800">
              Offerings are available on the Featured plan. Upgrade to list your retreats, workshops, and events.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Offerings & Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your retreats, workshops, immersions, and special events.
          </p>
        </div>
        {!showDialog && (
          <Button onClick={() => setShowDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Offering
          </Button>
        )}
      </div>

      {/* Existing offerings list */}
      {offerings.length > 0 && !showDialog && (
        <div className="space-y-3">
          {offerings.map((offering) => (
            <Card key={offering.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{offering.title}</p>
                    <Badge variant="outline" className="text-xs">
                      {OFFERING_TYPES.find((t) => t.value === offering.offering_type)?.label}
                    </Badge>
                    <Badge
                      variant={offering.status === 'published' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {offering.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {offering.start_date && offering.end_date
                      ? `${offering.start_date} → ${offering.end_date}`
                      : 'Ongoing'}
                    {offering.location ? ` · ${offering.location}` : ''}
                  </p>
                  {offering.price_mode === 'free' && (
                    <p className="text-sm font-medium text-green-600">Free</p>
                  )}
                  {offering.price_mode === 'fixed' && offering.price_fixed && (
                    <p className="text-sm font-medium">${offering.price_fixed.toLocaleString()}</p>
                  )}
                  {offering.price_mode === 'range' && offering.price_min && offering.price_max && (
                    <p className="text-sm font-medium">
                      ${offering.price_min.toLocaleString()} – ${offering.price_max.toLocaleString()}
                    </p>
                  )}
                  {offering.price_mode === 'sliding' && (
                    <p className="text-sm font-medium">Sliding scale</p>
                  )}
                  {offering.price_mode === 'contact' && (
                    <p className="text-sm font-medium">Contact for pricing</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(offering)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(offering.id, offering.title)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {offerings.length === 0 && !showDialog && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plus className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No offerings yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Add your first retreat, workshop, or event listing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingId ? 'Edit Offering' : 'New Offering'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="7-Day Silent Meditation Retreat"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>

            {/* Offering Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.offering_type} onValueChange={(v) => handleChange('offering_type', v)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFERING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the offering, what's included, daily schedule..."
                className="min-h-[100px]"
                maxLength={750}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.description.length}/750 characters
              </p>
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.no_fixed_date}
                  onCheckedChange={(v) => handleChange('no_fixed_date', v)}
                />
                <Label className="cursor-pointer">Ongoing / no fixed date</Label>
              </div>
            </div>

            {!form.no_fixed_date && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="space-y-2">
              <Label htmlFor="priceMode">
                Pricing Mode <span className="text-destructive">*</span>
              </Label>
              <Select value={form.price_mode} onValueChange={(v) => handleChange('price_mode', v as PriceMode)}>
                <SelectTrigger id="priceMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.price_mode === 'fixed' && (
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1500"
                  value={form.price_fixed}
                  onChange={(e) => handleChange('price_fixed', e.target.value)}
                />
              </div>
            )}

            {form.price_mode === 'range' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priceMin">Min Price ($)</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="1000"
                    value={form.price_min}
                    onChange={(e) => handleChange('price_min', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMax">Max Price ($)</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="2000"
                    value={form.price_max}
                    onChange={(e) => handleChange('price_max', e.target.value)}
                  />
                </div>
              </div>
            )}

            {form.price_mode === 'sliding' && (
              <>
                <p className="text-xs text-muted-foreground">
                  Sliding scale: clients pay what they can afford within a range.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="slidingMin">Min Price ($)</Label>
                    <Input
                      id="slidingMin"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="35"
                      value={form.price_min}
                      onChange={(e) => handleChange('price_min', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slidingMax">Max Price ($)</Label>
                    <Input
                      id="slidingMax"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="75"
                      value={form.price_max}
                      onChange={(e) => handleChange('price_max', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Mauna Kea Retreat Center, Big Island"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>

            {/* Registration URL */}
            <div className="space-y-2">
              <Label htmlFor="regUrl">Registration URL</Label>
              <Input
                id="regUrl"
                type="url"
                placeholder="https://your-checkout.com"
                value={form.registration_url}
                onChange={(e) => handleChange('registration_url', e.target.value)}
              />
            </div>

            {/* Max Spots */}
            <div className="space-y-2">
              <Label htmlFor="maxSpots">Max Spots (leave blank for unlimited)</Label>
              <Input
                id="maxSpots"
                type="number"
                min="1"
                placeholder="20"
                value={form.max_spots}
                onChange={(e) => handleChange('max_spots', e.target.value)}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  <Upload className="h-4 w-4" /> Upload
                </Button>
                {imageUrl && (
                  <img src={imageUrl} alt="preview" className="h-16 w-16 rounded object-cover" />
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="draft"
                    name="status"
                    value="draft"
                    checked={form.status === 'draft'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="draft" className="cursor-pointer">Draft</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="published"
                    name="status"
                    value="published"
                    checked={form.status === 'published'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="published" className="cursor-pointer">Published</Label>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseDialog} disabled={saveMutation.isPending || uploading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending || uploading}>
                {saveMutation.isPending ? 'Saving...' : (editingId ? 'Update Offering' : 'Create Offering')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
