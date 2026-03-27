import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, Lock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useMyCenters } from "@/hooks/useMyCenters";
import { useMyBillingProfile } from "@/hooks/useStripe";
import { useMyCenterClasses, useSaveCenterClass, useDeleteCenterClass } from "@/hooks/useMyCenterClasses";
import type { PriceMode, ClassRow } from "@/types/database";

interface ClassFormData {
  title: string;
  description: string;
  day_of_week: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | '';
  start_time: string;
  duration_minutes: string;
  specific_date: string;
  end_date: string;
  use_specific_date: boolean;
  price_mode: PriceMode;
  price_fixed: string;
  price_min: string;
  price_max: string;
  location: string;
  registration_url: string;
  max_spots: string;
  status: 'draft' | 'published';
}

const emptyForm: ClassFormData = {
  title: "",
  description: "",
  day_of_week: "",
  start_time: "",
  duration_minutes: "",
  specific_date: "",
  end_date: "",
  use_specific_date: false,
  price_mode: "free",
  price_fixed: "",
  price_min: "",
  price_max: "",
  location: "",
  registration_url: "",
  max_spots: "",
  status: "draft",
};

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

const DURATIONS = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '75', label: '75 min' },
  { value: '90', label: '90 min' },
  { value: '120', label: '120 min' },
];

const PRICE_MODES = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'range', label: 'Price range' },
  { value: 'sliding', label: 'Sliding scale' },
  { value: 'contact', label: 'Contact for pricing' },
  { value: 'free', label: 'Free' },
];

