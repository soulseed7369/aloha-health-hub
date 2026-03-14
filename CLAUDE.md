# Aloha Health Hub — Project Knowledge Base

This file is read automatically at the start of every session. It captures hard-won knowledge about this codebase so I don't have to re-explore it each time.

---

## Project Overview

**Aloha Health Hub** — Hawaiian wellness directory at hawaiiwellness.net
**Operator:** Hawaii Wellness LLC
**Contact:** aloha@hawaiiwellness.net
**Stack:** React + TypeScript + Vite · Tailwind CSS + shadcn/ui · Supabase (Postgres + Auth + Storage) · Stripe (subscriptions) · Vercel (hosting)
**Repo:** github.com/soulseed7369/aloha-health-hub

---

## Directory Data Model

### `practitioners` table (key columns)
```
id            uuid PK
name          text
bio           text
island        text  -- 'big_island' | 'maui' | 'oahu' | 'kauai'
city          text
address       text
phone         text
email         text
website_url   text
external_booking_url text
modalities    text[]   -- ARRAY, not comma-separated string
tier          text     -- 'free' | 'premium' | 'featured'
status        text     -- 'draft' | 'published'
owner_id      uuid FK → auth.users
accepts_new_clients boolean
lat           float8
lng           float8
photo_url     text
social_links  jsonb    -- { instagram, facebook, linkedin, x, substack }
session_type  text     -- 'in_person' | 'online' | 'both'
created_at    timestamptz
updated_at    timestamptz
```

### `centers` table (key columns)
Same shape as practitioners plus:
```
center_type   text     -- 'spa' | 'wellness_center' | 'clinic' | 'retreat_center'
photos        text[]   -- array of image URLs (max 5)
working_hours jsonb    -- { mon: {open, close} | null, tue: ..., ... }
testimonials  jsonb[]
description   text
```

### `featured_slots` table
```
id            uuid PK
listing_id    uuid     -- FK to practitioners.id OR centers.id
listing_type  text     -- 'practitioner' | 'center'
island        text
owner_id      uuid FK → auth.users
created_at    timestamptz
```
- Capped at **5 per island** (enforced by DB trigger)
- Created/deleted atomically by `useSetListingTier` and by the Stripe webhook

### `user_profiles` table
```
id                    uuid PK (= auth.users.id)
tier                  text
stripe_customer_id    text
stripe_subscription_id text
stripe_price_id       text
subscription_status   text
subscription_period_end timestamptz
updated_at            timestamptz
```

### `retreats` table — separate from practitioners/centers, gated by Premium tier

### `articles` table — admin-managed blog posts, slug-routed

### `listing_flags` table — user-submitted reports for admin review

---

## Directory Filtering & Sorting

### Where filtering lives
- **`src/hooks/usePractitioners.ts`** — fetches practitioners with Supabase query-level filters
- **`src/hooks/useCenters.ts`** — same for centers
- **`src/pages/Directory.tsx`** — combines both, applies client-side sort/filter UI

### Filter columns and how they're applied
| Filter | Applied at | Notes |
|--------|-----------|-------|
| `island` | Supabase `.eq('island', value)` | Always applied first |
| `status` | Supabase `.eq('status', 'published')` | Hard-coded in hooks |
| `modality` | Client-side `Array.includes()` | modalities is `text[]` |
| `city` | Client-side string match | cities vary per island |
| `session_type` | Client-side | 'in_person' \| 'online' \| 'both' |
| `tier` | Client-side | for filtering premium/featured |

### Sort order
Featured listings always sort first (tier = 'featured'), then by name alphabetically. Featured rotation on island homepages is driven by the `featured_slots` table.

### Island → cities mapping (defined in `DashboardProfile.tsx` and `AdminPanel.tsx`)
```
big_island: Kailua-Kona, Hilo, Waimea/Kamuela, Pahoa, Captain Cook, Keaau,
            Holualoa, Volcano, Waikoloa, Ocean View, Hawi, Kapaau, Honokaa
maui:       Lahaina, Kihei, Wailea, Kahului, Wailuku, Makawao, Paia,
            Haiku, Kula, Pukalani, Napili, Kapalua, Hana
oahu:       Honolulu, Waikiki, Kailua, Kaneohe, Pearl City, Kapolei,
            Haleiwa, Mililani, Hawaii Kai, Manoa, Kaimuki
kauai:      Lihue, Kapaa, Hanalei, Princeville, Poipu, Koloa,
            Hanapepe, Waimea, Kilauea, Kalaheo
```

