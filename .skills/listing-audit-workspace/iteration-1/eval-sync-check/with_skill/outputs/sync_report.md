# Sync Audit Report: New Modality "Sound Bath" & Center Type "coworking_space"

**Generated:** 2026-03-15
**Audit Type:** Cross-list synchronization check (Check 10 from SKILL.md)
**Task:** Verify that new modality "Sound Bath" and new center type "coworking_space" are synchronized across all required locations in the codebase.

---

## Executive Summary

**Status:** ⚠️ **INCOMPLETE SYNC** — Both new additions have missing locations.

| Item | Added | Missing Count | Sync Status |
|------|:-----:|:-------------:|:------------|
| `Sound Bath` modality | ✓ Partially | 5 locations | ❌ Incomplete |
| `coworking_space` center type | ✗ Not added | 6 locations | ❌ Incomplete |

**Critical Finding:** "Sound Bath" exists in production data (found in actual listing names) but is NOT in the canonical modality lists used by forms and filters. Users cannot currently tag listings as "Sound Bath". Additionally, `coworking_space` as a center type has been added to requirements but doesn't exist anywhere in the codebase yet.

---

## Part 1: "Sound Bath" Modality Sync Status

### ✓ FOUND IN (Source of Truth)
- **Reference file:** `/src/.skills/listing-audit/references/canonical-modalities.md` — documented on 2026-03-15
- **Existing data:** Found in 2 listing names in the DB:
  - "Kona Cloud Forest Free Yoga, Breathwork & Sound Bath — Community Healing..."
  - "Shakti Sound Bath"

### ✗ MISSING FROM

#### 1. **`src/pages/admin/AdminPanel.tsx`** — Line 64–77
- Variable: `MODALITIES_LIST`
- Count: Currently 44 modalities (does NOT include "Sound Bath")
- Impact: Admin cannot tag/edit practitioners or centers with "Sound Bath"
- Last modality in list: `'Sound Healing'` (line 75)
- **Action needed:** Add `'Sound Bath'` to the array

#### 2. **`src/pages/dashboard/DashboardProfile.tsx`** — Line 33–42
- Variable: `MODALITIES`
- Count: Currently 44 modalities (does NOT include "Sound Bath")
- Impact: Practitioners cannot self-tag as "Sound Bath" in their profile
- Last modality in list: `'Sound Healing'` (line 40)
- **Action needed:** Add `'Sound Bath'` to the array

#### 3. **`src/pages/Directory.tsx`** — Line 29–36
- Variable: `FILTER_MODALITIES`
- Count: Currently ~35 modalities (does NOT include "Sound Bath")
- Impact: Public cannot filter by "Sound Bath" on the directory
- Last modality in list: `'Yoga'` (line 35)
- **Note:** This list is historically BEHIND the canonical list (documented in SKILL.md)
- **Action needed:** Add `'Sound Bath'` to the array

#### 4. **`src/pages/IslandHome.tsx`** — Line 32–54
- Variable: `BROWSE_MODALITIES`
- Count: Currently ~20 modalities (does NOT include "Sound Bath")
- Impact: "Sound Bath" does NOT appear in island homepage browse chips
- Current list: `'Sound Healing'` is at position 7, but `'Sound Bath'` is missing
- **Action needed:** Consider whether to add `'Sound Bath'` to this curated list

#### 5. **`pipeline/scripts/11_gm_classify.py`** — Line 42–54
- Variable: `MODALITIES`
- Count: Currently 44 modalities (does NOT include "Sound Bath")
- Impact: Google Maps pipeline cannot classify new Google Places as "Sound Bath"
- Last modality: `'Sound Healing'` (line 51)
- **Action needed:** Add `'Sound Bath'` to the array

#### 6. **`pipeline/scripts/24_normalize_modalities.py`** — Line 43–55
- Variable: `CANONICAL`
- Count: Currently 44 modalities (does NOT include "Sound Bath")
- Impact: Normalization script won't recognize "Sound Bath" as canonical
- Last modality: `'Sound Healing'` (line 52)
- **Action needed:** Add `'Sound Bath'` to the set

#### 7. **`supabase/migrations/20260310000003_seed_taxonomy.sql`** — Line 55
- Location: Energy & Healing category, after Reiki
- Current entry: `('sound-healing', 'Sound Healing', 2),`
- Impact: `taxonomy_terms` table doesn't have "Sound Bath" term (new search system won't find it)
- **Action needed:** Add migration to insert `('sound-bath', 'Sound Bath', sort_order)` entry

