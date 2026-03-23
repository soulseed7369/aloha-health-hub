# Aloha Health Hub — Data Ingestion & Scraping Playbook

> **Goal:** Populate the directory with real Big Island wellness listings as unclaimed, draft-status records before launch. All entries are "cold start" aggregated data — providers can claim and enhance their listing later.
>
> **Ethics rule:** Only collect publicly available business information (name, address, phone, website). Never harvest personal data, emails, or private information from sources that prohibit scraping.

---

## Phase A — Manual Collection (Start Here)

**Recommended first step.** Fastest, lowest risk, no code required.

### What to collect

Business-level public information only:
- Business name
- Modality / type (e.g. "Lomilomi Massage", "Acupuncture", "Yoga Studio")
- Phone number (public business number)
- Public email if listed on their website
- Street address / city / region
- Website URL
- Booking/registration URL if present
- Source name + URL (for attribution and deduplication)

### Recommended sources (public, Big Island focused)

| Source | URL | What you get |
|---|---|---|
| Google Maps | maps.google.com → search "wellness Big Island HI" | Name, address, phone, website, hours |
| Yelp | yelp.com → "Health & Medical / Spas" → Hilo/Kona | Name, address, phone, categories |
| Alignable | alignable.com | Local business network, wellness listings |
| Hawaii Island Network | hinetwork.com | Local biz directory |
| Big Island Now | bigislandnow.com | News + business listings |
| Hawaii Wellness Tourism Assoc. | wellnessislands.com | Curated retreat + center listings |
| Retreat Guru | retreatguru.com → Hawaii | Retreat listings with registration links |
| BookRetreats | bookretreats.com → Hawaii | Retreat listings with external booking |
| Mindbody | mindbodyonline.com | Studios with booking links |

### CSV Template

Save collected data to `data/samples/big-island-raw.csv` using this exact header:

```
type,name,modality_or_type,phone,email,address,city,region,island,website_url,booking_url,source_name,source_url
```

**Field definitions:**

| Field | Values / Notes |
|---|---|
| `type` | `practitioner`, `center`, or `retreat` |
| `name` | Full business/practitioner name |
| `modality_or_type` | e.g. "Lomilomi Massage", "Yoga Studio", "Wellness Retreat" |
| `phone` | E.164 or local format, e.g. `(808) 555-0100` |
| `email` | Public contact email only — leave blank if not public |
| `address` | Full street address or leave blank if unavailable |
| `city` | e.g. `Hilo`, `Kailua-Kona`, `Waimea`, `Pahoa` |
| `region` | e.g. `Kohala Coast`, `Puna`, `Hamakua`, `Kona`, `Hilo` |
| `island` | Always `big_island` for Phase A |
| `website_url` | Provider's own website |
| `booking_url` | External booking/registration link (Mindbody, FareHarbor, etc.) |
| `source_name` | e.g. `Google Maps`, `Yelp`, `Retreat Guru` |
| `source_url` | Direct URL of the listing page you used |

**Sample rows:**

```csv
type,name,modality_or_type,phone,email,address,city,region,island,website_url,booking_url,source_name,source_url
practitioner,Keola Kahananui,Lomilomi Massage,(808) 555-0191,,123 Alii Dr,Kailua-Kona,Kona,big_island,https://example.com,,Google Maps,https://maps.google.com/...
center,Hilo Healing Arts,Integrative Health Center,(808) 555-0212,info@hilohealingarts.com,456 Kinoole St,Hilo,Hilo,big_island,https://hilohealingarts.com,https://mindbodyonline.com/...,Yelp,https://yelp.com/...
retreat,Volcano Yoga Immersion,Yoga Retreat,,info@example.com,,Volcano Village,Puna,big_island,https://example.com/retreat,https://bookretreats.com/...,BookRetreats,https://bookretreats.com/...
```

### Batch size guidelines
- Aim for **25–100 rows per CSV batch** for manageable normalization.
- Use one CSV per source/date to aid deduplication tracking.
- Name files: `data/samples/YYYY-MM-DD-{source}.csv` (e.g. `2026-03-01-google-maps.csv`).

---

## Phase B — Automated Scraping (After Phase A is Running)

Use only for **public, scraping-friendly sources** that don't require login.

### Approved targets (check `robots.txt` before each run)

| Source | Approach | Notes |
|---|---|---|
| Retreat Guru Hawaii listings | Playwright (JS render needed) | Paginated grid, check ToS |
| BookRetreats Hawaii | Cheerio (static HTML) | Paginated listings |
| Local business hubs (hinetwork.com) | Cheerio | Simple HTML structure |
| Mindbody business directory | Playwright | JS-heavy, rate-limit carefully |

### Scraper scripts location
All scraper scripts live in `scripts/scrapers/`. Each is a standalone ESM Node.js script.

```
scripts/
  scrapers/
    retreat-guru.mjs     # Playwright-based
    book-retreats.mjs    # Cheerio-based
    local-hubs.mjs       # Cheerio-based
  normalize.mjs          # Phase B → normalized JSON
  validate-csv.mjs       # Phase A CSV validation
  ingest.mjs             # Normalized JSON → Supabase (service role)
```

### Output format (normalized JSON)

Each scraper must output a JSON array. Agent B (`qwen/qwen3-8b`) is responsible for the normalization step.