### Canonical modalities list (34 total — used in checkboxes and pipeline)
Acupuncture, Alternative Therapy, Astrology, Ayurveda, Birth Doula, Breathwork,
Chiropractic, Counseling, Craniosacral, Dentistry, Energy Healing,
Functional Medicine, Herbalism, Hypnotherapy, Life Coaching,
Lomilomi / Hawaiian Healing, Luminous Practitioner, Massage, Meditation, Midwife,
Nature Therapy, Naturopathic, Nervous System Regulation, Network Chiropractic, Nutrition,
Osteopathic, Physical Therapy, Psychotherapy, Reiki, Somatic Therapy,
Soul Guidance, Sound Healing, TCM (Traditional Chinese Medicine),
Trauma-Informed Care, Watsu / Water Therapy, Yoga

---

## Tier System

| Tier | Price | Features |
|------|-------|----------|
| free | $0 | Basic listing: name, bio, location, modalities, contact |
| premium | $39/mo | + Retreat posts, social links, working hours, testimonials |
| featured | $129/mo | + Homepage rotation, crown badge, priority in results — 5/island cap |

### Tier management flow
1. **Via payment:** Stripe webhook (`supabase/functions/stripe-webhook/index.ts`) fires on `checkout.session.completed` → calls `syncTierToListings(userId, tier)` which updates `practitioners.tier` + `centers.tier` AND upserts/deletes `featured_slots` rows
2. **Via admin override:** `useSetListingTier` mutation in `src/hooks/useAdmin.ts` — updates listing tier + manages `featured_slots` atomically using `supabaseAdmin`

### Stripe price IDs (live mode, account T47YY)
Defined in `src/lib/stripe.ts`:
- `STRIPE_PRICES.PREMIUM_MONTHLY` — Premium $39/mo
- `STRIPE_PRICES.FEATURED_MONTHLY` — Featured $129/mo
- No yearly plans exist

### Stripe edge functions
- `supabase/functions/create-checkout-session/index.ts` — requires auth JWT, validates priceId starts with `price_`, validates same-origin URLs
- `supabase/functions/stripe-webhook/index.ts` — verifies Stripe signature, handles checkout.session.completed / subscription.updated / subscription.deleted

---

## Key Hooks Reference

| Hook | File | Purpose |
|------|------|---------|
| `useAdmin` | `src/hooks/useAdmin.ts` | All admin mutations — practitioners, centers, retreats, articles, flags |
| `useSetListingTier` | `src/hooks/useAdmin.ts` | Set tier on listing + manage featured_slots |
| `useAccounts` | `src/hooks/useAccounts.ts` | All user accounts, subscription status, linked listings |
| `useMyPractitioner` | `src/hooks/useMyPractitioner.ts` | Provider's own practitioner profile CRUD + `uploadMyPhoto()` |
| `useStripe` | `src/hooks/useStripe.ts` | `useCreateCheckoutSession`, `useMyBillingProfile`, `PLAN_OPTIONS` |
| `useListingFlags` | `src/hooks/useListingFlags.ts` | Flag listings for review |
| `usePractitioners` | `src/hooks/usePractitioners.ts` | Public directory fetch with island filter |
| `useCenters` | `src/hooks/useCenters.ts` | Public directory fetch for centers |
| `useArticles` / `useArticleBySlug` | `src/hooks/useArticles.ts` | Blog article fetch |

### Important: `supabaseAdmin` is server-only
`src/lib/supabaseAdmin.ts` — after security audit, the service role key is **not** available in the browser. `supabaseAdmin` returns null client-side. It is only used in Supabase Edge Functions and should stay that way. Admin mutations that need service role should go through edge functions, not client hooks.