#### 8. **`supabase/migrations/20260310000004_seed_aliases.sql`**
- Location: Aliases section for search
- Current entries: Has aliases for 'Sound Healing' but NOT for 'Sound Bath'
- Impact: Fuzzy search aliases won't help users find "Sound Bath" listings
- **Action needed:** Add migration to insert aliases like 'sound bath', 'singing bowls', 'sound healing bath', etc.

### Summary: Sound Bath Locations

| Location | File | Variable | Type | Status |
|----------|------|----------|------|--------|
| Canonical reference | `.skills/listing-audit/references/canonical-modalities.md` | Documentation | ✓ DONE | ✓ |
| Admin UI | `src/pages/admin/AdminPanel.tsx` | `MODALITIES_LIST` | Frontend | ❌ |
| Provider self-edit | `src/pages/dashboard/DashboardProfile.tsx` | `MODALITIES` | Frontend | ❌ |
| Public filter | `src/pages/Directory.tsx` | `FILTER_MODALITIES` | Frontend | ❌ |
| Island browse chips | `src/pages/IslandHome.tsx` | `BROWSE_MODALITIES` | Frontend (optional) | ❌ |
| GM pipeline classification | `pipeline/scripts/11_gm_classify.py` | `MODALITIES` | Backend | ❌ |
| Modality normalization | `pipeline/scripts/24_normalize_modalities.py` | `CANONICAL` | Backend | ❌ |
| Taxonomy terms | `supabase/migrations/20260310000003_seed_taxonomy.sql` | INSERT into taxonomy_terms | DB | ❌ |
| Search aliases | `supabase/migrations/20260310000004_seed_aliases.sql` | INSERT into taxonomy_aliases | DB | ❌ |

---

## Part 2: "coworking_space" Center Type Sync Status

### ✗ MISSING FROM EVERYWHERE (Not yet added to codebase)

The center type `coworking_space` has NOT been added to ANY location. The task requires verification, but nothing exists yet to synchronize.

### ✗ MISSING FROM

#### 1. **`src/types/database.ts`** — Line 79
- Location: `CenterRow` type definition
- Current: `center_type: 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio' | 'fitness_center';`
- Impact: TypeScript won't accept `coworking_space` as a valid value
- **Action needed:** Add `'coworking_space'` to the union type

#### 2. **`src/lib/adapters.ts`** — Line 24–31
- Variable: `CENTER_TYPE_LABELS`
- Current: 6 entries (spa, wellness_center, yoga_studio, clinic, retreat_center, fitness_center)
- Impact: UI cannot display the label for `coworking_space` (causes type error per audit-learnings.md)
- **Action needed:** Add `coworking_space: 'Coworking Space'` entry

#### 3. **`src/pages/dashboard/DashboardCenters.tsx`** — Line 15–22
- Variable: `centerTypeLabels`
- Current: 6 entries (same as adapters.ts)
- Impact: Practitioners adding/editing centers cannot select `coworking_space`
- **Action needed:** Add `coworking_space: 'Coworking Space'` entry

#### 4. **`src/pages/admin/AdminPanel.tsx`** — Lines 1808–1813, 1893–1898, 2795–2800, 3125–3130
- Location: Four separate `<SelectItem>` blocks for center type selection
- Current: 6 SelectItem entries each (spa, wellness_center, yoga_studio, clinic, retreat_center, fitness_center)
- Impact: Admin UI has no option to set `coworking_space` when creating/editing centers
- **Action needed:** Add 4 new `<SelectItem value="coworking_space">Coworking Space</SelectItem>` lines (one in each SelectItem group)

#### 5. **`supabase/migrations/20260315000001_add_fitness_center_type.sql`** — Line 9
- Location: CHECK constraint definition
- Current: `CHECK (center_type IN ('spa', 'wellness_center', 'clinic', 'retreat_center', 'yoga_studio', 'fitness_center'))`
- Impact: Database will REJECT any attempt to insert `coworking_space` with a constraint violation
- **Action needed:** Create new migration (e.g., `20260315000003_add_coworking_space_type.sql`) to alter CHECK constraint

