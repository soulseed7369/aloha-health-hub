# Maui Practitioners Audit — Executive Summary

**Audit Date:** 2026-03-15
**Status:** Complete

---

## Quick Answer to Your Questions

### 1. How many are published vs draft?
- **Published:** 0
- **Draft:** 48 (20 practitioners, 28 centers)
- **Status:** ⚠ NOTHING IS LIVE YET

### 2. Are published ones good enough quality?
Not applicable — there are no published listings. All 48 are in draft status.

### 3. Do they have photos, bios, working contact info?
**No. This is a major problem for marketing.**

| Metric | Practitioners | Centers |
|--------|---|---|
| Have photos | 0/20 (0%) | 0/28 (0%) |
| Have good bio/desc (>10 words) | 2/20 (10%) | 0/28 (0%) |
| Have valid email + phone | 1/20 (5%) | 0/28 (0%) |
| Average quality score | 54/100 | 52/100 |

### 4. Which ones look broken or embarrassing?
Almost all of them. The listings appear to have been bulk-imported from Google Maps without enrichment or cleanup. Typical issues:

- **18 practitioners** have zero bio/description text
- **19 practitioners** missing email or phone (or both)
- **20 practitioners** completely missing photos
- **28 centers** have identical problems (0 photos, 0 descriptions, 0 contact info)

**Best listing:** Dragon's Den Herb Shop (score: 72/100) — but still missing photo and email.

---

## Do NOT Send Marketing Traffic Yet

**Current readiness: 0%**

If you push traffic to Maui now, users will:
- See listings with no photos (looks unprofessional)
- See no business descriptions (tells users nothing about the provider)
- Find no contact info or broken links
- Get a bad first impression of the directory

---

## What Needs to Happen Before Launch

### Phase 1: Data Cleanup (1-2 weeks)
1. **Add 20 practitioner photos** — 0% currently have them
2. **Add bios to 18 practitioners** — expand the 14-word average to 50+ words
3. **Fix contact info** — 19 are missing email, phone, or both
4. **Add 28 center photos** — none currently have them
5. **Add descriptions to 28 centers** — all are blank

### Phase 2: QA Review (1 week)
1. Verify photos are professional and relevant
2. Review bios/descriptions for quality
3. Spot-check top 20 listings
4. Test all contact links

### Phase 3: Publishing (1 day)
1. Publish reviewed listings in admin panel
2. Soft launch to email list
3. Full marketing push

---

## Recommendation

**Do NOT launch Maui marketing until:**
- ✅ All 20 practitioners have photos
- ✅ All have substantial bios (50+ words ideal, 10+ minimum)
- ✅ All have valid contact info (both email AND phone)
- ✅ All 28 centers have at least one photo
- ✅ All centers have descriptions

**Estimated timeline:** 1-2 weeks if you have resources to enrich the data. Use the `pipeline/scripts/22_website_enrich.py` script to automatically pull photos, emails, and bios from provider websites.

---

## Good News

- ✅ All 48 listings have valid, canonical modalities (100% match)
- ✅ All cities are in the canonical list for Maui
- ✅ No obvious duplicates detected
- ✅ Data structure is sound (no schema errors)

The data is *structurally correct* — just needs enrichment before it's customer-ready.

---

## Next Actions

1. **Review full audit report:** `readiness_report.md` (detailed per-listing breakdown)
2. **Run website enrichment:** `cd pipeline && python scripts/22_website_enrich.py --island maui --apply`
3. **Re-audit after enrichment** to verify improvements
4. **Publish** once quality thresholds are met

---

See `readiness_report.md` for the full detailed audit with per-listing breakdown.
