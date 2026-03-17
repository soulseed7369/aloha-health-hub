# Big Island Wellness Centers — Data Quality Audit

**Date:** March 15, 2026
**Scope:** All 398 centers where `island = 'big_island'`
**Status breakdown:** 276 draft, 122 published

---

## Executive Summary

The Big Island centers table has **398 records** across 5 center types. Phone numbers and addresses are strong (96–99%), but email (39%), photos (8%), and descriptions (69%) have significant gaps. The most critical issues are **9 centers geocoded to the wrong island**, **33 likely misclassified solo practitioners**, **5 duplicate phone groups**, and **4 non-canonical modality values**. All 33 misclassified listings are draft status, so they won't affect the live site until published, but they need correction before any bulk publish.

---

## Severity: CRITICAL

### 1. Wrong-island coordinates (9 centers)

These centers are tagged `island = 'big_island'` but their lat/lng coordinates place them on other islands. They'll appear on the Big Island map in the wrong location.

| Center | City | Lat | Lng | Likely actual island |
|--------|------|-----|-----|---------------------|
| Sunset Therapy Center | — | 21.70 | -157.97 | Oahu |
| Hawai'i Nutrition Hui | — | 22.08 | -159.31 | Kauai |
| Aloha Kai Aesthetics and Wellness | — | 21.57 | -158.12 | Oahu |
| Hale Akua Garden Farm & Eco-Retreat | — | 20.91 | -156.22 | Maui |
| Sacred Falls International Meditation Center | — | 21.59 | -157.90 | Oahu |
| Maui Singing Bowl | — | 20.69 | -156.44 | Maui |
| Wat Dhammavihara Hawaii | — | 21.42 | -158.14 | Oahu |
| Hilo Chiropractic Clinic | — | 21.39 | -157.95 | Oahu |
| Kumumea Yoga | — | 21.40 | -157.74 | Oahu |

**Fix SQL — reassign island based on coordinates:**
```sql
-- Oahu (lat ~21.3-21.7, lng ~-158.2 to -157.6)
UPDATE centers SET island = 'oahu'
WHERE id IN (
  SELECT id FROM centers
  WHERE island = 'big_island'
    AND lat BETWEEN 21.0 AND 21.8
    AND lng BETWEEN -158.3 AND -157.5
);

-- Maui (lat ~20.6-21.0, lng ~-156.7 to -156.0)
UPDATE centers SET island = 'maui'
WHERE id IN (
  SELECT id FROM centers
  WHERE island = 'big_island'
    AND lat BETWEEN 20.5 AND 21.1
    AND lng BETWEEN -156.7 AND -155.9
);

-- Kauai (lat ~21.8-22.3, lng ~-159.8 to -159.2)
UPDATE centers SET island = 'kauai'
WHERE id IN (
  SELECT id FROM centers
  WHERE island = 'big_island'
    AND lat BETWEEN 21.8 AND 22.3
    AND lng BETWEEN -159.8 AND -159.0
);
```

### 2. Exact duplicates (published × published)

**Malama Chiropractic Clinic** appears twice as `published` with the same phone (5031697833) and website (malamachiropractic.com/acupuncture). One should be deleted.

```sql
-- Find the duplicate pair
SELECT id, name, status, phone, website_url, created_at
FROM centers
WHERE phone LIKE '%503%169%7833%' OR website_url ILIKE '%malamachiropractic%'
ORDER BY created_at;

-- Delete the newer duplicate (replace ID after verifying)
-- DELETE FROM centers WHERE id = '<newer_duplicate_id>';
```

### 3. Misclassified solo practitioners in centers table (33 flagged)

These are likely solo practitioners operating under a business name that got classified as centers by the pipeline. All 33 are draft status. The highest-confidence cases (score 5–6) should be migrated to the practitioners table:

**Score 6 (highest confidence — migrate first):**

| Name | City | Modalities | Signals |
|------|------|------------|---------|
| Ola I Ke Aloha Massage LLC | Hilo | Massage | LLC, first-person desc, single solo modality |
| Le Manaia Massage LLC | Waimea | Massage | LLC, first-person desc, single solo modality |

**Score 5:**

| Name | City | Modalities | Signals |
|------|------|------------|---------|
| Shen Hale Wellness \| Dr. Justyn Bonomi | Kailua-Kona | Alternative Therapy | Credentials (L.Ac), first-person desc |
| Akiko Medspa | Waimea | Nutrition | Personal name, first-person desc |