---

## Auth Flow

- **Magic link** is the primary sign-in method (`supabase.auth.signInWithOtp`)
- Password sign-in is available as a secondary toggle
- **Plan intent persistence:** `localStorage.setItem('pendingPlan', priceId)` before auth redirect; `DashboardHome` checks on mount and fires checkout automatically
- After login, redirect priority: pendingPlan → claimId → redirectTo param → /dashboard

---

## Google Maps Pipeline

### Purpose
Ingests wellness listings from Google Maps into the DB as `draft` records for admin review.

### Environment variable required
```
GM_API_KEY=<your Google Places API key>   # in .env (not .env.local)
```

### Full pipeline run (from `pipeline/` directory)
```bash
cd pipeline
bash scripts/run_gm_pipeline.sh --island big_island
# or: --island maui | oahu | kauai
# add --dry-run to test without writing to DB
```

### Step-by-step breakdown
| Script | Input | Output | What it does |
|--------|-------|--------|--------------|
| `09_gm_search.py` | island arg | `gm_place_ids.jsonl` | Text Search for modality × city combos → collect Place IDs |
| `10_gm_details.py` | `gm_place_ids.jsonl` | `gm_raw.jsonl` | Fetch full Place Details for each ID (resumes automatically) |
| `11_gm_classify.py` | `gm_raw.jsonl` | `gm_classified.jsonl` | Classify as practitioner/center, map Google types → modalities |
| `12_gm_dedup.py` | `gm_classified.jsonl` + Supabase DB | `gm_new.jsonl`, `gm_enrichments.jsonl`, `gm_review.jsonl` | Deduplicate against existing DB records |
| `13_gm_upsert.py` | `gm_new.jsonl`, `gm_enrichments.jsonl` | Supabase DB | Insert new as `draft`, enrich existing blanks only |

### Deduplication logic (any ONE signal = duplicate)
1. Phone number match (10-digit normalized, strip country code)
2. Website domain match (strip protocol / www / trailing slash)
3. Fuzzy name match (≥ 85% similarity, same island) via `SequenceMatcher`

### After running
New records land in DB as `status = 'draft'`, `tier = 'free'`, `owner_id = null`.
Review and publish from **Admin panel → Practitioners or Centers tab**.

### Google Places API fields fetched (cost-conscious)
`place_id, name, formatted_address, formatted_phone_number, website, url, geometry, opening_hours, types, rating, user_ratings_total, business_status, photos`

### Google Maps API endpoints used
- Text Search: `https://maps.googleapis.com/maps/api/place/textsearch/json`
- Place Details: `https://maps.googleapis.com/maps/api/place/details/json`

---

## Website Enrichment Pipeline (script 22)

### Purpose
Crawls existing listing websites to fill blank fields: email, phone, bio/description (≤100 words), avatar photo (og:image), and modalities.

### Usage
```bash
cd pipeline

# Crawl Big Island listings, save to website_enrichments.jsonl (review first)
python scripts/22_website_enrich.py --island big_island

# Limit to N listings (useful for testing)
python scripts/22_website_enrich.py --island big_island --limit 50

# Preview without writing any files
python scripts/22_website_enrich.py --dry-run

# Crawl AND apply to DB in one step
python scripts/22_website_enrich.py --island big_island --apply
```

### How it works
1. Fetches all listings for the island that have a `website_url` but are missing ≥1 of: email, phone, bio/description (<10 words), avatar_url, modalities
2. Crawls each homepage; tries `/contact` page as fallback for email
3. Extracts: email from `mailto:` links + regex; phone from `tel:` links + regex; bio from `og:description` → meta description → first 100-word paragraph; photo from `og:image` → `twitter:image` → first substantial `<img>`; modalities via keyword matching
4. Saves results to `pipeline/output/website_enrichments.jsonl`
5. Never overwrites existing data — only fills blank fields

### Typical results
~85–90% hit rate on listings with working websites. Avatar photos come from og:image (Squarespace, Wix, WordPress sites all expose this). Some avatar_url values may be logos — review before applying.