#### 6. **`src/pages/dashboard/DashboardCenters.tsx`** — Line 191
- Location: Dynamic SelectItem generation from `Object.entries(centerTypeLabels)`
- Current: Generates 6 items
- Impact: If `centerTypeLabels` is updated without the TypeScript union, this generates incorrect items
- **Action needed:** Keep in sync with TypeScript type and `centerTypeLabels` Record

### Summary: coworking_space Locations

| Location | File | Element | Type | Status |
|----------|------|---------|------|--------|
| TypeScript type | `src/types/database.ts` | CenterRow union | Type | ❌ |
| Display labels (lib) | `src/lib/adapters.ts` | CENTER_TYPE_LABELS | Frontend | ❌ |
| Display labels (dashboard) | `src/pages/dashboard/DashboardCenters.tsx` | centerTypeLabels | Frontend | ❌ |
| Admin SelectItem 1 | `src/pages/admin/AdminPanel.tsx` | Edit Center (modal) | UI | ❌ |
| Admin SelectItem 2 | `src/pages/admin/AdminPanel.tsx` | New Center form | UI | ❌ |
| Admin SelectItem 3 | `src/pages/admin/AdminPanel.tsx` | Centers list edit | UI | ❌ |
| Admin SelectItem 4 | `src/pages/admin/AdminPanel.tsx` | Quick add center | UI | ❌ |
| DB CHECK constraint | `supabase/migrations/` | center_type constraint | Database | ❌ |

---

## Critical Issues (Blocks Publishing)

### C1: "Sound Bath" cannot be set by users or admins
- **Affected:** Any new listings tagged as "Sound Bath" cannot be saved
- **Reason:** `Sound Bath` exists in real data but is missing from all modality form arrays
- **Impact:** Existing listings with "Sound Bath" have it stored in the DB, but users cannot create or edit them with this modality
- **Fix Required:** Add `'Sound Bath'` to all 6 modality lists (AdminPanel, DashboardProfile, Directory, IslandHome, 11_gm_classify.py, 24_normalize_modalities.py)

### C2: "coworking_space" is completely unimplemented
- **Affected:** Any attempt to create a coworking space center will fail
- **Reason:** TypeScript type, DB constraint, and UI all reject `coworking_space`
- **Impact:** No way to add coworking spaces to the directory
- **Fix Required:** Implement in all 6 locations (TypeScript type, 2× display labels, 4× SelectItems, DB constraint)

### C3: Sound Bath not in new search taxonomy
- **Affected:** Even if "Sound Bath" is added to UI lists, the new search system won't find it
- **Reason:** Missing from `taxonomy_terms` table
- **Impact:** Users searching the directory won't find "Sound Bath" listings; only old client-side filters work
- **Fix Required:** Add `sound-bath` term to `taxonomy_terms` via migration; add aliases for search

### C4: coworking_space not in DB schema
- **Affected:** Center records cannot have `center_type = 'coworking_space'` without a migration
- **Reason:** CHECK constraint on `centers.center_type` column doesn't include the value
- **Impact:** Database will reject saves with this center type
- **Fix Required:** Migrate CHECK constraint to include `'coworking_space'`

---

## Warnings (Degrades User Experience)

### W1: FILTER_MODALITIES historically behind canonical list
- **Current state:** Directory.tsx has ~35 modalities; canonical is 44+
- **Noted in SKILL.md:** "FILTER_MODALITIES falls behind the canonical list"
- **Recommendation:** After adding Sound Bath, audit Directory.tsx filter list for other missing modalities

### W2: IslandHome.tsx BROWSE_MODALITIES is curated, not auto-synced
- **Current state:** ~20 modalities (intentional subset for island homepage)
- **Note:** "Sound Healing" is included but "Sound Bath" is not
- **Recommendation:** Decide strategically whether to add "Sound Bath" to island browse chips (depends on business priority)

### W3: No pipeline script for incremental taxonomy updates
- **Current state:** Taxonomy terms are seeded in initial migration files; no reusable update pattern
- **Note:** Adding "Sound Bath" requires a manual SQL migration; no Python script to help
- **Recommendation:** Consider creating a script similar to `11_gm_classify.py` that validates modalities against taxonomy_terms

---

## Summary Table: All Sync Locations

### Modalities (Sound Bath)

