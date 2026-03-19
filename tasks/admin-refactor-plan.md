# Admin Panel Data Model Refactor Plan

## Executive Summary

The admin panel and provider dashboard maintain **parallel, incompatible data models** for the same features. This causes data integrity issues and prevents a single source of truth.

**Critical mismatches identified:**

1. **Testimonials**: Admin edits as inline JSONB array on `practitioners`/`centers` rows. Provider edits via separate `practitioner_testimonials` table. ProfileDetail.tsx reads from BOTH.
2. **Offerings & Classes**: Provider uses separate tables (`offerings`, `practitioner_classes`). Admin has no UI for these features at all.
3. **Social links & working hours**: Admin edits as inline JSONB on `practitioners`/`centers` rows. Provider has no UI to edit these.
4. **Tier management**: Admin uses `useSetListingTier` mutation. Provider uses Stripe checkout. Both update `user_profiles.tier` but at different times.

**This refactor consolidates data writes into the correct tables so both admin and provider read/write to the same source of truth.**

---

## Current State Analysis

### Feature 1: Testimonials

| Aspect | Admin | Provider |
|--------|-------|----------|
| **Edit location** | AdminPanel.tsx, inline JSONB form | DashboardTestimonials.tsx |
| **Database write** | `practitioners.testimonials` (JSONB array) | `practitioner_testimonials` table (separate rows) |
| **Database read** | `practitioners.testimonials` JSONB | `practitioner_testimonials` table |
| **Data type** | `{ author, text, date }` array | `PractitionerTestimonialRow` with author, text, author_location, testimonial_date, status, linked_type, linked_id, sort_order |
| **Mutation** | `useUpdatePractitioner` (upsert JSONB field) | ❌ **No hook exists yet** (marked TODO in code) |
| **Read source** | Both sources are read separately | Only table is read |

**Issue**: DashboardProfile.tsx reads `practitioner.testimonials` from row. If provider creates a testimonial via `practitioner_testimonials` table (once the hook exists), admin won't see it in the JSONB field. Data is duplicated and diverging.

### Feature 2: Offerings

| Aspect | Admin | Provider |
|--------|-------|----------|
| **Database** | No edit UI at all | `offerings` table (separate rows) |
| **Mutation** | None | ❌ **No hook exists yet** (marked TODO in code) |
| **Read source** | Not displayed in admin | `offerings` table |

**Issue**: Admin cannot manage offerings. Provider can create them (once hook exists), but admin has no way to moderate or override.

### Feature 3: Classes (Recurring Sessions)

| Aspect | Admin | Provider |
|--------|-------|----------|
| **Database** | No edit UI at all | `practitioner_classes` table (separate rows) |
| **Mutation** | None | ❌ **No hook exists yet** (marked TODO in code) |
| **Read source** | Not displayed in admin | `practitioner_classes` table |

**Issue**: Same as offerings — admin cannot manage. Provider needs hook to persist.

### Feature 4: Social Links

| Aspect | Admin | Provider |
|--------|-------|----------|
| **Edit location** | AdminPanel.tsx, inline JSONB form (lines 1486–1500, 2541–2555) | ❌ No UI at all |
| **Database write** | `practitioners.social_links` (JSONB) | Not editable by provider |
| **Data type** | `{ instagram?, facebook?, linkedin?, x?, substack? }` | Same structure |
| **Mutation** | `useUpdatePractitioner` | None |

**Issue**: Only admin can edit social links. Provider has no way to add their social profiles.

### Feature 5: Working Hours

| Aspect | Admin | Provider |
|--------|-------|----------|
| **Edit location** | AdminPanel.tsx, inline JSONB form (lines 1502–1537, 2557–2592) | ❌ No UI at all |
| **Database write** | `practitioners.working_hours` (JSONB) | Not editable by provider |
| **Data type** | `{ mon?: {open, close}, tue?: ..., ... }` | Same structure |
| **Mutation** | `useUpdatePractitioner` | None |

**Issue**: Same as social links — only admin can edit.

### Feature 6: Tier Management