### Apply saved enrichments to DB (if not using --apply flag)
```python
# Apply from the saved JSONL
import json
from src.supabase_client import client

with open('output/website_enrichments.jsonl') as f:
    for line in f:
        r = json.loads(line)
        patch = {k: v for k, v in r.items() if not k.startswith('_')}
        client.table(r['_db_table']).update(patch).eq('id', r['_db_id']).execute()
```

---

## Web Crawl Pipeline (original/fallback pipeline)

```bash
cd pipeline
bash scripts/run_pipeline.sh [--dry-run]
```

Steps: Brave search (00) → seed URLs (01) → crawl pages (03) → extract entities (04) → normalize (05) → extract images (06) → download images (07) → upload + upsert (08)

Less reliable than GM pipeline for finding new listings. Use GM pipeline preferentially.

---

## Admin Panel Structure

Route: `/admin` (protected by `AdminProtectedRoute`)

Tabs:
1. **Practitioners** — list, search, edit (with tier override), delete, add
2. **Centers** — list, search, edit (with tier override), delete, add
3. **Retreats** — manage retreat listings
4. **Articles** — manage blog articles
5. **Flags** — review user-submitted listing reports
6. **Accounts** — view all user accounts, subscription tiers, linked listings, featured slot overview per island

### Tier override in admin
Both Edit Practitioner and Edit Center dialogs have a **Subscription Tier** Select dropdown. Changing it immediately calls `setListingTier.mutate()` — no save button needed. This atomically updates the listing's tier AND creates/removes a `featured_slots` row.

---

## File Structure (key locations)

```
src/
  pages/
    admin/AdminPanel.tsx         — admin UI (large, ~2800 lines)
    dashboard/
      DashboardHome.tsx          — onboarding + pending checkout resume
      DashboardProfile.tsx       — provider profile editor (island, modalities, photo)
      DashboardBilling.tsx       — subscription management
    Auth.tsx                     — magic link + password sign-in
    ListYourPractice.tsx         — pricing/signup page
    Directory.tsx                — public directory with filters
    PrivacyPolicy.tsx            — /privacy-policy
    TermsOfService.tsx           — /terms-of-service
    HelpCenter.tsx               — /help (FAQ accordion)
  hooks/
    useAdmin.ts                  — all admin mutations
    useMyPractitioner.ts         — provider's own profile
    useStripe.ts                 — checkout + billing hooks
    useAccounts.ts               — account management
    useListingFlags.ts           — listing flag/report system
  lib/
    stripe.ts                    — STRIPE_PRICES constants
    supabaseAdmin.ts             — service-role client (server-only, null in browser)
  components/
    layout/Footer.tsx            — sitewide footer
    AdminProtectedRoute.tsx      — admin route guard
supabase/
  functions/
    create-checkout-session/     — Stripe checkout edge function
    stripe-webhook/              — Stripe event handler
  migrations/
    20260305000000_listing_flags.sql
    20260305000001_user_profiles.sql
    20260305000002_featured_slots.sql
pipeline/
  scripts/                       — all Python pipeline scripts (00–20)
  src/
    config.py                    — OUTPUT_DIR, island town lists, city config
    supabase_client.py           — Supabase client for pipeline
  output/                        — intermediate JSONL files
```

---

## Search/Taxonomy Rebuild (Sprint 1–4 complete, Sprint 5 pending)

### New tables (migrations in `supabase/migrations/20260310*`)
- `taxonomy_axes` — 7 axes: modality, concern, approach, provider_type, format, audience, geography
- `taxonomy_terms` — ~130 terms with parent-child hierarchy for modalities
- `taxonomy_aliases` — ~315 aliases for fuzzy matching
- `taxonomy_relationships` — ~256 cross-axis edges (modality→treats→concern, modality→related→approach) with strength scores
- `listing_modalities`, `listing_concerns`, `listing_approaches`, `listing_formats`, `listing_audiences` — join tables
- Added `search_tsv tsvector` + `search_embedding vector(384)` + `profile_completeness int` columns to practitioners/centers

