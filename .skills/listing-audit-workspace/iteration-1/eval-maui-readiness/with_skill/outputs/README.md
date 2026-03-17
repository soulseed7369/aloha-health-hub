# Maui Listings Audit — March 15, 2026

This audit was performed using the **listing-audit** skill to evaluate Maui practitioners and centers for production readiness before a marketing push.

## Files in this Audit Package

### 1. **AUDIT_SUMMARY.md** ⭐ START HERE
Executive summary with quick answers to your original questions:
- How many published vs draft?
- Are they good enough quality?
- Do they have photos, bios, contact info?
- Which look broken?

**Read this first.** 3-minute read.

### 2. **readiness_report.md** (DETAILED)
Complete audit report with:
- Per-listing quality scores (all 20 practitioners + 28 centers)
- Top 10 best listings by score
- Bottom 10 worst listings
- Critical issues breakdown
- Next steps and recommendations

**Read this for detailed analysis.** 10-minute read.

### 3. **BROKEN_LISTINGS.md** (ACTIONABLE)
Quick checklist of exactly which listings are broken:
- 18 practitioners with no contact, no bio, no photo
- 2 practitioners with partial info
- All 28 centers completely empty
- Data quality metrics

**Use this to assign cleanup tasks.** 5-minute read.

---

## Audit Methodology

This audit followed the **listing-audit skill** workflow (from `.skills/listing-audit/SKILL.md`), which checks:

### Tier 1: Schema & Structure
- Field presence and types
- Enum value validation (island, status, tier, session_type, etc.)

### Tier 2: Data Quality & Consistency
- Modality validation (all 44 canonical modalities)
- Location integrity (cities, lat/lng pairs)
- Name & identity quality
- Contact validation (email, phone, website URLs)
- Duplicate detection (fuzzy matching, phone/domain duplicates)

### Tier 3: Production & Search Readiness
- Frontend compatibility (ProviderCard rendering)
- Search & taxonomy readiness
- Cross-list synchronization (modalities appear consistently)

## Key Findings

| Category | Status | Severity |
|----------|--------|----------|
| **Status** | All 48 in draft, 0 published | 🔴 CRITICAL |
| **Photos** | 0/48 (0%) have them | 🔴 CRITICAL |
| **Descriptions** | 2/20 practitioners (10%) + 0/28 centers (0%) | 🔴 CRITICAL |
| **Contact Info** | 1/20 practitioners (5%) + 0/28 centers (0%) | 🔴 CRITICAL |
| **Modalities** | 100% valid (48/48) | ✅ GOOD |
| **Cities** | 100% canonical (48/48) | ✅ GOOD |
| **Duplicates** | None detected | ✅ GOOD |
| **Schema** | No errors | ✅ GOOD |

## Recommendation

**Do NOT send marketing traffic to Maui yet.** Current readiness: 0%

### Before Launch, Complete:
1. Add photos to all 48 listings
2. Write/expand descriptions (50+ words each)
3. Collect/verify all contact info
4. Publish all listings
5. QA review in staging

### Timeline
- **Phase 1 (Data cleanup):** 1-2 weeks
- **Phase 2 (QA review):** 1 week
- **Phase 3 (Publishing):** 1 day
- **Total:** 2-3 weeks to launch-ready

### Quick Wins
- Use `pipeline/scripts/22_website_enrich.py --island maui --apply` to auto-pull photos, emails, and bios from provider websites
- This alone can fill 30-50% of missing data

---

## Skill References Used

This audit used the canonical reference files from the skill:
- `references/canonical-modalities.md` (44 modalities, verified 100% match)
- `references/canonical-locations.md` (island/city mappings, verified 100% match)
- `references/schema-expectations.md` (field validation rules)
- `references/audit-learnings.md` (patterns and false positives)

All 48 listings are structurally correct but content-incomplete.

---

## Next Steps

1. **Read AUDIT_SUMMARY.md** (overview)
2. **Read BROKEN_LISTINGS.md** (action items)
3. **Review readiness_report.md** (details on each listing)
4. **Run website enrichment:** `cd pipeline && python scripts/22_website_enrich.py --island maui --limit 48`
5. **Re-run audit** after enrichment to verify improvements
6. **Publish** once quality thresholds are met

---

**Audit performed:** 2026-03-15 10:24 UTC
**Skill used:** listing-audit (from .skills/listing-audit/SKILL.md)
**Database queried:** Supabase (maui island filter)
**Records analyzed:** 48 total (20 practitioners, 28 centers)