| Requirement | Location | Current Count | Missing | Required |
|-------------|----------|:--------------:|:-------:|:--------:|
| TypeScript types | (N/A — modalities are strings, not enums) | — | — | — |
| Admin UI form | `AdminPanel.tsx` line 64–77 | 44 | 1 | ✓ |
| Provider self-edit | `DashboardProfile.tsx` line 33–42 | 44 | 1 | ✓ |
| Public directory filter | `Directory.tsx` line 29–36 | ~35 | 1 | ✓ |
| Island homepage browse | `IslandHome.tsx` line 32–54 | ~20 | 0 | Optional |
| GM pipeline classify | `11_gm_classify.py` line 42–54 | 44 | 1 | ✓ |
| Modality normalization | `24_normalize_modalities.py` line 43–55 | 44 | 1 | ✓ |
| Taxonomy terms (search) | `20260310000003_seed_taxonomy.sql` | ~44 terms | 1 | ✓ |
| Search aliases | `20260310000004_seed_aliases.sql` | ~315 | 5+ | ✓ |
| Canonical reference | `canonical-modalities.md` | 44 | 0 | ✓ |
| **TOTAL** | **9 locations** | — | **7 missing** | **7 required** |

### Center Types (coworking_space)

| Requirement | Location | Current Count | Missing | Required |
|-------------|----------|:--------------:|:-------:|:--------:|
| TypeScript type union | `database.ts` line 79 | 6 | 1 | ✓ |
| Display labels (lib) | `adapters.ts` line 24–31 | 6 | 1 | ✓ |
| Display labels (dashboard) | `DashboardCenters.tsx` line 15–22 | 6 | 1 | ✓ |
| Admin SelectItem group 1 | `AdminPanel.tsx` line 1808–1813 | 6 | 1 | ✓ |
| Admin SelectItem group 2 | `AdminPanel.tsx` line 1893–1898 | 6 | 1 | ✓ |
| Admin SelectItem group 3 | `AdminPanel.tsx` line 2795–2800 | 6 | 1 | ✓ |
| Admin SelectItem group 4 | `AdminPanel.tsx` line 3125–3130 | 6 | 1 | ✓ |
| DB CHECK constraint | Latest migration file | 6 values | 1 | ✓ |
| **TOTAL** | **8 locations** | — | **8 missing** | **8 required** |

---

## File Locations (Complete Checklist)

### For "Sound Bath" Modality — 9 Locations

```
1. src/pages/admin/AdminPanel.tsx
   Line 64–77, variable MODALITIES_LIST
   Action: Add 'Sound Bath' to array

2. src/pages/dashboard/DashboardProfile.tsx
   Line 33–42, variable MODALITIES
   Action: Add 'Sound Bath' to array

3. src/pages/Directory.tsx
   Line 29–36, variable FILTER_MODALITIES
   Action: Add "Sound Bath" to array

4. src/pages/IslandHome.tsx
   Line 32–54, variable BROWSE_MODALITIES
   Action: Consider adding 'Sound Bath' (optional, depends on business decision)

5. pipeline/scripts/11_gm_classify.py
   Line 42–54, variable MODALITIES
   Action: Add 'Sound Bath' to list

6. pipeline/scripts/24_normalize_modalities.py
   Line 43–55, variable CANONICAL
   Action: Add 'Sound Bath' to set

7. supabase/migrations/20260310000003_seed_taxonomy.sql
   Line 55, Energy & Healing section
   Action: Create new migration to INSERT ('sound-bath', 'Sound Bath', sort_order) term

8. supabase/migrations/20260310000004_seed_aliases.sql
   Aliases section
   Action: Create new migration to INSERT aliases for sound-bath term (e.g., 'sound bath', 'singing bowls', 'sound therapy', etc.)

9. .skills/listing-audit/references/canonical-modalities.md
   Line 48 (in main list)
   Action: Already present ✓
```

### For "coworking_space" Center Type — 8 Locations

