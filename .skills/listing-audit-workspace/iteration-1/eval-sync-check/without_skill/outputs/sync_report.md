# Aloha Health Hub — Sync Audit Report
## Sound Bath Modality & Coworking Space Center Type

**Date:** 2026-03-15
**Status:** ❌ **OUT OF SYNC** — Neither Sound Bath nor coworking_space are fully integrated
**Action Required:** YES — Multiple locations need updates

---

## Summary

The codebase has recently added two new items:
1. **Modality:** "Sound Bath" (new)
2. **Center Type:** "coworking_space" (new)

**Current State:**
- ✅ "Sound Bath" exists in the codebase (but it's "Sound **Healing**", not "Sound Bath")
- ❌ "coworking_space" is **completely missing** from the codebase
- ⚠️ Inconsistent naming: "Sound Healing" vs "Sound Bath"

---

## Audit Results

### 1. Modalities — "Sound Bath" Status

#### Finding: NAMING MISMATCH
The codebase currently has **"Sound Healing"**, NOT "Sound Bath". These are different items.

**Locations where "Sound Healing" is defined:**

1. **src/pages/dashboard/DashboardProfile.tsx** (line 40)
   ```typescript
   const MODALITIES = [
     // ...
     'Sound Healing', 'TCM (Traditional Chinese Medicine)',
     // ...
   ];
   ```

2. **src/pages/admin/AdminPanel.tsx** (line 75)
   ```typescript
   const MODALITIES_LIST = [
     // ...
     'Sound Healing', 'TCM (Traditional Chinese Medicine)',
     // ...
   ];
   ```

3. **src/types/database.ts** — No modality list here (modalities is `text[]`)

4. **pipeline/scripts/11_gm_classify.py** (line 51)
   ```python
   MODALITIES = [
       # ...
       'Sound Healing',
       # ...
   ]
   ```
   Also in `NAME_KEYWORDS` (no direct mention, but would need updating if extracting from site names)

5. **supabase/migrations/20260310000003_seed_taxonomy.sql** (line 55)
   ```sql
   INSERT INTO taxonomy_terms (axis_id, slug, label, parent_id, sort_order)
   SELECT a.id, v.slug, v.label, p.id, v.so
   FROM taxonomy_axes a
   JOIN taxonomy_terms p ON p.slug = 'energy-and-healing' AND p.axis_id = a.id,
   (VALUES
     ('reiki',          'Reiki',          1),
     ('sound-healing',  'Sound Healing',  2),  -- ← HERE
     ('energy-healing', 'Energy Healing', 3)
   ) AS v(slug, label, so)
   ```

6. **UI References (components):**
   - src/components/SearchBar.tsx — 'Sound Healing' in autocomplete list
   - src/pages/IslandHome.tsx — 'Sound Healing' in featured modalities
   - src/pages/Directory.tsx — 'Sound Healing' in modality filter list
   - src/pages/ProfileDetail.tsx — 'Sound Healing' in M_OCEAN set

#### Action Required:
If adding "Sound Bath" as a **new, separate modality** from "Sound Healing":
- Add "Sound Bath" to ALL the locations above
- Update taxonomy to add ('sound-bath', 'Sound Bath', 3) as a new term
- Update modality list length from 42 to 43 items

If "Sound Bath" is meant to **replace** "Sound Healing":
- Rename all instances of "Sound Healing" to "Sound Bath"
- Update taxonomy slug from 'sound-healing' to 'sound-bath'

---

### 2. Center Types — "coworking_space" Status

#### Finding: COMPLETELY MISSING

The center type "coworking_space" is **not defined anywhere** in the codebase.

**Current center types:** `spa` | `wellness_center` | `clinic` | `retreat_center` | `yoga_studio` | `fitness_center`

#### Locations that need updates:

1. **Database Schema Constraint — src/types/database.ts** (line 79)
   ```typescript
   export interface CenterRow {
     // ...
     center_type: 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio' | 'fitness_center';
     // ...
   }
   ```
   **Needs:** Add `'coworking_space'` to the union type

2. **Supabase Migration — supabase/migrations/20260315000001_add_fitness_center_type.sql**
   ```sql
   ALTER TABLE centers
     ADD CONSTRAINT centers_center_type_check
       CHECK (center_type IN ('spa', 'wellness_center', 'clinic', 'retreat_center', 'yoga_studio', 'fitness_center'));
   ```
   **Needs:** Create new migration file to add `'coworking_space'` to CHECK constraint

3. **Dashboard Centers UI — src/pages/dashboard/DashboardCenters.tsx** (line 15–22)
   ```typescript
   const centerTypeLabels: Record<CenterRow["center_type"], string> = {
     spa: "Spa",
     wellness_center: "Wellness Center",
     yoga_studio: "Yoga Studio",
     clinic: "Clinic",
     retreat_center: "Retreat Center",
     fitness_center: "Fitness Center",
   };
   ```
   **Needs:** Add `coworking_space: "Coworking Space",`

4. **Admin Panel — src/pages/admin/AdminPanel.tsx**
   - Line 196: `setConvertCenterType('wellness_center')` type definition
   - Line 277: Center form initializer
   - Line 305: Edit center form initializer
   All explicitly list center types in union types

   **Needs:** Add `'coworking_space'` to all type annotations

5. **Pipeline Scripts:**

   a. **pipeline/scripts/11_gm_classify.py** (line 319)
      ```python
      CENTER_TYPES = {"spa", "gym", "yoga_studio", "health", "wellness_center"}
      ```
      **Needs:** Add `"coworking_space"` (if Google Maps classifies coworking spaces)

   b. **pipeline/scripts/23_classify_centers.py**
      ```python
      elif center_type in ('spa', 'clinic', 'retreat_center', 'yoga_studio'):
      ```
      **Needs:** Add `'coworking_space'` to this condition

   c. **pipeline/scripts/19_centers_cleanup.py**
      Needs review for any hardcoded center type lists

   d. **pipeline/scripts/30_backfill_taxonomy.py** (line 230–248)
      ```sql
      INSERT INTO taxonomy_terms (axis_id, slug, label, sort_order)
      SELECT a.id, v.slug, v.label, v.so
      FROM taxonomy_axes a,
      (VALUES
        ('individual-practitioner', 'Individual Practitioner', 1),
        ('wellness-center',         'Wellness Center',         2),
        ('retreat-center',          'Retreat Center',          3),
        ('clinic',                  'Clinic',                  4),
        ('spa',                     'Spa',                     5),
        ('yoga-studio',             'Yoga Studio',             6),
        -- ... more terms
      ) AS v(slug, label, so)
      WHERE a.slug = 'provider_type';
      ```
      **Needs:** Add new provider_type term for 'coworking_space' / 'Coworking Space'
      (or if using 'coworking-space' slug, add as sort_order ~7)

6. **Taxonomy Seeding — supabase/migrations/20260310000003_seed_taxonomy.sql**
   Lines 230–248 define provider_type terms. Currently has:
   - individual-practitioner
   - wellness-center
   - retreat-center
   - clinic
   - spa
   - yoga-studio
   - coach, therapist, physician, bodyworker, birth-worker, spiritual-guide

   **Needs:** Add `('coworking-space', 'Coworking Space', 7)` to the VALUES clause

---

## Detailed Checklist

### Sound Bath Modality

**If adding as NEW modality (separate from Sound Healing):**

- [ ] src/pages/dashboard/DashboardProfile.tsx — Add "Sound Bath" to MODALITIES array
- [ ] src/pages/admin/AdminPanel.tsx — Add "Sound Bath" to MODALITIES_LIST array
- [ ] pipeline/scripts/11_gm_classify.py — Add "Sound Bath" to MODALITIES array + keyword mapping
- [ ] supabase/migrations/20260310000003_seed_taxonomy.sql — Add ('sound-bath', 'Sound Bath', ?) to Energy & Healing children
- [ ] supabase/migrations/ — Create migration to add alias(es) for Sound Bath if needed

**If replacing Sound Healing:**

- [ ] Rename all "Sound Healing" → "Sound Bath" in the files above
- [ ] Create migration to update existing data in practitioners/centers modalities arrays
- [ ] Update taxonomy slug and label

---

### Coworking Space Center Type

**Database Schema:**

- [ ] src/types/database.ts — Add `'coworking_space'` to CenterRow center_type union type
- [ ] supabase/migrations/ — Create new migration (e.g., 20260316000000_add_coworking_space_center_type.sql) with:
  ```sql
  ALTER TABLE centers
    DROP CONSTRAINT IF EXISTS centers_center_type_check;

  ALTER TABLE centers
    ADD CONSTRAINT centers_center_type_check
      CHECK (center_type IN ('spa', 'wellness_center', 'clinic', 'retreat_center', 'yoga_studio', 'fitness_center', 'coworking_space'));
  ```

**UI Components:**

- [ ] src/pages/dashboard/DashboardCenters.tsx — Add `coworking_space: "Coworking Space",` to centerTypeLabels
- [ ] src/pages/admin/AdminPanel.tsx — Update all center_type type annotations (lines 196, 277, 305, etc.)

**Pipeline Scripts:**

- [ ] pipeline/scripts/11_gm_classify.py — Add "coworking_space" mapping if relevant to Google Places types
- [ ] pipeline/scripts/23_classify_centers.py — Add 'coworking_space' to condition checks
- [ ] pipeline/scripts/19_centers_cleanup.py — Review and add if hardcoded center type lists exist
- [ ] pipeline/scripts/30_backfill_taxonomy.py — Ensure 'coworking_space' is recognized when backfilling

**Taxonomy:**

- [ ] supabase/migrations/20260310000003_seed_taxonomy.sql — Add ('coworking-space', 'Coworking Space', ?) to provider_type terms (or apply via new migration)

---

## File Summary Table

| File | Type | Sound Bath | Coworking Space | Notes |
|------|------|-----------|-----------------|-------|
| src/types/database.ts | TypeScript | N/A | ❌ Missing | Union type for CenterRow.center_type |
| src/pages/dashboard/DashboardProfile.tsx | React | ✅ Present | N/A | MODALITIES array (hardcoded) |
| src/pages/dashboard/DashboardCenters.tsx | React | N/A | ❌ Missing | centerTypeLabels record + form init |
| src/pages/admin/AdminPanel.tsx | React | ✅ Present | ❌ Missing | MODALITIES_LIST + center form types |
| src/components/SearchBar.tsx | React | ✅ Present | N/A | Modality autocomplete |
| src/pages/IslandHome.tsx | React | ✅ Present | N/A | Featured modalities |
| src/pages/Directory.tsx | React | ✅ Present | N/A | Modality filter list |
| src/pages/ProfileDetail.tsx | React | ✅ Present | N/A | M_OCEAN set (hardcoded) |
| pipeline/scripts/11_gm_classify.py | Python | ✅ Present | ❌ Missing | MODALITIES + CENTER_TYPES |
| pipeline/scripts/23_classify_centers.py | Python | N/A | ❌ Missing | center_type conditions |
| pipeline/scripts/19_centers_cleanup.py | Python | N/A | ? | Needs review |
| pipeline/scripts/30_backfill_taxonomy.py | Python | N/A | ❌ Missing | Maps center_type → provider_type |
| supabase/migrations/20260225000000_initial_schema.sql | SQL | N/A | ✅ Initial (4 types) | Original constraint |
| supabase/migrations/20260310000003_seed_taxonomy.sql | SQL | ✅ Present | ❌ Missing | Taxonomy terms (modality + provider_type) |
| supabase/migrations/20260315000001_add_fitness_center_type.sql | SQL | N/A | ❌ Missing | Latest CHECK constraint |

---

## Additional Considerations

1. **Aliases & Keyword Matching:**
   - If "Sound Bath" differs semantically from "Sound Healing", may need separate keyword list in pipeline
   - Consider if users search for "sound bath" vs "sound healing"

2. **Existing Data Migration:**
   - If replacing Sound Healing → Sound Bath: need data migration for existing listings
   - If adding new: no migration needed, existing records stay as-is

3. **Google Maps Classification:**
   - pipeline/scripts/11_gm_classify.py maps Google types (spa, gym, yoga_studio, etc.) to center_type
   - Coworking spaces may be labeled as "office_space", "shared_office", etc. in Google Maps
   - May need custom logic to detect and classify coworking

4. **Backfill & Taxonomy:**
   - Once center_type includes 'coworking_space', the backfill script (30_backfill_taxonomy.py) will auto-map it to provider_type term 'coworking-space'
   - Must ensure taxonomy seed has the 'coworking-space' term before running backfill

---

## Conclusion

**Sound Bath:**
- ✅ Partially integrated (exists as "Sound Healing")
- ⚠️ Clarify: Is this a new modality or a rename?

**Coworking Space:**
- ❌ Completely missing from codebase
- 🔴 **Priority:** Requires updates in 10+ locations (type definitions, UI, pipeline, SQL constraints, taxonomy)

**Estimated Effort:**
- Sound Bath clarification: ~5 minutes (naming decision)
- Sound Bath integration (if new): ~30 minutes (add to 6 places)
- Coworking Space integration: ~2–3 hours (schema + UI + pipeline + taxonomy sync)