| Aspect | Admin | Provider |
|--------|-------|----------|
| **Entry point** | AdminPanel.tsx edit dialog, Tier Select dropdown | DashboardBilling.tsx, Stripe checkout |
| **Mutation** | `useSetListingTier` (lines 723–789 in useAdmin.ts) | Stripe webhook → `syncTierToListings` edge function |
| **Side effects** | Updates listing.tier + user_profiles.tier + featured_slots | Updates listing.tier + user_profiles.tier + featured_slots (via webhook) |
| **Consistency** | Manual, immediate | Async via webhook (eventual consistency) |

**Issue**: Two different code paths can update the same data. Admin changes are immediate; Stripe webhook updates are async. No ordering guarantees.

---

## Shared Data Model (Single Source of Truth)

Based on database.ts and actual usage:

### Testimonials (CORRECT: practitioner_testimonials table)
```
✓ practitioner_testimonials (separate rows, not JSONB)
  - id
  - practitioner_id
  - author, text, author_location, testimonial_date
  - status (draft | published)
  - linked_type, linked_id (optional — for linking to offerings/classes)
  - sort_order, created_at, updated_at
```
**Decision**: Admin should write to the table, NOT the JSONB field. JSONB field `practitioners.testimonials` should be **deprecated and removed** in a future migration.

### Offerings (CORRECT: offerings table)
```
✓ offerings (separate rows)
  - id, practitioner_id
  - title, description, offering_type
  - price_mode, price_fixed, price_min, price_max
  - image_url, start_date, end_date, location, registration_url, max_spots
  - status (draft | published)
  - sort_order, created_at, updated_at
```
**Decision**: Both admin and provider write to this table. Admin gets a UI to list, edit, and moderate. Provider hook needs implementation.

### Classes (CORRECT: practitioner_classes table)
```
✓ practitioner_classes (separate rows)
  - id, practitioner_id
  - title, description, day_of_week, start_time, duration_minutes
  - price_mode, price_fixed, price_min, price_max
  - location, registration_url, max_spots
  - status (draft | published)
  - sort_order, created_at, updated_at
```
**Decision**: Same as offerings. Both admin and provider write to this table.

### Social Links (CORRECT: practitioners.social_links JSONB, but provider needs UI)
```
✓ practitioners.social_links (inline JSONB on row)
  - { instagram?, facebook?, linkedin?, x?, substack? }
```
**Decision**: Keep JSONB. Admin already has UI. Provider needs a new settings panel to edit.

### Working Hours (CORRECT: practitioners.working_hours JSONB, but provider needs UI)
```
✓ practitioners.working_hours (inline JSONB on row)
  - { mon?: {open, close}, tue?: ..., ... }
```
**Decision**: Keep JSONB. Admin already has UI. Provider needs a new settings panel to edit.

---

## Phased Refactor Plan

### Phase 1: Critical Data Integrity (Testimonials)

**Goal**: Migrate admin to use `practitioner_testimonials` table instead of JSONB field.

#### 1.1 Create admin mutations for testimonials

**File**: `src/hooks/useAdmin.ts`

**Changes**:
- Add `useInsertTestimonial({ practitioner_id, ...data })`
- Add `useUpdateTestimonial({ id, ...data })`
- Add `useDeleteTestimonial(id)`
- Add `useAllPractitionerTestimonials(practitioner_id)` query

**Complexity**: Small | **Risk**: Low
- These are straightforward CRUD operations on a simple table
- No side effects (no featured_slots, no user_profiles updates)

#### 1.2 Update AdminPanel.tsx to use new hooks

**File**: `src/pages/admin/AdminPanel.tsx`

**Changes**:
- Remove testimonials array from `editPractitionerForm` and `editCenterForm` state (lines 263, 319)
- Remove all testimonial JSONB editing code (lines 1554–1597, 2609–2650)
- Replace with calls to `useAllPractitionerTestimonials(practitioner_id)` when editing a practitioner
- Display testimonials as a read-only list with modal dialogs to add/edit/delete
- Link each testimonial dialog to the new hooks from step 1.1

**Complexity**: Medium | **Risk**: Low
- Large component, but testimonials section is isolated
- No change to database writes, just swapping mutation calls

#### 1.3 Provide hook for provider: `useSaveTestimonial`

**File**: `src/hooks/useMyPractitioner.ts` or new `useTestimonials.ts`

**Changes**:
- Add `useMyTestimonials(practitioner_id)` — fetch all testimonials for the logged-in user's practitioner
- Add `useSaveTestimonial(practitioner_id, payload)` — insert or update a single testimonial
- Add `useDeleteTestimonial(id)` — delete a testimonial