**Score 4 (31 more — review manually before migrating):**
Full list includes Clear Chiropractic LLC, SoulTending Services LLC, Head and Neck Center of Hawai'i LLC, Mauna Lani Chiropractic, Akahai Emotional Wellness LLC, and 26 others. Most share the pattern: LLC in name + single solo modality + wellness_center type.

**Migration SQL template (run per-listing after manual review):**
```sql
-- Step 1: Insert into practitioners
INSERT INTO practitioners (
  name, island, city, address, lat, lng, phone, email,
  website_url, modalities, status, tier, session_type,
  bio, avatar_url, created_at
)
SELECT
  name, island, city, address, lat, lng, phone, email,
  website_url, modalities, 'draft', 'free', session_type,
  description, avatar_url, created_at
FROM centers
WHERE id = '<center_id>';

-- Step 2: Delete from centers
DELETE FROM centers WHERE id = '<center_id>';
```

---

## Severity: HIGH

### 4. Cross-table duplicates (8 centers match practitioners)

These centers share a phone number or website domain with an existing practitioner record, suggesting double-entry:

| Center | Status | Match type |
|--------|--------|------------|
| Hamakua-Kohala Health | published | website |
| The Koa Clinic | published | phone |
| Pilates of Hawaii | published | phone |
| Kirpal Meditation & Ecological Center | draft | phone |
| Malama Chiropractic Clinic (×2) | published | phone |
| Kīpuka o ke Ola (KOKO) | published | phone + website |
| Malama Pono Massage | published | website |

**Action:** Review each pair manually. If the practitioner and center are the same entity, decide which table is correct and delete the other.

### 5. Non-canonical modality values (4 values, 7 centers)

| Found value | Should be | Centers affected |
|-------------|-----------|------------------|
| `Trauma Informed Services` | `Trauma-Informed Care` | 3 |
| `energy healing` | `Energy Healing` | 1 |
| `physical therapy` | `Physical Therapy` | 2 |
| `somatic` | `Somatic Therapy` | 1 |

**Fix SQL:**
```sql
-- Fix case: "energy healing" → "Energy Healing"
UPDATE centers
SET modalities = array_replace(modalities, 'energy healing', 'Energy Healing')
WHERE 'energy healing' = ANY(modalities);

-- Fix case: "physical therapy" → "Physical Therapy"
UPDATE centers
SET modalities = array_replace(modalities, 'physical therapy', 'Physical Therapy')
WHERE 'physical therapy' = ANY(modalities);

-- Fix case: "somatic" → "Somatic Therapy"
UPDATE centers
SET modalities = array_replace(modalities, 'somatic', 'Somatic Therapy')
WHERE 'somatic' = ANY(modalities);

-- Fix variant: "Trauma Informed Services" → "Trauma-Informed Care"
UPDATE centers
SET modalities = array_replace(modalities, 'Trauma Informed Services', 'Trauma-Informed Care')
WHERE 'Trauma Informed Services' = ANY(modalities);
```

### 6. Missing coordinates (12 centers)

These centers have no lat/lng and won't appear on the map:

Hawaii Massage Clinic, Ka Hoku Kai Counseling Center, Hawaii Quantum Alignment Bodywork South Kona, Soul Centered Massage & Wellness, Trauma Healing Hawaii, HAWAIIAN HEALING AND WISDOM for MODERN LIVING, Holotropic Breathwork Retreat, Experience Energy Healing Hawaii, Big Island Ayurveda, Ohana Osteopathic & Wellness Center, Ho'ōla Lōkahi Health and Wellness Center, Kulaniapia Falls.

**Action:** Re-geocode using Google Places API or manually look up addresses.

---

## Severity: MEDIUM

### 7. "Alternative Therapy" as sole modality (33 centers)

These centers have only the generic fallback modality, meaning the pipeline couldn't classify them specifically. They'll match searches poorly. Examples: Island Holistic Healing, Kambo Hawaii, Uplifted Health LLC, Inspire Wellness - Dr. Daniel Caputo, Anna Liza Van Dine L.Ac, and 28 others.

**Action:** Review each listing's website/description and assign proper modalities. Many of these are actually acupuncture, naturopathic, or massage practices.

### 8. Empty-string website_url (79 centers)

79 centers have `website_url = ''` (empty string) instead of `NULL`. This can cause issues with enrichment scripts that check `IS NOT NULL` to find listings needing websites.

```sql
UPDATE centers SET website_url = NULL
WHERE website_url = '' AND island = 'big_island';
```

### 9. Non-canonical city names (69 centers)

