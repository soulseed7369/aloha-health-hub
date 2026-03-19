import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import { useMyTestimonials, useAddMyTestimonial, useUpdateMyTestimonial, useDeleteMyTestimonial } from "@/hooks/useMyTestimonials";
import type { PractitionerTestimonialRow, PractitionerTestimonialInsert } from "@/types/database";

interface TestimonialFormData {
  author: string;
  text: string;
  author_location: string;
  testimonial_date: string;
  status: 'draft' | 'published';
}

const emptyForm: TestimonialFormData = {
  author: "",
  text: "",
  author_location: "",
  testimonial_date: "",
  status: "draft",
};

const MAX_CHARS = 500;

export default function DashboardTestimonials() {
  const { data: practitioner, isLoading: practitionerLoading } = useMyPractitioner();
  const { data: testimonials = [], isLoading: testimonialsLoading } = useMyTestimonials(practitioner?.id ?? null);
  const addTestimonial = useAddMyTestimonial();
  const updateTestimonial = useUpdateMyTestimonial();
  const deleteTestimonial = useDeleteMyTestimonial();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<TestimonialFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const charCount = form.text.length;
  const isOverLimit = charCount > MAX_CHARS;

  const handleChange = (field: keyof TestimonialFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.author.trim()) {
      toast.error("Author name is required.");
      return;
    }
    if (!form.text.trim()) {
      toast.error("Testimonial text is required.");
      return;
    }
    if (charCount > MAX_CHARS) {
      toast.error(`Testimonial exceeds ${MAX_CHARS} character limit by ${charCount - MAX_CHARS} characters.`);
      return;
    }

    try {
      if (!practitioner) {
        toast.error("Practitioner profile not found.");
        return;
      }

      const payload: PractitionerTestimonialInsert = {
        practitioner_id: practitioner.id,
        author: form.author,
        text: form.text,
        author_location: form.author_location || null,
        testimonial_date: form.testimonial_date || null,
        linked_type: null,
        linked_id: null,
        sort_order: 0,
        status: form.status,
      };

      if (editingId) {
        await updateTestimonial.mutateAsync({
          id: editingId,
          ...payload,
        });
        toast.success("Testimonial updated.");
      } else {
        await addTestimonial.mutateAsync(payload);
        toast.success("Testimonial created as draft.");
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowDialog(false);
    } catch (err) {
      toast.error("Failed to save testimonial. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleDelete = async (testimonialId: string, author: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the testimonial from "${author}"? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteTestimonial.mutateAsync(testimonialId);
      toast.success(`Testimonial from "${author}" has been removed.`);
    } catch (err) {
      toast.error("Failed to delete testimonial. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleEdit = (testimonial: PractitionerTestimonialRow) => {
    setEditingId(testimonial.id);
    setForm({
      author: testimonial.author,
      text: testimonial.text,
      author_location: testimonial.author_location || '',
      testimonial_date: testimonial.testimonial_date || '',
      status: testimonial.status,
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  if (practitionerLoading || testimonialsLoading) {
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
          <h1 className="font-display text-2xl font-bold">Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curate client quotes and success stories.
          </p>
        </div>
        {!showDialog && (
          <Button onClick={() => setShowDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Testimonial
          </Button>
        )}
      </div>

      {/* Existing testimonials list */}
      {testimonials.length > 0 && !showDialog && (
        <div className="space-y-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="border-l-4 border-l-amber-300">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <p className="italic text-muted-foreground">
                      "{testimonial.text.substring(0, 120)}{testimonial.text.length > 120 ? '...' : ''}"
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">— {testimonial.author}</p>
                      {testimonial.author_location && (
                        <span className="text-xs text-muted-foreground">({testimonial.author_location})</span>
                      )}
                    </div>
                    {testimonial.testimonial_date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(testimonial.testimonial_date).toLocaleDateString()}
                      </p>
                    )}
                    <Badge
                      variant={testimonial.status === 'published' ? 'default' : 'secondary'}
                      className="w-fit text-xs"
                    >
                      {testimonial.status}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(testimonial)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteTestimonial.isPending}
                      onClick={() => handleDelete(testimonial.id, testimonial.author)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {testimonials.length === 0 && !showDialog && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plus className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No testimonials yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Add quotes from happy clients.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingId ? 'Edit Testimonial' : 'New Testimonial'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Author name */}
            <div className="space-y-2">
              <Label htmlFor="author">
                Author Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="author"
                placeholder="Sarah Mitchell"
                value={form.author}
                onChange={(e) => handleChange('author', e.target.value)}
              />
            </div>

            {/* Author location */}
            <div className="space-y-2">
              <Label htmlFor="location">Author Location</Label>
              <Input
                id="location"
                placeholder="Kihei, Maui"
                value={form.author_location}
                onChange={(e) => handleChange('author_location', e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.testimonial_date}
                onChange={(e) => handleChange('testimonial_date', e.target.value)}
              />
            </div>

            {/* Quote text */}
            <div className="space-y-2">
              <Label htmlFor="text">
                Testimonial <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="text"
                placeholder="This experience changed my life. I feel more centered and peaceful..."
                className="min-h-[140px]"
                value={form.text}
                onChange={(e) => handleChange('text', e.target.value)}
              />
              <div className="flex items-center justify-between">
                <p className={`text-xs ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {charCount} / {MAX_CHARS} characters
                </p>
                {isOverLimit && (
                  <p className="text-xs text-destructive font-medium">
                    Over limit by {charCount - MAX_CHARS}
                  </p>
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
                    onChange={(e) => handleChange('status', e.target.value as any)}
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
                    onChange={(e) => handleChange('status', e.target.value as any)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="published" className="cursor-pointer">Published</Label>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isOverLimit}>
                {editingId ? 'Update Testimonial' : 'Create Testimonial'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
