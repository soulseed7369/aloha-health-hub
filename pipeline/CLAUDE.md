# Pipeline Reference

## Google Maps Pipeline (primary)

Ingests listings from Google Maps as `draft` records for admin review.

**Env var required** (in `.env`, not `.env.local`):
```
GM_API_KEY=<your Google Places API key>
```

**Run:**
```bash
cd pipeline
bash scripts/run_gm_pipeline.sh --island big_island
# --island maui | oahu | kauai
# --dry-run to test without writing to DB
```

**Steps:**

| Script | Input | Output | What it does |
|--------|-------|--------|-------------|
| `09_gm_search.py` | island arg | `gm_place_ids.jsonl` | Text Search for modality × city combos → collect Place IDs |
| `10_gm_details.py` | `gm_place_ids.jsonl` | `gm_raw.jsonl` | Fetch full Place Details (resumes automatically) |
| `11_gm_classify.py` | `gm_raw.jsonl` | `gm_classified.jsonl` | Classify as practitioner/center, map Google types → modalities |
| `12_gm_dedup.py` | `gm_classified.jsonl` + DB | `gm_new.jsonl`, `gm_enrichments.jsonl`, `gm_review.jsonl` | Deduplicate against existing DB |
| `13_gm_upsert.py` | `gm_new.jsonl`, `gm_enrichments.jsonl` | Supabase DB | Insert new as `draft`, enrich existing blanks only |

**Deduplication — any ONE signal = duplicate:**
1. Phone number match (10-digit normalized, strip country code)
2. Website domain match (strip protocol / www / trailing slash)
3. Fuzzy name match (≥ 85% similarity, same island) via `SequenceMatcher`

**After running:** New records land as `status = 'draft'`, `tier = 'free'`, `owner_id = null`. Review and publish via Admin panel → Practitioners or Centers tab.

**API fields fetched** (cost-conscious):
`place_id, name, formatted_address, formatted_phone_number, website, url, geometry, opening_hours, types, rating, user_ratings_total, business_status, photos`

**Gotcha:** `11_gm_classify.py` modality mappings must stay in sync with the canonical 44-modality list in `DashboardProfile.tsx` and `AdminPanel.tsx`. See `.claude/rules/data-model.md`.

---

## Website Enrichment Pipeline (script 22)

Crawls existing listing websites to fill blank fields: email, phone, bio, avatar photo, modalities. Never overwrites existing data.

```bash
cd pipeline

# Crawl and save results for review
python3 scripts/22_website_enrich.py --island big_island

# Limit to N listings (for testing)
python3 scripts/22_website_enrich.py --island big_island --limit 50

# Preview only — no files written
python3 scripts/22_website_enrich.py --dry-run

# Crawl and apply to DB in one step
python3 scripts/22_website_enrich.py --island big_island --apply
```

**How it works:**
1. Fetches listings with `website_url` that are missing ≥1 of: email, phone, bio (<10 words), avatar_url, modalities
2. Crawls homepage; tries `/contact` as fallback for email
3. Extracts: email (`mailto:` + regex), phone (`tel:` + regex), bio (`og:description` → meta description → first 100-word paragraph), photo (`og:image` → `twitter:image` → first substantial `<img>`), modalities (keyword matching)
4. Saves to `pipeline/output/website_enrichments.jsonl`

Typical hit rate: ~85–90% on listings with working websites. Some `avatar_url` values may be logos — review before applying.

**Apply saved enrichments manually:**
```python
import json
from src.supabase_client import client

with open('output/website_enrichments.jsonl') as f:
    for line in f:
        r = json.loads(line)
        patch = {k: v for k, v in r.items() if not k.startswith('_')}
        client.table(r['_db_table']).update(patch).eq('id', r['_db_id']).execute()
```

---

## Web Crawl Pipeline (fallback)

Less reliable than the GM pipeline. Use only when GM pipeline is not suitable.

```bash
cd pipeline
bash scripts/run_pipeline.sh [--dry-run]
```

Steps: Brave search (00) → seed URLs (01) → crawl pages (03) → extract entities (04) → normalize (05) → extract images (06) → download images (07) → upload + upsert (08)