export default function DashboardCenterClasses() {
  const { data: centers = [], isLoading: centersLoading } = useMyCenters();
  const center = centers[0] || null;
  const { data: classes = [], isLoading: classesLoading } = useMyCenterClasses(center?.id ?? null);
  const { data: billing } = useMyBillingProfile();
  const saveClass = useSaveCenterClass();
  const deleteClass = useDeleteCenterClass();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<ClassFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isLoading = centersLoading || classesLoading;
  const tier = billing?.tier ?? center?.tier ?? 'free';
  const isFeatured = tier === 'featured';

  const handleChange = (field: keyof ClassFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Class title is required.");
      return;
    }
    if (form.use_specific_date) {
      if (!form.specific_date) {
        toast.error("Specific date is required.");
        return;
      }
    } else {
      if (!form.day_of_week) {
        toast.error("Day of week is required.");
        return;
      }
    }
    if (!form.start_time) {
      toast.error("Start time is required.");
      return;
    }
    if (!form.duration_minutes) {
      toast.error("Duration is required.");
      return;
    }
    if (['fixed', 'range', 'sliding'].includes(form.price_mode)) {
      if (form.price_mode === 'fixed' && !form.price_fixed) {
        toast.error("Fixed price is required for this pricing mode.");
        return;
      }
      if ((form.price_mode === 'range' || form.price_mode === 'sliding') && (!form.price_min || !form.price_max)) {
        toast.error("Min and max price are required for this pricing mode.");
        return;
      }
    }

    if (!center?.id) {
      toast.error("Center not found.");
      return;
    }

    try {
      await saveClass.mutateAsync({
        id: editingId || undefined,
        center_id: center.id,
        title: form.title,
        description: form.description,
        price_mode: form.price_mode,
        price_fixed: form.price_fixed,
        price_min: form.price_min,
        price_max: form.price_max,
        duration_minutes: form.duration_minutes,
        day_of_week: form.use_specific_date ? null : (form.day_of_week || null),
        start_time: form.start_time,
        specific_date: form.use_specific_date ? form.specific_date : '',
        end_date: form.use_specific_date ? form.end_date : '',
        location: form.location,
        registration_url: form.registration_url,
        max_spots: form.max_spots,
        spots_booked: editingId
          ? (classes.find(c => c.id === editingId)?.spots_booked ?? 0)
          : 0,
        sort_order: editingId
          ? (classes.find(c => c.id === editingId)?.sort_order ?? 0)
          : 0,
        status: form.status,
      });

      toast.success(editingId ? "Class updated." : "Class created as draft.");
      setForm(emptyForm);
      setEditingId(null);
      setShowDialog(false);
    } catch (err) {
      toast.error("Failed to save class. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleDelete = async (classId: string, title: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${title}"? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteClass.mutateAsync(classId);
      toast.success(`"${title}" has been removed.`);
    } catch (err) {
      toast.error("Failed to delete class. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleEdit = (classItem: ClassRow) => {
    setEditingId(classItem.id);
    const timeWithoutSeconds = classItem.start_time?.split(':').slice(0, 2).join(':') || '';
    const hasSpecificDate = !!classItem.specific_date;
    setForm({
      title: classItem.title,
      description: classItem.description || '',
      day_of_week: classItem.day_of_week || '',
      start_time: timeWithoutSeconds,
      duration_minutes: classItem.duration_minutes ? classItem.duration_minutes.toString() : '',
      specific_date: classItem.specific_date || '',
      end_date: classItem.end_date || '',
      use_specific_date: hasSpecificDate,
      price_mode: classItem.price_mode,
      price_fixed: classItem.price_fixed ? classItem.price_fixed.toString() : '',
      price_min: classItem.price_min ? classItem.price_min.toString() : '',
      price_max: classItem.price_max ? classItem.price_max.toString() : '',
      location: classItem.location || '',
      registration_url: classItem.registration_url || '',
      max_spots: classItem.max_spots ? classItem.max_spots.toString() : '',
      status: classItem.status,
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  if (isLoading || classesLoading) {
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
              You need to set up a center first before you can manage classes.
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
              Classes are available on the Featured plan. Upgrade to list your recurring yoga, breathwork, or sound bath classes.
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
          <h1 className="font-display text-2xl font-bold">Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your recurring class sessions and group sessions.
          </p>
        </div>
        {!showDialog && (
          <Button onClick={() => setShowDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Class
          </Button>
        )}
      </div>

      {/* Existing classes list */}
      {classes.length > 0 && !showDialog && (
        <div className="space-y-3">
          {classes.map((classItem) => {
            const dayLabel = DAYS_OF_WEEK.find((d) => d.value === classItem.day_of_week)?.label;
            const specificDate = classItem.specific_date;
            const scheduleLabel = specificDate
              ? new Date(specificDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
              : dayLabel ? `Every ${dayLabel}` : '';
            return (
              <Card key={classItem.id}>
                <CardContent className="flex items-start justify-between p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{classItem.title}</p>
                      {specificDate && <Badge variant="outline" className="text-xs"><Calendar className="w-3 h-3 mr-1" />One-off</Badge>}
                      <Badge
                        variant={classItem.status === 'published' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {classItem.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {scheduleLabel}{classItem.start_time ? ` at ${classItem.start_time.split(':').slice(0, 2).join(':')}` : ''}{' '}
                      {classItem.duration_minutes && `· ${classItem.duration_minutes} min`}
                      {classItem.location ? ` · ${classItem.location}` : ''}
                    </p>
                    {classItem.price_mode === 'free' && (
                      <p className="text-sm font-medium text-green-600">Free</p>
                    )}
                    {classItem.price_mode === 'fixed' && classItem.price_fixed && (
                      <p className="text-sm font-medium">${classItem.price_fixed.toLocaleString()}</p>
                    )}
                    {classItem.price_mode === 'range' && classItem.price_min && classItem.price_max && (
                      <p className="text-sm font-medium">
                        ${classItem.price_min.toLocaleString()} – ${classItem.price_max.toLocaleString()}
                      </p>
                    )}
                    {classItem.price_mode === 'sliding' && (
                      <p className="text-sm font-medium">Sliding scale</p>
                    )}
                    {classItem.price_mode === 'contact' && (
                      <p className="text-sm font-medium">Contact for pricing</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(classItem)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteClass.isPending}
                      onClick={() => handleDelete(classItem.id, classItem.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {classes.length === 0 && !showDialog && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plus className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No classes yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Add your first class listing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingId ? 'Edit Class' : 'New Class'}
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
                placeholder="Morning Yoga Flow"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What students can expect..."
                className="min-h-[80px]"
                maxLength={500}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.description.length}/500 characters
              </p>
            </div>

            {/* Schedule Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.use_specific_date}
                  onCheckedChange={(v) => handleChange('use_specific_date', v)}
                />
                <Label className="cursor-pointer">One-off class (specific date)</Label>
              </div>
            </div>

            {/* Recurring or One-Off */}
            {!form.use_specific_date ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">
                    Day of Week <span className="text-destructive">*</span>
                  </Label>
                  <Select value={form.day_of_week} onValueChange={(v) => handleChange('day_of_week', v)}>
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specificDate">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="specificDate"
                    type="date"
                    value={form.specific_date}
                    onChange={(e) => handleChange('specific_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDateClass">End Date (optional)</Label>
                  <Input
                    id="endDateClass"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={form.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">
                Duration <span className="text-destructive">*</span>
              </Label>
              <Select value={form.duration_minutes} onValueChange={(v) => handleChange('duration_minutes', v)}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  placeholder="25"
                  value={form.price_fixed}
                  onChange={(e) => handleChange('price_fixed', e.target.value)}
                />
              </div>
            )}

            {(form.price_mode === 'range' || form.price_mode === 'sliding') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priceMin">Min Price ($)</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="15"
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
                    placeholder="35"
                    value={form.price_max}
                    onChange={(e) => handleChange('price_max', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Studio Room A, or Online"
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
                placeholder="https://your-booking.com"
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
              <Button variant="outline" onClick={handleCloseDialog} disabled={saveClass.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveClass.isPending}>
                {saveClass.isPending ? 'Saving...' : (editingId ? 'Update Class' : 'Create Class')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