### New hooks
- `useAliasMap()` — loads all taxonomy terms+aliases, builds client-side `AliasMap` (Map<string, TaxonomyTerm>), staleTime: Infinity
- `useSearchListings(params, enabled)` — calls `search_listings` Supabase RPC
- `useParsedSearch(rawQuery)` — alias map + parser → `SearchIntent`
- `useDirectorySearch(filters)` — bridge hook connecting old filter UI to new search RPC
- `useTaxonomyFacets()` — grouped modality parents/children for faceted UI

### SearchBar autocomplete
`src/components/SearchBar.tsx` now has a taxonomy-powered autocomplete dropdown on the "What?" input. Uses `useAliasMap()` for client-side filtering (no extra DB calls). Grouped by axis. Max 8 suggestions. 200ms debounce. Arrow key navigation.

### Feature flag
`VITE_USE_NEW_SEARCH` — set to `'false'` to revert to old client-side search in Directory.tsx. Default is new search enabled.

### Match explanation labels
`Provider` type now has optional `matchedConcerns?: string[]` and `matchedApproaches?: string[]`. ProviderCard shows "Helps with: ..." and "Approach: ..." when available (new search only).

### Key file: `src/lib/parseSearchQuery.ts`
Client-side query parser: tokenize → geography detection → stop word removal → n-gram alias matching → residual freeText. Returns `SearchIntent` with modalities/concerns/approaches as term IDs + island/city.

### Key RPC: `search_listings`
14-parameter hybrid search: FTS (30%) + embedding (20%) + taxonomy overlap (20%) + completeness (10%) + tier (10%) + freshness (10%). Paginated. Returns total_count.

### Pipeline scripts (in `pipeline/scripts/`)
- `30_backfill_taxonomy.py` — 5-step backfill: modalities→joins, infer concerns, bio-scan approaches, session_type→formats, center_type→provider_type
- `31_rebuild_search_docs.py` — touches all rows to fire tsvector triggers + runs profile completeness
- `32_generate_embeddings.py` — generates 384-dim embeddings
- `run_backfill.sh` — orchestrator

### Sprint 5 TODO
- Apply all migration files (000000–000007) to Supabase via dashboard SQL editor
- Run backfill pipeline (`pipeline/scripts/run_backfill.sh`)
- QA: test search on all 4 islands, verify autocomplete, check map
- Tuning: adjust composite score weights based on real results
- Documentation

### Sprint 5 DONE
- ✅ lat/lng added to `search_listings` RPC return + TypeScript types + Directory adapter
- ✅ Build passes cleanly

---

## Common Gotchas

