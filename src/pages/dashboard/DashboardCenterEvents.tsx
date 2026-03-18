/**
 * Center Events & Amenities dashboard panel.
 * Rendered inside DashboardCenters when a center is expanded.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, Plus, Trash2, Pencil, ChevronDown, ChevronUp,
  Repeat, DollarSign, MapPin, ExternalLink, Sparkles, Upload,
  Link as LinkIcon, CheckCircle2, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCenterEvents,
  useAddCenterEvent,
  useUpdateCenterEvent,
  useDeleteCenterEvent,
  useUpdateCenterAmenities,
  emptyEventForm,
  type CenterEventRow,
  type EventFormData,
} from "@/hooks/useCenterEvents";
import { fetchAndParseIcal, parseIcalFile, type IcalImportEvent } from "@/lib/ical";
import type { CenterRow } from "@/types/database";

// ─── Amenities ────────────────────────────────────────────────────────────────

const AMENITY_OPTIONS = [
  { value: "parking",          label: "Parking" },
  { value: "wifi",             label: "WiFi" },
  { value: "changing_rooms",   label: "Changing Rooms" },
  { value: "showers",          label: "Showers" },
  { value: "wheelchair",       label: "Wheelchair Accessible" },
  { value: "private_rooms",    label: "Private Rooms" },
  { value: "group_space",      label: "Group Space" },
  { value: "outdoor_area",     label: "Outdoor Area" },
  { value: "sauna",            label: "Sauna / Steam Room" },
  { value: "pool",             label: "Pool / Hot Tub" },
  { value: "cafe",             label: "Juice Bar / Café" },
  { value: "retail",           label: "Retail / Shop" },
];

function AmenitiesPanel({ center }: { center: CenterRow }) {
  const updateMutation = useUpdateCenterAmenities();
  const [selected, setSelected] = useState<string[]>(center.amenities ?? []);
  const [dirty, setDirty] = useState(false);

  const toggle = (val: string) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ centerId: center.id, amenities: selected });
      toast.success("Amenities saved.");
      setDirty(false);
    } catch {
      toast.error("Failed to save amenities.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> Amenities
        </p>
        {dirty && (
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {AMENITY_OPTIONS.map((a) => {
          const active = selected.includes(a.value);
          return (
            <button
              key={a.value}
              onClick={() => toggle(a.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Select the amenities your center offers — they appear on your public profile.
        </p>
      )}
    </div>
  );
}

// ─── Event form ───────────────────────────────────────────────────────────────

function EventForm({
  centerId,
  initialValues = emptyEventForm,
  eventId,
  onDone,
  onCancel,
}: {
  centerId: string;
  initialValues?: EventFormData;
  eventId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EventFormData>({ ...emptyEventForm, ...initialValues });
  const addMutation    = useAddCenterEvent(centerId);
  const updateMutation = useUpdateCenterEvent(centerId);
  const isPending      = addMutation.isPending || updateMutation.isPending;

  const set = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    try {
      if (eventId) {
        await updateMutation.mutateAsync({ id: eventId, form });
      } else {
        await addMutation.mutateAsync(form);
      }
      toast.success(eventId ? "Event updated." : "Event added.");
      onDone();
    } catch {
      toast.error("Failed to save event.");
    }
  };

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{eventId ? "Edit Event" : "New Event"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Sound Bath Journey"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="What will attendees experience?"
            className="min-h-[80px]"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Start time</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => set("start_time", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End time</Label>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => set("end_time", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pricing</Label>
            <Select value={form.price_mode} onValueChange={(v) => set("price_mode", v as EventFormData["price_mode"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="fixed">Fixed price</SelectItem>
                <SelectItem value="range">Price range</SelectItem>
                <SelectItem value="sliding">Sliding scale</SelectItem>
                <SelectItem value="contact">Contact for price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.price_mode === "fixed" && (
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min="0"
                placeholder="25"
                value={form.price_fixed}
                onChange={(e) => set("price_fixed", e.target.value)}
              />
            </div>
          )}
          {(form.price_mode === "range" || form.price_mode === "sliding") && (
            <>
              <div className="space-y-2">
                <Label>Min ($)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="15"
                  value={form.price_min}
                  onChange={(e) => set("price_min", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max ($)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="45"
                  value={form.price_max}
                  onChange={(e) => set("price_max", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Location <span className="text-muted-foreground text-xs">(leave blank to use center address)</span></Label>
            <Input
              placeholder="Studio B"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Max attendees</Label>
            <Input
              type="number"
              min="1"
              placeholder="20"
              value={form.max_attendees}
              onChange={(e) => set("max_attendees", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Registration / booking URL</Label>
          <Input
            type="url"
            placeholder="https://..."
            value={form.registration_url}
            onChange={(e) => set("registration_url", e.target.value)}
          />
        </div>

        {/* Recurring toggle */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={form.is_recurring}
            onChange={(e) => set("is_recurring", e.target.checked)}
          />
          <div>
            <p className="text-sm font-medium">Recurring event</p>
            <p className="text-xs text-muted-foreground">e.g. every Tuesday, monthly, etc.</p>
          </div>
        </label>

        {form.is_recurring && (
          <div className="space-y-2">
            <Label>Recurrence description</Label>
            <Input
              placeholder="Every Tuesday at 7pm"
              value={form.recurrence_rule}
              onChange={(e) => set("recurrence_rule", e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as "draft" | "published")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft (hidden)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : eventId ? "Update Event" : "Add Event"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function priceLabel(e: CenterEventRow): string {
  if (e.price_mode === "free")    return "Free";
  if (e.price_mode === "contact") return "Contact for price";
  if (e.price_mode === "fixed" && e.price_fixed != null) return `$${e.price_fixed}`;
  if ((e.price_mode === "range" || e.price_mode === "sliding") && e.price_min != null && e.price_max != null)
    return `$${e.price_min}–$${e.price_max}`;
  return "";
}

function formatDate(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!timeStr) return date;
  const [h, m] = timeStr.split(":");
  const t = new Date();
  t.setHours(parseInt(h, 10), parseInt(m, 10));
  return `${date} · ${t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function EventCard({ event, centerId }: { event: CenterEventRow; centerId: string }) {
  const [editing, setEditing] = useState(false);
  const deleteMutation = useDeleteCenterEvent(centerId);

  const handleDelete = async () => {
    if (!confirm(`Remove "${event.title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(event.id);
      toast.success("Event removed.");
    } catch {
      toast.error("Failed to remove event.");
    }
  };

  if (editing) {
    return (
      <EventForm
        centerId={centerId}
        eventId={event.id}
        initialValues={{
          title:            event.title,
          description:      event.description ?? "",
          event_date:       event.event_date ?? "",
          start_time:       event.start_time ?? "",
          end_time:         event.end_time   ?? "",
          price_mode:       event.price_mode,
          price_fixed:      event.price_fixed?.toString()  ?? "",
          price_min:        event.price_min?.toString()    ?? "",
          price_max:        event.price_max?.toString()    ?? "",
          location:         event.location         ?? "",
          registration_url: event.registration_url ?? "",
          max_attendees:    event.max_attendees?.toString() ?? "",
          is_recurring:     event.is_recurring,
          recurrence_rule:  event.recurrence_rule ?? "",
          status:           event.status,
        }}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const dateLabel = event.is_recurring
    ? event.recurrence_rule || "Recurring"
    : formatDate(event.event_date, event.start_time);

  const price = priceLabel(event);

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{event.title}</span>
          {event.is_recurring && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Repeat className="h-3 w-3" /> Recurring
            </Badge>
          )}
          {event.status === "draft" && (
            <Badge variant="outline" className="text-xs text-muted-foreground">Draft</Badge>
          )}
        </div>
        {dateLabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-1">
          {price && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> {price}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {event.location}
            </span>
          )}
          {event.max_attendees && (
            <span className="text-xs text-muted-foreground">
              {event.attendees_booked}/{event.max_attendees} spots
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {event.registration_url && (
          <a
            href={event.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
            title="Open registration link"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          disabled={deleteMutation.isPending}
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Events panel ─────────────────────────────────────────────────────────────

// ─── iCal Import Panel ────────────────────────────────────────────────────────

function IcalImportPanel({
  centerId,
  onClose,
}: {
  centerId: string;
  onClose: () => void;
}) {
  const [mode, setMode]         = useState<'url' | 'file'>('url');
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState<IcalImportEvent[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const addMutation = useAddCenterEvent(centerId);

  const handleFetchUrl = async () => {
    if (!url.trim()) { toast.error('Paste your iCal URL first.'); return; }
    setLoading(true);
    try {
      const events = await fetchAndParseIcal(url.trim());
      if (events.length === 0) {
        toast.error('No events found in that calendar. Make sure the calendar is public.');
        return;
      }
      setPreview(events);
      setSelected(new Set(events.map((_, i) => i)));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not fetch calendar. Make sure it is a public iCal URL.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const events = await parseIcalFile(file);
      if (events.length === 0) {
        toast.error('No events found in that file.');
        return;
      }
      setPreview(events);
      setSelected(new Set(events.map((_, i) => i)));
    } catch {
      toast.error('Could not parse the .ics file.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const handleImport = async () => {
    if (!preview || selected.size === 0) return;
    let ok = 0;
    let fail = 0;
    for (const i of selected) {
      const ev = preview[i];
      try {
        await addMutation.mutateAsync({
          title:           ev.title ?? '',
          description:     ev.description ?? '',
          event_date:      ev.event_date ?? '',
          start_time:      ev.start_time ?? '',
          end_time:        ev.end_time   ?? '',
          price_mode:      ev.price_mode ?? 'contact',
          price_fixed:     ev.price_fixed  ?? '',
          price_min:       ev.price_min    ?? '',
          price_max:       ev.price_max    ?? '',
          location:        ev.location        ?? '',
          registration_url: ev.registration_url ?? '',
          max_attendees:   ev.max_attendees   ?? '',
          is_recurring:    ev.is_recurring    ?? false,
          recurrence_rule: ev.recurrence_rule ?? '',
          status:          'published',
        });
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(
      fail === 0
        ? `${ok} event${ok !== 1 ? 's' : ''} imported.`
        : `${ok} imported, ${fail} failed.`,
    );
    onClose();
  };

  // ── Step 1: source picker ────────────────────────────────────────────────
  if (!preview) {
    return (
      <Card className="border-primary/20 bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import from Calendar
          </CardTitle>
          <CardDescription>
            Import your existing schedule from Google Calendar, Apple Calendar, or any .ics file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab toggle */}
          <div className="flex rounded-lg border overflow-hidden w-fit">
            <button
              onClick={() => setMode('url')}
              className={`px-4 py-1.5 text-sm font-medium flex items-center gap-1.5 ${mode === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <LinkIcon className="h-3.5 w-3.5" /> iCal URL
            </button>
            <button
              onClick={() => setMode('file')}
              className={`px-4 py-1.5 text-sm font-medium flex items-center gap-1.5 ${mode === 'file' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <Upload className="h-3.5 w-3.5" /> Upload .ics
            </button>
          </div>

          {mode === 'url' ? (
            <div className="space-y-2">
              <Label>iCal URL</Label>
              <Input
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                In Google Calendar: ⋮ next to your calendar → Settings → "Secret address in iCal format"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Upload .ics file</Label>
              <input
                type="file"
                accept=".ics,text/calendar"
                className="block text-sm file:mr-3 file:rounded file:border file:border-border file:bg-background file:px-3 file:py-1 file:text-xs file:font-medium"
                onChange={handleFile}
              />
              <p className="text-xs text-muted-foreground">
                Export from Google Calendar: Settings → your calendar → Export. From Apple Calendar: File → Export.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            {mode === 'url' && (
              <Button size="sm" onClick={handleFetchUrl} disabled={loading}>
                {loading ? 'Fetching…' : 'Preview Events'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Step 2: preview & select ─────────────────────────────────────────────
  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {preview.length} event{preview.length !== 1 ? 's' : ''} found — select to import
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            className="hover:text-foreground"
            onClick={() => setSelected(new Set(preview.map((_, i) => i)))}
          >
            Select all
          </button>
          <span>·</span>
          <button className="hover:text-foreground" onClick={() => setSelected(new Set())}>
            Deselect all
          </button>
          <span className="ml-auto font-medium text-foreground">
            {selected.size} selected
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {preview.map((ev, i) => (
            <label
              key={i}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition-colors ${
                selected.has(i) ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 accent-primary shrink-0"
                checked={selected.has(i)}
                onChange={() => toggleSelect(i)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ev.is_recurring
                    ? ev.recurrence_rule || 'Recurring'
                    : [ev.event_date, ev.start_time].filter(Boolean).join(' · ')}
                  {ev.location && ` · ${ev.location}`}
                </p>
              </div>
              {selected.has(i) && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              )}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Back</Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={selected.size === 0 || addMutation.isPending}
          >
            {addMutation.isPending
              ? 'Importing…'
              : `Import ${selected.size} Event${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Events Panel ─────────────────────────────────────────────────────────────

function EventsPanel({ centerId }: { centerId: string }) {
  const { data: events = [], isLoading } = useCenterEvents(centerId);
  const [adding, setAdding]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((p) => !p)}
        >
          <CalendarDays className="h-4 w-4" />
          Events ({events.length})
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {!adding && !importing && expanded && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => setImporting(true)}
              title="Import from Google Calendar or .ics file"
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Event
            </Button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="space-y-2">
          {importing && (
            <IcalImportPanel
              centerId={centerId}
              onClose={() => setImporting(false)}
            />
          )}

          {isLoading && (
            <>
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </>
          )}

          {!isLoading && events.map((ev) => (
            <EventCard key={ev.id} event={ev} centerId={centerId} />
          ))}

          {!isLoading && events.length === 0 && !adding && !importing && (
            <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
              No events yet. Add manually or import from your calendar.
            </p>
          )}

          {adding && (
            <EventForm
              centerId={centerId}
              onDone={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export — combined panel ─────────────────────────────────────────────

export function CenterEventsAndAmenities({ center }: { center: CenterRow }) {
  return (
    <div className="space-y-6 border-t pt-4 mt-4">
      <AmenitiesPanel center={center} />
      <div className="border-t" />
      <EventsPanel centerId={center.id} />
    </div>
  );
}
