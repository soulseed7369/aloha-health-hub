# Offerings & Events Feature — Research Summary

## Overview

The Hawaiʻi Wellness codebase supports three distinct offerings/events models:
1. **Offerings** (practitioners) — one-time or multi-day events (retreats, workshops, immersions, ceremonies)
2. **Classes** (practitioners) — recurring weekly sessions (yoga, breathwork, sound bath)
3. **Center Events** (centers) — single/recurring events hosted by wellness centers

All three share similar pricing, registration, and capacity models.

---

## Data Models

### 1. OFFERINGS (Practitioners)

**Table:** `offerings`
**Migration:** `20260317000001_offerings_classes_testimonials.sql`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `practitioner_id` | uuid | FK → practitioners |
| `title` | text | Required |
| `description` | text | Nullable |
| `offering_type` | text | ENUM: 'retreat', 'workshop', 'immersion', 'mentorship', 'ceremony', 'event' |
| `price_mode` | text | ENUM: 'fixed', 'range', 'sliding', 'contact', 'free' |
| `price_fixed` | numeric(10,2) | For 'fixed' mode only |
| `price_min` | numeric(10,2) | For 'range'/'sliding' modes |
| `price_max` | numeric(10,2) | For 'range'/'sliding' modes |
| `image_url` | text | Single image (uploaded to 'practitioner-images' bucket) |
| `start_date` | date | ISO date; nullable = evergreen/ongoing |
| `end_date` | date | ISO date; must be ≥ start_date (validation in UI) |
| `location` | text | Event location (e.g., "Kailua-Kona, HI") |
| `registration_url` | text | External booking URL (Eventbrite, Calendly, custom link) |
| `max_spots` | integer | Capacity; nullable = unlimited |
| `spots_booked` | integer | Counter (currently static in schema — no auto-increment) |
| `sort_order` | integer | Manual sort priority (ascending) |
| `status` | text | ENUM: 'draft', 'published' |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-trigger on UPDATE |

**Pricing Logic:**
- `free` → display "Free"
- `fixed` → display `$price_fixed`
- `range` → display `$price_min–$price_max`
- `sliding` → display `$price_min–$price_max` (scale-friendly)
- `contact` → display "Contact for pricing"

**Date Display:**
- If both `start_date` and `end_date` → "Month Year – Month Year"
- If neither → "Ongoing — flexible start"
- Dates use `formatDate()` helper: `new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })`

**Spots Display:**
- If `max_spots` and `spots_booked / max_spots >= 0.5` → show "X spots remaining"
- If `max_spots && spots_booked >= max_spots` → show "Join Waitlist" button instead of "Register"

---

### 2. CLASSES (Practitioners)

**Table:** `classes`
**Migration:** `20260317000001_offerings_classes_testimonials.sql`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `practitioner_id` | uuid | FK → practitioners |
| `title` | text | Required |
| `description` | text | Nullable |
| `price_mode` | text | ENUM: 'fixed', 'range', 'sliding', 'contact', 'free' |
| `price_fixed` | numeric(10,2) | For 'fixed' mode |
| `price_min` | numeric(10,2) | For 'range'/'sliding' modes |
| `price_max` | numeric(10,2) | For 'range'/'sliding' modes |
| `duration_minutes` | integer | e.g., 60, 90 |
| `day_of_week` | text | ENUM: 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun' (nullable) |
| `start_time` | time | HH:mm:ss (wall-clock, no timezone) |
| `location` | text | Where class is held |
| `registration_url` | text | External booking link |
| `max_spots` | integer | Capacity; nullable = unlimited |
| `spots_booked` | integer | Counter |
| `sort_order` | integer | Manual ordering |
| `status` | text | ENUM: 'draft', 'published' |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-trigger |

**No Image Field** — unlike offerings, classes have no image.

**Time Display:**
- `start_time` is stored as Postgres `time` (e.g., "14:30:00")
- Converted with `formatTime()`: `"HH:mm:ss"` → `"HH:MM AM/PM"`
- Example: `"14:30:00"` → `"2:30 PM"`

**Day Display:**
- Short labels: 'mon' → 'Monday', etc.
- Used in UI for grouping recurring sessions

---

### 3. CENTER EVENTS

