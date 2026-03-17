# Audit Learnings — Living Document

This file is updated after every audit run. It captures patterns, false positives, new rules, and evolving thresholds so future audits get smarter over time.

## How to use this file

**Before each audit:** Read this file first. Apply any learned rules, skip known false positives, and use calibrated thresholds instead of defaults.

**After each audit:** Append new findings to the appropriate section below. Include the date, what was learned, and how it should change future audits.

---

## Learned Rules (patterns discovered through use)

<!-- Add entries in this format:
### YYYY-MM-DD: {short title}
**Context:** {what was being audited}
**Discovery:** {what was found}
**Rule:** {how future audits should handle this}
-->

### 2026-03-15: Script 26 bio-in-name false positives
**Context:** Name extraction from practitioner name fields
**Discovery:** Script 26 extracts bio opening sentences into first_name/last_name when the name starts with a common English word like "An" (from "An Integrative approach to...")
**Rule:** When auditing name fields, flag any `first_name` that is a common English word (a, an, the, our, we, my, i, for, at, on, in, by, to) or any `last_name` longer than 40 characters.

### 2026-03-15: Solo practitioners misclassified as centers
**Context:** User noticed practitioners with business names ending up in centers table
**Discovery:** Pipeline `classify_type()` in script 11 classifies any name containing "wellness", "holistic", "practice", "healing", "spa", "clinic" as a center. Many solo practitioners operate under business names with these words. They get ingested into centers instead of practitioners, making them invisible to practitioner search.
**Rule:** Check 11 added. Flag centers with 3+ signals: solo-practitioner modalities, personal name embedded, single photo, generic center_type (`wellness_center`), only 1 modality. Provide migration SQL to move confirmed cases. This is the highest-impact data quality issue.

### 2026-03-15: Fitness taxonomy gap
**Context:** Adding new modality across the system
**Discovery:** Modality was added to 5 hardcoded UI lists but not to the taxonomy_terms table. The new search system uses taxonomy, not the hardcoded lists.
**Rule:** When checking cross-list sync (Check 10), also verify the taxonomy_terms table in Supabase has an entry for every canonical modality. Missing taxonomy entries make modalities invisible to search even if they appear in the filter UI.

### 2026-03-15: CENTER_TYPE_LABELS in adapters.ts
**Context:** Adding fitness_center center type
**Discovery:** `CENTER_TYPE_LABELS` in `src/lib/adapters.ts` is typed as `Record<CenterRow['center_type'], string>` — adding a new center_type to the TypeScript union without adding it to this Record causes a type error that breaks the Vercel build silently.
**Rule:** When checking center_type sync, include adapters.ts CENTER_TYPE_LABELS as a required location.

### 2026-03-15: Check 11 misclassification threshold calibration
**Context:** Big Island centers audit — initial run flagged 349/398 (88%) as misclassified
**Discovery:** Original heuristics (3+ of 8 signals) were too loose. `single_or_no_photo` triggered on 92% of centers (photos field is 8% populated) and `generic_center_type` on 63%. These signals are near-universal and not discriminating.
**Rule:** Use weighted scoring for Check 11: strong signals (personal name only, credentials in name, LLC, first-person description) = 2 pts each; moderate signals (single solo modality, all solo modalities, generic center_type) = 1 pt each. Threshold = score ≥ 4. This flagged 33/398 (8%) — much more actionable. Do NOT count `single_or_no_photo` as a signal until photo population exceeds 50%.

### 2026-03-15: Per-island coordinate bounds catch wrong-island data
**Context:** Big Island centers audit
**Discovery:** 9 centers tagged as `big_island` had coordinates on Oahu, Maui, or Kauai. The Hawaii-wide bounding box (18.9–22.3 lat) doesn't catch these. Per-island bounds are needed: Big Island lat 18.9–20.3, lng -156.1 to -154.7.
**Rule:** Always check per-island coordinate ranges, not just the Hawaii-wide bounding box. Flag any listing whose coordinates fall outside its tagged island's approximate bounds.

### 2026-03-15: Kealakekua is a legitimate Big Island city
**Context:** 26 centers flagged with non-canonical city "Kealakekua"
**Discovery:** Kealakekua is a real Big Island town (near Captain Cook). It was missing from the canonical city list.
**Rule:** Add Kealakekua to Big Island canonical cities in both audit references and pipeline config.

### 2026-03-15: Empty-string vs NULL in website_url
**Context:** 79 Big Island centers had website_url = '' (empty string)
**Discovery:** Pipeline sometimes writes empty string instead of NULL. Enrichment scripts check `IS NOT NULL` which treats empty strings as "has a website." This blocks enrichment from finding these listings.
**Rule:** Flag empty-string fields that should be NULL (website_url, email, phone). Provide cleanup SQL.

---

## Known False Positives (skip these)

<!-- Add entries in this format:
### {pattern}
**Why it's a false positive:** {explanation}
**Skip condition:** {when to skip}
-->

### Business names in practitioner name field
**Why it's a false positive:** Many legitimate practitioners operate under a business name (e.g., "Healing Touch Massage — Kona"). The name field containing business-like words doesn't always mean it's miscategorized.
**Skip condition:** Only flag if the listing is classified as a practitioner AND the name contains LLC, Inc, Corp, or similar legal entity indicators.

---

## Threshold Calibration

<!-- Track how thresholds perform and adjust over time -->

| Check | Default threshold | Calibrated threshold | Date | Notes |
|---|---|---|---|---|
| Bio word count | >10 words | >10 words | 2026-03-15 | Works well; most bios are either empty or 50+ words |
| Name fuzzy match | ≥85% | ≥85% | 2026-03-15 | From pipeline script 12; good balance |
| Lat bounds | 18.9–22.3 | 18.9–22.3 | 2026-03-15 | Hawaii bounding box |
| Lng bounds | -160.3 to -154.7 | -160.3 to -154.7 | 2026-03-15 | Hawaii bounding box |

---

## New Checks Proposed (not yet in SKILL.md)

<!-- Capture ideas for new audit checks discovered during use -->

---

## Schema Changes Log

<!-- Track when schema changes happen so audits can adapt -->

| Date | Change | Impact on audit |
|---|---|---|
| 2026-03-14 | Added `first_name`, `last_name`, `display_name` columns | Name quality check added |
| 2026-03-14 | Added `enriched_at`, `lead_score`, `no_website_lead` columns | Enrichment tracking added |
| 2026-03-14 | Added `google_place_id` column | Dedup can now use place ID |
| 2026-03-15 | Added `fitness_center` to center_type CHECK constraint | Center type validation updated |
| 2026-03-15 | Added Fitness to taxonomy_terms | Taxonomy sync check updated |