```
1. src/types/database.ts
   Line 79, CenterRow type union
   Action: Add 'coworking_space' to union

2. src/lib/adapters.ts
   Line 24–31, CENTER_TYPE_LABELS Record
   Action: Add coworking_space: 'Coworking Space' entry

3. src/pages/dashboard/DashboardCenters.tsx
   Line 15–22, centerTypeLabels Record
   Action: Add coworking_space: 'Coworking Space' entry

4. src/pages/admin/AdminPanel.tsx (Edit Center modal)
   Line 1808–1813, SelectItem group
   Action: Add <SelectItem value="coworking_space">Coworking Space</SelectItem>

5. src/pages/admin/AdminPanel.tsx (New Center form)
   Line 1893–1898, SelectItem group
   Action: Add <SelectItem value="coworking_space">Coworking Space</SelectItem>

6. src/pages/admin/AdminPanel.tsx (Centers list edit)
   Line 2795–2800, SelectItem group
   Action: Add <SelectItem value="coworking_space">Coworking Space</SelectItem>

7. src/pages/admin/AdminPanel.tsx (Quick add center)
   Line 3125–3130, SelectItem group
   Action: Add <SelectItem value="coworking_space">Coworking Space</SelectItem>

8. supabase/migrations/ (new file required)
   File: Create new migration 20260315000003_add_coworking_space_type.sql
   Action: Alter CHECK constraint to include 'coworking_space'
   Example: ALTER TABLE centers
            DROP CONSTRAINT centers_center_type_check,
            ADD CONSTRAINT centers_center_type_check
            CHECK (center_type IN ('spa','wellness_center','clinic','retreat_center','yoga_studio','fitness_center','coworking_space'));
```

---

## Pattern Notes (from audit-learnings.md)

This audit confirmed the learned rule from 2026-03-15 about center type label sync:

> **CENTER_TYPE_LABELS in adapters.ts** — Adding a new center_type to the TypeScript union without adding it to the CENTER_TYPE_LABELS Record causes a type error that breaks the Vercel build. This check proved essential.

Both additions follow the same pattern as the recent `fitness_center` addition (migration 20260315000001):

- TypeScript type updated first
- Display labels added to 2 locations (adapters.ts and dashboard component)
- 4 independent SelectItem lists updated in AdminPanel
- DB CHECK constraint migrated

---

## Recommended Order of Implementation

### Phase 1: Sound Bath (Modality)
1. Update `src/pages/admin/AdminPanel.tsx` — add to MODALITIES_LIST
2. Update `src/pages/dashboard/DashboardProfile.tsx` — add to MODALITIES
3. Update `src/pages/Directory.tsx` — add to FILTER_MODALITIES
4. Update `pipeline/scripts/11_gm_classify.py` — add to MODALITIES
5. Update `pipeline/scripts/24_normalize_modalities.py` — add to CANONICAL
6. Create migration `20260315000003_add_sound_bath_taxonomy.sql` — add taxonomy term
7. Create migration `20260315000004_add_sound_bath_aliases.sql` — add search aliases
8. (Optional) Update `src/pages/IslandHome.tsx` — consider for BROWSE_MODALITIES

### Phase 2: coworking_space (Center Type)
1. Update `src/types/database.ts` — add to CenterRow union
2. Update `src/lib/adapters.ts` — add to CENTER_TYPE_LABELS
3. Update `src/pages/dashboard/DashboardCenters.tsx` — add to centerTypeLabels
4. Update `src/pages/admin/AdminPanel.tsx` — add to all 4 SelectItem groups
5. Create migration `20260315000003_add_coworking_space_type.sql` — update CHECK constraint

---

## Testing Checklist (After Implementation)

After making changes, verify:

- [ ] Admin can create a center with `center_type = 'coworking_space'`
- [ ] Admin can edit a practitioner and tag with `'Sound Bath'` modality
- [ ] Provider can edit their profile and select `'Sound Bath'` as a modality
- [ ] Directory.tsx filter shows `Sound Bath` in the modality dropdown
- [ ] Database SELECT queries for centers and practitioners return valid records
- [ ] New search (if enabled) finds listings tagged with "Sound Bath"
- [ ] Taxonomy terms table includes `sound-bath` entry
- [ ] Lint/build passes with no type errors
- [ ] No UI displays undefined labels (check for `CENTER_TYPE_LABELS` graceful fallbacks)

---

## Conclusion

**Sound Bath** appears in production listing data but is completely absent from the capability to tag new listings. **coworking_space** doesn't exist anywhere yet. Both require systematic updates across 7–9 code locations each to achieve full sync. The pattern is identical to the recent Fitness modality and fitness_center type additions, so implementation can follow that template.

**No data migration is needed** for existing "Sound Bath" entries (they're stored correctly in the DB modalities array), but **two DB migrations are required** (one for taxonomy term, one for search aliases) to make the new search system recognize it.