| City value | Count | Suggested fix |
|------------|-------|---------------|
| Kealakekua | 26 | Add to canonical list (legitimate Big Island town) |
| Pāhoa | 25 | Normalize to `Pahoa` (remove diacritics) |
| Waikoloa Village | 7 | Normalize to `Waikoloa` |
| Kohala Coast | 1 | Map to `Waikoloa` or `Waimea` |
| HI 96726 / HI 96708 / HI 96743 | 3 | ZIP codes instead of city — fix manually |

```sql
-- Normalize Pāhoa → Pahoa
UPDATE centers SET city = 'Pahoa'
WHERE city = 'Pāhoa' AND island = 'big_island';

-- Normalize Waikoloa Village → Waikoloa
UPDATE centers SET city = 'Waikoloa'
WHERE city = 'Waikoloa Village' AND island = 'big_island';
```

### 10. Missing modalities (2 centers)

Vipassana Hawaii and Lōkahi Pilates have empty modality arrays. These won't appear in any modality-filtered search.

```sql
UPDATE centers SET modalities = ARRAY['Meditation']
WHERE name = 'Vipassana Hawaii' AND island = 'big_island';

UPDATE centers SET modalities = ARRAY['Fitness']
WHERE name LIKE 'Lōkahi Pilates%' AND island = 'big_island';
```

---

## Severity: LOW

### 11. Bogus phone number

Phone `3333333333` appears on Tanaka Family Chiropractic Center and Ohana Osteopathic & Wellness Center. This is clearly placeholder data.

```sql
UPDATE centers SET phone = NULL
WHERE phone LIKE '%333-333-3333%' AND island = 'big_island';
```

### 12. Invalid website_url

Diamond Natural Health has `website_url = 'x'` — not a valid URL.

```sql
UPDATE centers SET website_url = NULL
WHERE website_url = 'x' AND island = 'big_island';
```

### 13. Suspicious phone sharing

Phone `3141925352` shared by Pilates of Hawaii (published) and Kirpal Meditation & Ecological Center (draft) — these are likely different businesses with a data entry error. Phone `2545352419` shared by Experience Energy Healing Hawaii (draft) and Evry Collective HI (published) — same concern.

---

## Field Completeness Summary

| Field | Filled | Pct |
|-------|--------|-----|
| phone | 383 | 96% |
| address | 392 | 98% |
| city | 395 | 99% |
| lat/lng | 386 | 97% |
| website_url | 233 (excl. empty strings) | 59% |
| description | 275 | 69% |
| avatar_url | 262 | 66% |
| email | 156 | 39% |
| photos | 30 | 8% |

**Biggest gaps:** email (39%) and photos (8%) are the weakest fields. Running website enrichment (script 22) on the 233 centers with real website URLs could fill many email gaps.

---

## Quick-Win SQL Bundle

Run these in order for immediate data quality improvement:

```sql
-- 1. Fix non-canonical modalities (7 centers)
UPDATE centers SET modalities = array_replace(modalities, 'energy healing', 'Energy Healing') WHERE 'energy healing' = ANY(modalities);
UPDATE centers SET modalities = array_replace(modalities, 'physical therapy', 'Physical Therapy') WHERE 'physical therapy' = ANY(modalities);
UPDATE centers SET modalities = array_replace(modalities, 'somatic', 'Somatic Therapy') WHERE 'somatic' = ANY(modalities);
UPDATE centers SET modalities = array_replace(modalities, 'Trauma Informed Services', 'Trauma-Informed Care') WHERE 'Trauma Informed Services' = ANY(modalities);

-- 2. Clean empty-string website_url (79 centers)
UPDATE centers SET website_url = NULL WHERE website_url = '' AND island = 'big_island';

-- 3. Normalize city names (32 centers)
UPDATE centers SET city = 'Pahoa' WHERE city = 'Pāhoa' AND island = 'big_island';
UPDATE centers SET city = 'Waikoloa' WHERE city = 'Waikoloa Village' AND island = 'big_island';

-- 4. Fix bogus phone/website (3 centers)
UPDATE centers SET phone = NULL WHERE phone LIKE '%333-333-3333%' AND island = 'big_island';
UPDATE centers SET website_url = NULL WHERE website_url = 'x' AND island = 'big_island';

-- 5. Add missing modalities (2 centers)
UPDATE centers SET modalities = ARRAY['Meditation'] WHERE name = 'Vipassana Hawaii' AND island = 'big_island';
UPDATE centers SET modalities = ARRAY['Fitness'] WHERE name LIKE 'Lōkahi Pilates%' AND island = 'big_island';
```