**Table:** `center_events`
**Migration:** `20260317000002_centers_sprint1.sql`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `center_id` | uuid | FK → centers |
| `title` | text | Required |
| `description` | text | Nullable |
| `event_date` | date | Single day (differs from offerings' date range) |
| `start_time` | time | HH:mm:ss |
| `end_time` | time | HH:mm:ss (optional) |
| `duration_minutes` | integer | Optional (can be derived from start/end) |
| `price_mode` | text | ENUM: 'fixed', 'range', 'sliding', 'contact', 'free' |
| `price_fixed` | numeric(10,2) | |
| `price_min` | numeric(10,2) | |
| `price_max` | numeric(10,2) | |
| `image_url` | text | Single image URL |
| `location` | text | Override location (default to center) |
| `registration_url` | text | Booking link |
| `max_attendees` | integer | Capacity; nullable = unlimited |
| `attendees_booked` | integer | Counter |
| `is_recurring` | boolean | `true` = multi-date series |
| `recurrence_rule` | text | Simple string: 'weekly', 'monthly', 'every tue/thu', etc. |
| `sort_order` | integer | Manual ordering |
| `status` | text | ENUM: 'draft', 'published' |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-trigger |

**Key Difference from Offerings:**
- Single `event_date` (not start/end range)
- Has `end_time` and optional `duration_minutes`
- Supports `is_recurring` flag + text-based `recurrence_rule` (not sophisticated — just descriptive text)

---

### 4. TESTIMONIALS (linked to offerings/classes/events)

**Practitioner Testimonials Table:** `practitioner_testimonials`
**Center Testimonials Table:** `center_testimonials`

Both support optional `linked_type` and `linked_id` to associate testimonials with specific offerings, classes, or events (not currently displayed in UI, but schema exists).

---

## TypeScript Types

### OfferingRow (from `src/types/database.ts`)
```typescript
export interface OfferingRow {
  id: string;
  practitioner_id: string;
  title: string;
  description: string | null;
  offering_type: 'retreat' | 'workshop' | 'immersion' | 'mentorship' | 'ceremony' | 'event';
  price_mode: PriceMode;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  image_url: string | null;
  start_date: string | null;    // ISO "YYYY-MM-DD"
  end_date: string | null;
  location: string | null;
  registration_url: string | null;
  max_spots: number | null;
  spots_booked: number;
  sort_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}
```

### ClassRow (from `src/types/database.ts`)
```typescript
export interface ClassRow {
  id: string;
  practitioner_id: string;
  title: string;
  description: string | null;
  price_mode: PriceMode;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  duration_minutes: number | null;
  day_of_week: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null;
  start_time: string | null;    // "HH:mm:ss"
  location: string | null;
  registration_url: string | null;
  max_spots: number | null;
  spots_booked: number;
  sort_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}
```

### CenterEventRow (from `src/hooks/useCenterEvents.ts`)
```typescript
export interface CenterEventRow {
  id: string;
  center_id: string;
  title: string;
  description: string | null;
  event_date: string | null;       // ISO date
  start_time: string | null;       // "HH:mm:ss"
  end_time: string | null;
  duration_minutes: number | null;
  price_mode: PriceMode;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  image_url: string | null;
  location: string | null;
  registration_url: string | null;
  max_attendees: number | null;
  attendees_booked: number;
  is_recurring: boolean;
  recurrence_rule: string | null;
  sort_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}
```

### PriceMode Type
```typescript
export type PriceMode = 'fixed' | 'range' | 'sliding' | 'contact' | 'free';
```

---

## Hooks

### For Practitioners: Offerings

**File:** `src/hooks/useMyOfferings.ts`

- `useMyOfferings()` — fetch all offerings for current user's practitioner (includes drafts)
- `useSaveOffering()` — create or update offering via `OfferingFormData`
- `useDeleteOffering()` — delete by ID
- `uploadOfferingImage(file)` — upload to 'practitioner-images' bucket; max 5MB; supports JPG, PNG, WebP, GIF

**Public fetch:**
- `usePractitionerOfferings(practitionerId)` — fetch published offerings only

### For Practitioners: Classes

**File:** `src/hooks/useMyClasses.ts`

- `useMyClasses()` — fetch all classes for current user's practitioner (includes drafts)
- `useSaveClass()` — create or update class
- `useDeleteClass()` — delete by ID
- **No image upload** — classes have no image field

**Public fetch:**
- `usePractitionerClasses(practitionerId)` — fetch published classes only

### For Centers: Events

**File:** `src/hooks/useCenterEvents.ts`

- `useCenterEvents(centerId)` — fetch all events for a center (includes drafts)
- `useAddCenterEvent(centerId)` — create event
- `useUpdateCenterEvent(centerId)` — update event
- `useDeleteCenterEvent(centerId)` — delete event
- `usePublicCenterEvents(centerId)` — fetch upcoming published events only; filters by `event_date >= today` or `event_date IS NULL`; limits to 12

**Amenities:**
- `useUpdateCenterAmenities()` — update center's amenity list (separate from events)

---

## Dashboard UI (Provider Create/Edit)

### Offerings Dashboard
**File:** `src/pages/dashboard/DashboardOfferings.tsx`

**Access:** Premium tier only (shows lock message for free tier)

**Visible in:** Provider dashboard → "Offerings & Events" tab

**Functionality:**
- List all offerings (drafts + published)
- Edit offering (opens dialog; pre-fills fields and image URL)
- Delete offering (confirm dialog)
- Create new offering (shows empty form dialog)

**Form Fields:**
- Title (text, required)
- Offering Type (select: retreat, workshop, immersion, mentorship, ceremony, event)
- Description (textarea)
- Price Mode (select: fixed, range, sliding, contact, free)
- Price fields (fixed/min/max) — visible based on price_mode
- Image URL (text, or upload via file input; updates state)
- Start Date, End Date (date inputs; optional if `no_fixed_date` is checked)
- Checkbox: "Ongoing" (skips date requirement)
- Location (text, optional)
- Registration URL (text, optional)
- Max Spots (integer, optional)
- Status (draft/published)

**Image Upload:**
- Triggers `uploadOfferingImage()` → stores at `practitioner-images/offerings/{timestamp}-{random}.ext`
- Shows uploading state
- Displays error toast if file > 5MB or unsupported type

**Validation:**
- Title required
- If not "Ongoing": start_date and end_date required
- end_date >= start_date
- For 'fixed' mode: price_fixed required
- For 'range' mode: price_min and price_max required

**List Display (before dialog opens):**
Each offering card shows:
- Title + type badge (e.g., "Retreat") + status badge
- Dates (ISO format or "Ongoing") + location
- Pricing summary (formatted price)
- Edit & Delete buttons

### Classes Dashboard
**File:** `src/pages/dashboard/DashboardClasses.tsx`

**Access:** Premium tier only

**Visible in:** Provider dashboard → "Classes" tab

**Form Fields:**
- Title (text, required)
- Description (textarea)
- Day of Week (select: mon–sun, required)
- Start Time (time input, required)
- Duration (select: 30, 45, 60, 75, 90, 120 min)
- Price Mode (select)
- Price fields (based on mode)
- Location (text, optional)
- Registration URL (text, optional)
- Max Spots (integer, optional)
- Status (draft/published)

**Validation:**
- Title required
- Day of week required
- Start time required
- For 'fixed' mode: price_fixed required
- For 'range' mode: price_min/max required

**List Display:**
Each class card shows:
- Title
- Day of week badge
- Start time, duration, location (comma-separated)
- Pricing summary
- Edit & Delete buttons

---

## Public Display (Profile Detail Page)

**File:** `src/pages/ProfileDetail.tsx`

### Offerings Tab

**Rendered at:** Line 919–996

**Visibility:** Only shows if practitioner is tiered (premium/featured) AND has offerings

**Layout:**
```
Grid: grid-cols-1 gap-4

┌─────────────────────────────────────────────┐
│  [Image] — 600×192px, lazy-loaded            │
│  ─────────────────────────────────────────  │
│  [Type badge] "Retreat"                     │
│  Title (line-clamp-2)                       │
│  Description (line-clamp-2, small)          │
│  Price | Dates | Location (xs text, wrap)   │
│  [X spots remaining] (if 50%+ booked)       │
│  [Register] or [Join Waitlist] button       │
└─────────────────────────────────────────────┘
```

**Image:**
- Uses `OptimizedImage` component
- Size: 600×192px (h-48 height)
- `loading="lazy"`, responsive via `sizes="100vw"`

**Title:** `line-clamp-2` (max 2 lines)

**Description:** `line-clamp-2` (max 2 lines)

**Pricing Display:**
- All modes use `formatPrice()` helper
- Rendered with `font-medium text-foreground`

**Date Display:**
- `formatDate(start_date)` + "–" + `formatDate(end_date)`
- If no dates: "Ongoing — flexible start"
- Month + year only (not full ISO date)

**Capacity Display:**
- Only shown if `max_spots && spots_booked / max_spots >= 0.5`
- Text: `"{max_spots - spots_booked} spots remaining"`
- Displays in `text-xs text-muted-foreground`

**Registration Button:**
- Text: "Register" (normal) or "Join Waitlist" (if sold out)
- Style: `variant={isSoldOut ? 'outline' : 'default'}`
- Full width: `w-full`
- External link: `target="_blank" rel="noopener noreferrer"`
- Shows `ExternalLink` icon

### Classes Tab

**Rendered at:** Line 854–916

**Visibility:** Only shows if practitioner is tiered AND has classes

**Layout:**
```
Space: space-y-4

┌────────────────────────────────────┐
│ [Day badge] "Monday"               │
│ Title (small)                      │
│ Time | Duration | Location (xs)    │
│ Pricing (small, medium weight)     │
│ [X spots remaining] (if 50%+ full) │
│ [Register] button (right-aligned)  │
└────────────────────────────────────┘
```

**No Image** — classes are text-only cards

**Title:** `font-semibold text-sm`

**Day of Week:** Badge showing full day name (e.g., "Monday")

**Meta (time/duration/location):** Comma-separated, `text-xs text-muted-foreground`

**Time Display:** Uses `formatTime()` helper → "HH:MM AM/PM"

**Duration:** "60 min" format (from `duration_minutes`)

**Pricing:** `formatPrice()` result with `text-sm font-medium`

**Registration Button:**
- Size: `sm`
- Right-aligned in flex layout (via `mt-2 sm:mt-0` margin)
- External link

---

## Center Events UI (not yet in public display)

**Dashboard:** `src/pages/dashboard/DashboardCenterEvents.tsx`

**Note:** This component is the edit interface only. **Public display of center events is NOT YET IMPLEMENTED** in the codebase (no `CenterDetail.tsx` rendering them).

**Form Fields:**
- Title (text, required)
- Description (textarea)
- Event Date (date input)
- Start Time (time input)
- End Time (time input)
- Price Mode (select)
- Price fields
- Image URL (text, or upload via file button)
- Location (text, optional override)
- Registration URL (text)
- Max Attendees (integer, optional)
- Is Recurring (toggle)
- Recurrence Rule (text, e.g., "weekly", "every tue/thu")
- Status (draft/published)

---

## Pricing Modes — How They Work

All three models support the same `price_mode` enum:

| Mode | Fields Used | Display | Use Case |
|------|------------|---------|----------|
| `fixed` | `price_fixed` | "$X" | Fixed price (retreat costs $500) |
| `range` | `price_min`, `price_max` | "$X–$Y" | Tiered pricing (early bird vs regular) |
| `sliding` | `price_min`, `price_max` | "$X–$Y" | Pay-what-you-can scale |
| `contact` | (none) | "Contact for pricing" | Custom pricing per client |
| `free` | (none) | "Free" | No cost |

**Implementation:**
```typescript
function formatPrice(mode: string | undefined, fixed: number | null, min: number | null, max: number | null): string {
  if (!mode) return '';
  if (mode === 'free') return 'Free';
  if (mode === 'contact') return 'Contact for pricing';
  if (mode === 'fixed' && fixed !== null) return `$${fixed}`;
  if ((mode === 'range' || mode === 'sliding') && min !== null && max !== null) return `$${min}–$${max}`;
  return '';
}
```

---

## Registration Flow

**What the "Register" button does:**
1. `registration_url` is stored in DB (e.g., Eventbrite link, Calendly, custom booking page)
2. Button is an anchor tag: `<a href={registration_url} target="_blank" rel="noopener noreferrer">`
3. Clicking opens external site in new tab
4. **No tracking or integration** — Hawaii Wellness app doesn't handle registration internally

**Capacity Tracking:**
- `spots_booked` and `max_spots` are stored but **not auto-managed**
- No webhook from external booking systems
- Providers manually update `spots_booked` in dashboard (or via admin)
- Display logic: if `spots_booked / max_spots >= 0.5`, show "X spots remaining"
- If `spots_booked >= max_spots`: button shows "Join Waitlist" instead of "Register"

---

## Tier Gating

Both offerings and classes are **Premium-only features**:

```typescript
const isPremium = practitioner?.tier === 'premium' || practitioner?.tier === 'featured';

if (!isPremium) {
  // Show lock message
  return <Card className="border-amber-200 bg-amber-50">
    <Lock icon /> Premium Feature...
  </Card>;
}
```

Display in public profile is **also tier-gated**:

```typescript
const showOfferingsTab = isTiered && (offerings?.length ?? 0) > 0;
const showClassesTab = isTiered && (classes?.length ?? 0) > 0;
```

Only featured/premium practitioners can show these tabs.

---

## Image Handling

### Offerings Image

- Stored at: `practitioner-images/offerings/{timestamp}-{random}.{ext}`
- Max size: 5MB
- Supported: JPG, PNG, WebP, GIF
- Display: 600×192px (landscape aspect)
- Lazy-loaded via `OptimizedImage` component
- Uses Supabase public bucket URL

### Center Events Image

- Same bucket: `practitioner-images` (shared storage)
- Max size: TBD (no explicit limit in code)
- Display: Full-width within card (height varies)

### Classes

- No image field in schema or UI

---

## Sorting & Ordering

### Offerings & Classes
- Both use `sort_order` integer (default 0)
- Sorted ascending: `order('sort_order', { ascending: true })`
- Then by creation date (descending): `order('created_at', { ascending: false })`
- Providers can manually reorder via drag-drop in future (not implemented yet)

### Center Events
- Sorted by `event_date` (ascending, nulls last)
- Then by `sort_order`
- Public fetch limited to 12 results

---

## Teaser / "See All" Links

In the public profile "About" tab (before opening dedicated offering/class tabs), there's a teaser section:

```
[First 3 classes] ... [View all classes →]
[First 2 offerings] ... [View all offerings →]
```

Clicking teaser opens the respective tab.

---

## Status Publish Workflow

Both offerings and classes have a `status` field:

- `draft` — only visible to owner in dashboard
- `published` — visible to public

RLS policies enforce:
```sql
-- Public can only see published
WHERE status = 'published'

-- Owners can see all
WHERE practitioner_id IN (SELECT id FROM practitioners WHERE owner_id = auth.uid())
```

Center events follow same pattern.

---

## Gaps & Notes for Redesign

1. **Spots Booked:** Currently static — no auto-increment on registration. Providers must manually update.
2. **Image Sizes:** Offerings fixed to 600×192px; classes have no image.
3. **Dates:** Offerings use ISO date range; center events use single date + recurrence text (not sophisticated).
4. **Time:** Stored as Postgres `time` (wall-clock); no timezone handling.
5. **Recurring:** Center events support `is_recurring` flag + text rule; no sophisticated RRULEs.
6. **Teaser Cards:** Currently show first N results; no filtering by date (e.g., "upcoming only").
7. **Registration:** No internal tracking or integrations — just external URLs.
8. **Pricing:** All modes treated equally in display; no special formatting for sliding scale.
9. **Testimonials:** Schema exists for linking testimonials to offerings/classes/events, but UI never uses it.
10. **Center Events in Public:** No `CenterDetail.tsx` implementation — only admin dashboard exists.

---

## Files to Review for Redesign

**Schema & Types:**
- `/supabase/migrations/20260317000001_offerings_classes_testimonials.sql`
- `/supabase/migrations/20260317000002_centers_sprint1.sql`
- `/src/types/database.ts` (OfferingRow, ClassRow, PriceMode, etc.)

**Dashboard UI:**
- `/src/pages/dashboard/DashboardOfferings.tsx`
- `/src/pages/dashboard/DashboardClasses.tsx`
- `/src/pages/dashboard/DashboardCenterEvents.tsx`

**Hooks:**
- `/src/hooks/useMyOfferings.ts`
- `/src/hooks/useMyClasses.ts`
- `/src/hooks/useCenterEvents.ts`
- `/src/hooks/usePractitionerOfferings.ts`
- `/src/hooks/usePractitionerClasses.ts`

**Public Display:**
- `/src/pages/ProfileDetail.tsx` (lines 854–996)
- Helper functions: `formatPrice()`, `formatTime()`, `formatDate()`, `dayToLabel()`

**Styling & Utils:**
- `shadcn/ui` components: Card, Button, Badge, Dialog, Select, Input, Textarea
- Tailwind classes: `line-clamp-2`, `grid-cols-1`, `gap-4`, `overflow-hidden`