**Complexity**: Small | **Risk**: Low
- Provider hook pattern is well-established (mimic `useMyPractitioner`)

#### 1.4 Update DashboardTestimonials.tsx to use new hooks

**File**: `src/pages/dashboard/DashboardTestimonials.tsx`

**Changes**:
- Replace manual `useState([])` with `useMyTestimonials()` call
- Replace TODO comments with actual hook calls in `handleSave` and `handleDelete`
- Persist to database when user saves/deletes

**Complexity**: Small | **Risk**: Low
- Component structure is already correct, just needs hooks wired up

#### 1.5 Deprecate JSONB testimonials field

**File**: Database migration + types

**Changes**:
- Mark `practitioners.testimonials` as deprecated in code comments
- Add a migration to set `practitioners.testimonials = '[]'` for all rows (don't drop column yet in case rollback needed)
- Remove from PractitionerFormData types in DashboardProfile.tsx (provider dashboard doesn't touch it)
- Keep in PractitionerRow type for backward compat, but document it's unused

**Complexity**: Small | **Risk**: Medium
- Need to write a migration to clear the field safely
- Must not break existing admin reads until phase complete

**Verification**: Run test admin panel, verify testimonials are read/written to table only, not JSONB

---

### Phase 2: Premium Features (Offerings & Classes)

**Goal**: Add admin UI for offerings and classes. Provide provider hooks.

#### 2.1 Create admin mutations for offerings

**File**: `src/hooks/useAdmin.ts`

**Changes**:
- Add `useAllOfferingsByPractitioner(practitioner_id)` query
- Add `useInsertOffering(payload: OfferingInsert)`
- Add `useUpdateOffering(id, payload)`
- Add `useDeleteOffering(id)`

**Complexity**: Small | **Risk**: Low
- Straightforward CRUD on `offerings` table
- Types already exist in database.ts

#### 2.2 Create admin mutations for classes

**File**: `src/hooks/useAdmin.ts`

**Changes**:
- Add `useAllClassesByPractitioner(practitioner_id)` query
- Add `useInsertClass(payload: ClassInsert)`
- Add `useUpdateClass(id, payload)`
- Add `useDeleteClass(id)`

**Complexity**: Small | **Risk**: Low
- Straightforward CRUD on `practitioner_classes` table
- Types already exist in database.ts

#### 2.3 Add admin UI for offerings

**File**: `src/pages/admin/AdminPanel.tsx`

**Changes**:
- Add new tab **"Offerings"** alongside "Practitioners", "Centers", "Flags", etc.
- Implement list/search/filter UI similar to practitioners tab
- Add edit dialog with form fields for all OfferingRow columns
- Use hooks from 2.1
- Link "View offerings" action from practitioner/center edit dialog

**Complexity**: Large | **Risk**: Medium
- New tab requires significant UI code (~300–500 lines)
- No precedent in admin panel, must design from scratch
- Premium-tier feature — show lock icon if provider not premium

#### 2.4 Add admin UI for classes

**File**: `src/pages/admin/AdminPanel.tsx`

**Changes**:
- Add new tab **"Classes"** alongside others
- Implement list/search/filter UI
- Add edit dialog with all ClassRow fields
- Use hooks from 2.2
- Link "View classes" action from practitioner edit dialog

**Complexity**: Large | **Risk**: Medium
- Similar to offerings UI, but day_of_week + start_time fields instead of date range
- Premium-tier feature

#### 2.5 Provide provider hooks for offerings

**File**: `src/hooks/useMyPractitioner.ts` or new `useOfferings.ts`

**Changes**:
- Add `useMyOfferings()` — fetch all offerings for logged-in provider
- Add `useSaveOffering(payload)` — insert or update
- Add `useDeleteOffering(id)` — delete

**Complexity**: Small | **Risk**: Low
- Provider hook pattern established

#### 2.6 Provide provider hooks for classes

**File**: `src/hooks/useMyPractitioner.ts` or new `useClasses.ts`

**Changes**:
- Add `useMyClasses()` — fetch all classes for logged-in provider
- Add `useSaveClass(payload)` — insert or update
- Add `useDeleteClass(id)` — delete

**Complexity**: Small | **Risk**: Low

#### 2.7 Complete DashboardOfferings.tsx

**File**: `src/pages/dashboard/DashboardOfferings.tsx`

**Changes**:
- Replace TODO comments with actual hook calls
- Wire `useMyOfferings()` to load list on mount
- Wire `useSaveOffering()` to persist when user clicks save
- Wire `useDeleteOffering()` for delete confirmation

**Complexity**: Small | **Risk**: Low
- UI structure already correct, just needs hooks

#### 2.8 Complete DashboardClasses.tsx

**File**: `src/pages/dashboard/DashboardClasses.tsx`

**Changes**:
- Same as 2.7, but for classes

**Complexity**: Small | **Risk**: Low

**Verification**: Admin creates offering for a practitioner. Provider logs in and sees it in their dashboard. Provider edits it; admin sees the change. Delete flow works both ways.

---

### Phase 3: Provider Settings (Social Links & Working Hours)

**Goal**: Give providers UI to edit social links and working hours. Keep admin UI unchanged.

#### 3.1 Create provider hooks for social links & working hours

**File**: `src/hooks/useMyPractitioner.ts`

**Changes**:
- Add fields to `PractitionerFormData`:
  - `social_links: { instagram?, facebook?, linkedin?, x?, substack? }`
  - `working_hours: { mon?: {open, close}, tue?: ..., ... }`
- Extend `useSavePractitioner()` to handle these fields
  - Merge with existing payload so provider can update them without resetting other fields

**Complexity**: Small | **Risk**: Low
- Just add two more JSONB fields to the save mutation
- Fields already exist in database; no migration needed

#### 3.2 Create new Settings page: DashboardSettings.tsx (or add to DashboardProfile.tsx)

**File**: `src/pages/dashboard/DashboardSettings.tsx` or extend `DashboardProfile.tsx`

**Changes**:
- Add section: **"Social Links"** with text inputs for Instagram, Facebook, LinkedIn, X, Substack
- Add section: **"Working Hours"** with time pickers for each day of week
- Wire to `useSavePractitioner()` (modified to include these fields)
- Show "Saved!" toast on success

**Complexity**: Medium | **Risk**: Low
- Working hours picker is the most complex part (7 days × 2 time inputs)
- Can reuse the admin's working hours picker UI pattern as reference

#### 3.3 Update DashboardProfile.tsx to show read-only social links & hours

**File**: `src/pages/dashboard/DashboardProfile.tsx`

**Changes**:
- Add read-only display of social links and working hours (with link to settings page)
- Or move these fields into the DashboardSettings page entirely

**Complexity**: Small | **Risk**: Low

**Verification**: Provider adds Instagram profile. Admin views practitioner, sees it in social_links JSONB. Both read from same source.

---

### Phase 4: Tier Management Consistency

**Goal**: Ensure admin and Stripe webhook write tier through the same code path.

#### 4.1 Consolidate tier write path

**File**: `supabase/functions/stripe-webhook/index.ts` and `src/hooks/useAdmin.ts`

**Changes**:
- Extract tier-sync logic into a shared Supabase RPC or edge function
- `useSetListingTier` calls the RPC instead of doing inline updates
- Stripe webhook calls the same RPC
- RPC handles atomically: update listing.tier, user_profiles.tier, featured_slots, audit log

**Complexity**: Medium | **Risk**: Medium
- Requires coordination between webhook and client mutations
- Need to ensure atomicity (all-or-nothing updates)
- Must handle edge case: featured slot limit (5 per island) — RPC should throw if inserting 6th

#### 4.2 Add audit log (optional, Phase 4b)

**File**: New `tier_changes` table + RPC

**Changes**:
- Record every tier change: who changed it, from what to what, when, and why (admin override vs. Stripe)
- Helps debug future disputes

**Complexity**: Small | **Risk**: Low
- Optional enhancement; can add later

**Verification**: Admin changes tier to featured; featured_slots entry created. Stripe webhook downgrades same listing; featured_slots entry deleted. Verify both paths succeeded.

---

## Rollout Strategy

### Pre-Phase 1 Checklist
- [ ] Write migration to clear JSONB testimonials field (don't drop column yet)
- [ ] Create backup query to read testimonials from both sources during transition (for verification)
- [ ] Verify database constraints on practitioner_testimonials (FK to practitioners.id exists)

### Phase 1 Gates
- [ ] All testimonials CRUD hooks added and unit-tested
- [ ] AdminPanel.tsx refactored to use hooks; no more JSONB testimonial edits
- [ ] DashboardTestimonials.tsx wired to hooks
- [ ] Manual test: admin creates testimonial → appears in table; provider creates testimonial → appears in admin view

### Phase 2 Gates
- [ ] Offerings/Classes hooks added
- [ ] Admin UI for both features complete and tested
- [ ] Provider hooks and dashboard pages wired
- [ ] Manual test: full create/edit/delete workflow for both admin and provider

### Phase 3 Gates
- [ ] Provider settings page UI complete
- [ ] useSavePractitioner extended to handle social_links and working_hours
- [ ] Manual test: provider edits social profiles → admin sees them in edit dialog

### Phase 4 Gates
- [ ] Tier sync logic consolidated into RPC/edge function
- [ ] Stripe webhook updated to call shared RPC
- [ ] useSetListingTier updated to call shared RPC
- [ ] Manual test: admin and webhook both set tiers; verify atomicity and featured_slots constraints

---

## File Impact Summary

### Hooks (useAdmin.ts, useMyPractitioner.ts)
- Add ~15 new hooks total (testimonials, offerings, classes CRUD + tier consolidation)
- Modify 1 existing hook (useSavePractitioner)

### Admin Panel (AdminPanel.tsx)
- Remove ~150 lines of testimonials JSONB editing code
- Add 3 new tabs for offerings, classes, and testimonials UI (~1000–1500 lines total, but spread across separate components)
- No changes to social links or working hours editing (already works)

### Provider Dashboard
- Complete 4 partially-stubbed pages (DashboardTestimonials, DashboardOfferings, DashboardClasses, DashboardSettings)
- Update DashboardProfile.tsx to optionally show read-only social links and working hours

### Database
- 1 migration: clear practitioners.testimonials field (mark as deprecated)
- No new tables needed — all features use existing tables

### Types (database.ts)
- Add deprecation comment on `practitioners.testimonials`
- No structural changes

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Data loss during migration** | Use backward-compat query to read both JSONB and table during phase 1. Verify counts match before deleting JSONB. |
| **Double-writes during transition** | Only fully migrate one section at a time (testimonials first, then offerings/classes). Don't run phases in parallel. |
| **Tier sync race conditions** | Consolidate into single RPC with transaction semantics. Test with concurrent admin + webhook writes. |
| **Admin panel regression** | Large component; test thoroughly. Consider extracting offerings/classes tabs into separate components. |
| **Provider confusion** | Add in-app tooltips: "Testimonials are now managed in the Testimonials tab" if provider visits old location. |

---

## Estimated Effort

| Phase | Hooks | Admin UI | Provider UI | Database | Testing | Total |
|-------|-------|----------|-------------|----------|---------|-------|
| 1 (Testimonials) | 1d | 1d | 1d | 0.5d | 1d | 4.5d |
| 2 (Offerings/Classes) | 1d | 3d | 1d | 0.5d | 1.5d | 7d |
| 3 (Settings) | 0.5d | 2d | 0.5d | 0 | 1d | 4d |
| 4 (Tier) | 0.5d | 0.5d | 0 | 0.5d | 1d | 2.5d |
| **Total** | | | | | | **18 days** |

(Assumes senior engineer; includes testing and code review.)

---

## Success Criteria

1. **Single source of truth**: All features read/write to normalized tables (not JSONB), except social_links and working_hours which remain JSONB but are now provider-editable.
2. **Data consistency**: Admin and provider edits produce identical results in the database.
3. **No regression**: All existing admin functionality (publish, delete, batch operations, tier management) continues to work.
4. **Provider empowerment**: Providers can now manage testimonials, offerings, classes, social links, and working hours independently.
5. **Audit trail**: (Optional Phase 4b) All tier changes are logged for debugging and compliance.
6. **Zero downtime**: Deploy feature flags can gate new UI if needed to roll out gradually.

---

## Next Steps

1. Review this plan with the team
2. Prioritize phases (testimonials likely first since admin already has UI)
3. Create Jira tasks for each phase
4. Start Phase 1 with migration safety-check (backup query for dual-read verification)
