# Broken or Embarrassing Maui Listings — Quick Checklist

All 48 Maui listings are in draft status and need work before publishing. Here's the breakdown by severity.

---

## 🔴 Completely Empty (No Contact, No Bio, No Photo)

These 18 listings have almost nothing filled in and will look terrible to users:

1. Ayurveda Maui (Paia)
2. Ayurveda Woman (Makawao)
3. Carla Carrasco (Hana)
4. Choice Ayurveda (Makawao)
5. Daniella Therapeutic Massage + Somatic Release (Makawao)
6. Dr. David Kern (Kihei)
7. Heart Path Journeys (Makawao)
8. Holy Harmony Bodywork (Makawao)
9. Island Nutrition (Kihei)
10. Maui Medicinal Herbs (Makawao)
11. Maui Midwifery (Wailuku)
12. Maui Somatics (Kula)
13. Mind and Body Harmonics (Kihei)
14. Nathan Ehrlich, ND (Makawao)
15. Reiki With Jenna (Kihei)
16. Soul Transformation (Makawao)
17. Cheri Bantilan MS, RD at Hui No Ke Ola Pono (Wailuku)
18. Haleakalā Observatory (Kula) — missing all contact info

**Action:** Reach out to these providers and collect:
- Professional photo
- Bio (50+ words about their practice and background)
- Email address
- Phone number

---

## 🟡 Missing Critical Info (Photo + Contact)

These 2 listings have some info but are missing photos and contact details:

1. **Amanda Moore** (Makawao) — Has contact info only
   - Missing: Photo, Bio

2. **Dragon's Den Herb Shop Maui** (Makawao) — Has bio only (14 words)
   - Missing: Photo, Email

**Action:** Fill in missing email and add photos.

---

## ⚠️ All 28 Centers — Completely Empty

Every single center listing has:
- No photos
- No description
- No contact info (or invalid)

**Top offenders by city:**
- Kahului: 3 centers (all empty)
- Kihei: 5 centers (all empty)
- Makawao: 3 centers (all empty)
- Hana: 2 centers (all empty)
- Kula: 2 centers (all empty)
- Other: 13 centers (all empty)

**Action:** This is your biggest gap. All 28 need:
- At least 1 professional photo
- 50+ word description
- Valid email + phone

---

## What "Good Enough" Looks Like

**Score 70+:** Dragon's Den Herb Shop (72/100)
- ✓ Name present
- ✓ City present (Makawao)
- ✓ Modalities present
- ✓ Bio written (14 words — still short, expand to 50+)
- ✗ Photo missing
- ✗ Email missing

Even the *best* listing (72/100) is missing critical info for marketing.

---

## Pragmatic Fix Strategy

If you want to launch Maui in 1-2 weeks:

### Week 1: Data Collection
1. **Email/call all 20 practitioners** — collect photos, expand bios, verify contact
2. **Email/call all 28 centers** — collect photos, get descriptions, verify contact
3. Use `pipeline/scripts/22_website_enrich.py --island maui --apply` to auto-pull info from existing websites

### Week 2: QA & Publishing
1. Verify all photos are professional
2. Ensure all bios/descriptions are 50+ words
3. Test all contact links
4. Publish in admin panel
5. Soft launch via email
6. Full marketing push

### If You Don't Have Time
Launch with what you have (photo + contact info only) and note that descriptions will be added. It's not ideal, but better than nothing.

---

## Data Quality Metrics

| Category | Current | Target for Launch |
|----------|---------|-------------------|
| Practitioners with photos | 0/20 (0%) | 20/20 (100%) |
| Practitioners with bio (>10 words) | 2/20 (10%) | 20/20 (100%) |
| Practitioners with valid contact | 1/20 (5%) | 20/20 (100%) |
| Centers with photos | 0/28 (0%) | 28/28 (100%) |
| Centers with description (>10 words) | 0/28 (0%) | 28/28 (100%) |
| Centers with valid contact | 0/28 (0%) | 28/28 (100%) |

**Gap to close:** 69 missing pieces of critical data

---

## Files Generated in This Audit

- `readiness_report.md` — Detailed per-listing quality scores and issues
- `AUDIT_SUMMARY.md` — Executive summary and recommendations
- `BROKEN_LISTINGS.md` — This file (quick reference)