```jsonc
[
  {
    // Required for all types
    "type": "practitioner",          // "practitioner" | "center" | "retreat"
    "name": "Keola Kahananui",
    "island": "big_island",
    "city": "Kailua-Kona",
    "region": "Kona",
    "status": "draft",              // Always "draft" for scraped data
    "owner_id": null,               // Always null for unclaimed

    // Type-specific required
    "modalities": ["Lomilomi Massage"],   // practitioners only (text[])
    "center_type": "wellness_center",     // centers only
    "start_date": "2026-10-10",           // retreats only
    "end_date": "2026-10-17",             // retreats only

    // Optional for all types
    "phone": "(808) 555-0191",
    "email": null,
    "address": "123 Alii Dr",
    "lat": 19.6400,
    "lng": -155.9969,
    "website_url": "https://example.com",
    "external_booking_url": "https://mindbody.com/...",  // practitioners/centers
    "registration_url": "https://bookretreats.com/...",  // retreats only
    "starting_price": 895.00,                            // retreats only (numeric)
    "description": "Brief description...",

    // Ingestion metadata (not stored in DB)
    "_source_name": "Google Maps",
    "_source_url": "https://maps.google.com/...",
    "_scraped_at": "2026-03-01T10:00:00Z"
  }
]
```

### Normalization rules (Agent B enforces these)

1. **Strip** all HTML tags from text fields.
2. **Phone**: normalize to `(XXX) XXX-XXXX` format; leave `null` if unparseable.
3. **URLs**: must start with `https://`; prepend if missing `http://`; set to `null` if invalid.
4. **Prices**: extract numeric value only (e.g. `"$1,950"` → `1950.00`); set to `null` if not found.
5. **Dates**: ISO 8601 `YYYY-MM-DD` only; `null` if unparseable.
6. **Lat/Lng**: numeric with 6 decimal places; `null` if not available (geocoding deferred to Sprint 4+).
7. **Modalities**: must be `text[]` — split comma-separated strings.
8. **`center_type`**: map to one of: `spa`, `wellness_center`, `clinic`, `retreat_center`.
9. **Dedup check**: before ingestion, filter rows where `(name, city)` already exists in DB.
10. **Batch size**: process max 100 rows per ingestion run.

---

## Phase C — Ingestion Script (Sprint 4 deliverable)

`scripts/ingest.mjs` — uses `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

**Security reminder:** This script must NEVER be bundled into the frontend. It runs locally only.

### Usage

```bash
# Validate a CSV before normalizing
node scripts/validate-csv.mjs data/samples/2026-03-01-google-maps.csv

# Normalize a raw CSV to JSON
node scripts/normalize.mjs data/samples/2026-03-01-google-maps.csv > data/samples/normalized-2026-03-01.json

# Ingest normalized JSON into Supabase
node scripts/ingest.mjs data/samples/normalized-2026-03-01.json

# Ingest with dry-run (logs what would be inserted, no writes)
node scripts/ingest.mjs data/samples/normalized-2026-03-01.json --dry-run
```

### Ingest script behavior

1. Read normalized JSON file.
2. Connect to Supabase via service role client.
3. For each row, check if `(name, city, island)` already exists → skip if duplicate.
4. Insert batch of up to 100 rows.
5. Log: inserted count, skipped count, error count.
6. On error: log the failing row + error message, continue with remaining rows.
7. Exit 0 on success, exit 1 if any errors occurred.

---

## Geocoding Strategy (deferred to Sprint 4+)

Lat/lng is needed for the map view. Options:

1. **Google Maps Geocoding API** — most accurate, $5/1000 requests.
2. **Nominatim (OSM)** — free, rate-limited to 1 req/sec, good for Big Island addresses.
3. **City centroid fallback** — use a lookup table of Big Island city coordinates as fallback for rows where address geocoding fails.

City centroid lookup table (`data/city-centroids.json`):

```json
{
  "kailua-kona": { "lat": 19.6400, "lng": -155.9969 },
  "hilo":         { "lat": 19.7241, "lng": -155.0868 },
  "waimea":       { "lat": 20.0234, "lng": -155.6728 },
  "volcano village": { "lat": 19.4414, "lng": -155.2343 },
  "pahoa":        { "lat": 19.4928, "lng": -154.9467 },
  "honokaa":      { "lat": 20.0793, "lng": -155.4660 },
  "captain cook": { "lat": 19.4942, "lng": -155.8767 },
  "kohala coast": { "lat": 19.9382, "lng": -155.8608 },
  "kawaihae":     { "lat": 20.0394, "lng": -155.8267 },
  "naalehu":      { "lat": 19.0649, "lng": -155.5855 }
}
```

---

## Legal & Ethical Checklist

Before each scraping run, verify:

- [ ] Checked `robots.txt` at target domain — scraping not disallowed
- [ ] Data is publicly visible without login
- [ ] No personal data (home addresses, personal emails) collected
- [ ] Rate limiting applied: ≥ 2 second delay between requests
- [ ] User-Agent set to identify the bot (e.g. `HawaiiWellness/1.0 (+https://hawaiiwellness.net/bot)`)
- [ ] Source URL preserved in `_source_url` for attribution
- [ ] Batch size ≤ 100 rows per run