- **`modalities` is `text[]`** (Postgres array), not a comma-separated string. Always handle as array in TypeScript and pass as array to Supabase.
- **Island default is `'big_island'`** — always falls back to this if unset. When adding new listings make sure to set island explicitly.
- **`supabaseAdmin` is null in the browser** — after security audit, the service role key was removed from VITE_ env vars. Any code that calls `supabaseAdmin` client-side will fail silently. Admin mutations that need elevated access must go through Supabase Edge Functions.
- **Photo upload uses regular `supabase` client**, not `supabaseAdmin`. Bucket is `images`. Path format: `practitioners/{timestamp}-{random}.{ext}`.
- **Featured slots 5-per-island cap** is enforced by a Postgres trigger (`check_featured_slot_limit`). Inserting a 6th slot will throw a DB error — handle gracefully.
- **Stripe keys are live mode** (account T47YY) — be careful running checkout flows locally as real charges will occur.
- **Magic link OTP** expires after 60 minutes. Users hitting expired links should be prompted to request a new one.
- **`pendingPlan` localStorage key** must be validated against a whitelist of known price IDs before acting on it (security: prevents open redirect abuse).
- **Hero images for Maui/Oahu/Kauai** are local public assets with spaces in filenames — use URL-encoded paths (`/maui%20hero.jpg` etc.) in `heroImageUrl` config.
- **AdminPanel.tsx is ~2800+ lines** — always use offset/limit when reading it, or grep for specific sections.
- **Supabase client import path is `@/lib/supabase`** — NOT `@/integrations/supabase/client`. The latter doesn't exist and will cause build failures.
- **LM Studio host for qwen** is `LM_HOST=192.168.68.65` (user's current network). Always pass this env var when calling `lm_code.py`.
- **Qwen limitations**: Works well for focused, spec-driven tasks (new hooks, type additions). Fails badly on "preserve existing code and modify" tasks (rewrites UI from scratch instead of patching). For complex refactors, write directly.

---

## Local LLM via LM Studio (`lm_code.py`)

### What it is
`lm_code.py` (project root) delegates coding tasks to a locally-running LM Studio model over its OpenAI-compatible REST API. Useful for fast, offline code edits without burning API credits.

### Prerequisites
- **LM Studio** must be running on the host machine with the API server enabled (Settings → Developer → Start Server)
- Default host: `192.168.64.1` (the Mac host IP reachable from the Linux VM) · Default port: `1234`
- Models used: `qwen/qwen3-coder-30b` (default, best for code), `qwen/qwen3-8b` (faster/lighter)

### Environment variables (optional overrides)
```bash
LM_HOST=192.168.64.1   # host where LM Studio is running
LM_PORT=1234           # LM Studio API port
LM_MODEL=qwen/qwen3-coder-30b
```

### Common usage
```bash
# Ask a question (prints answer, writes nothing)
python lm_code.py "What does useSetListingTier do?"

# Edit one file — model rewrites and saves it in place
python lm_code.py "Add a loading spinner to ProviderCard" src/components/ProviderCard.tsx

# Edit multiple files at once
python lm_code.py "Refactor pagination into usePractitioners" \
  src/hooks/usePractitioners.ts src/pages/Directory.tsx

# Read task from a file (useful for long prompts)
python lm_code.py --task-file task.txt src/pages/Directory.tsx

# Use a different model for this run
python lm_code.py --model qwen/qwen3-8b "Quick fix: ..." src/pages/Auth.tsx

# Print output without writing files (dry-run / review first)
python lm_code.py --print-only "Refactor X" src/components/Foo.tsx

# List models currently loaded in LM Studio
python lm_code.py --list-models
```

### How it works internally
1. Reads each file passed as an argument into a `=== FILE: path ===` block
2. Sends a single chat completion request to `http://{LM_HOST}:{LM_PORT}/v1/chat/completions`
3. System prompt instructs the model to output **only** complete updated file contents, no markdown fences
4. Parses `=== FILE: path ===` separators in the response to write multiple files
5. Falls back to printing if no files were specified or `--print-only` was passed
6. Temperature is fixed at `0.2` (deterministic, low creativity) — good for code edits

### Switching models
| Model | Use case |
|-------|----------|
| `qwen/qwen3-coder-30b` | Default — best code quality, handles large files well |
| `qwen/qwen3-8b` | Faster responses, good for small targeted edits |

To permanently change the default, update `LM_MODEL` in the script or export it in your shell before running.

---

## Workflow & Agent Behaviour

### Workflow Orchestration

**Plan Node Default**
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

**Subagent Strategy**
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

**Self-Improvement Loop**
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules that prevent the same mistake from recurring
- Ruthlessly iterate on these lessons until mistake rate drops
- Review `tasks/lessons.md` at session start for relevant patterns

**Verification Before Done**
- Never mark a task complete without proving it works
- Diff behaviour between main and changed code when relevant
- Ask: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

**Demand Elegance (Balanced)**
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

**Autonomous Bug Fixing**
- When given a bug report: just fix it — don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user

### Task Management

1. **Plan First** — write plan to `tasks/todo.md` with checkable items
2. **Verify Plan** — check in before starting implementation
3. **Track Progress** — mark items complete as you go
4. **Explain Changes** — high-level summary at each step
5. **Document Results** — add review section to `tasks/todo.md`
6. **Capture Lessons** — update `tasks/lessons.md` after corrections

### Core Principles

- **Simplicity First** — make every change as simple as possible; impact minimal code
- **No Laziness** — find root causes; no temporary fixes; senior developer standards
- **Minimal Impact** — changes should only touch what's necessary; avoid introducing bugs
