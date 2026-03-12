# Hawaii Wellness — Search & Taxonomy Rebuild Architecture

**Project:** Hawaii Wellness (hawaiiwellness.net)
**Author:** Opus (lead architect)
**Date:** 2026-03-10
**Status:** Sprint 0 — Architecture & Planning

---

## Table of Contents

1. Current-State Audit Summary
2. Target Architecture Overview
3. Taxonomy / Ontology Design
4. Schema Design
5. Hybrid Search Architecture
6. Ranking & Scoring Model
7. Query Understanding Layer
8. Embeddings Strategy
9. Migration Plan
10. Sprint Plan
11. Delegation Plan
12. Frontend UX Recommendations

---

## 1. Current-State Audit Summary

### What exists today

The current system is a React + Supabase SPA with two listing types (practitioners, centers), a flat `modalities text[]` column, and fully client-side filtering. Search works by fetching all published listings for an island, then matching query tokens against `name + modalities + city` using a custom stemmer and a 354-entry synonym dictionary hardcoded in `Directory.tsx`.

### What works well (preserve)

- **Island-scoped queries** reduce result sets to manageable sizes
- **RLS security model** is clean: public reads published, owners manage own, admin has override
- **Adapter pattern** (`adapters.ts`) decouples DB schema from UI shapes
- **Atomic tier/featured-slot sync** via Stripe webhook + DB trigger
- **React Query hooks** provide clean data-fetching architecture
- **Pipeline ingestion** (Google Maps + website crawl) is functional for bootstrapping data

### What's broken or weak (replace)

| Problem | Severity | Impact |
|---------|----------|--------|
| All filtering is client-side | High | No pagination, no relevance ranking, no scale |
| Single `modalities text[]` column carries all meaning | High | Can't search by concern, approach, audience, or format |
| 354-entry synonym map hardcoded in JS | High | Fragile, requires code deploy to change, no hierarchy |
| Custom 8-rule stemmer | Medium | Misses many morphological variations |
| No relevance scoring | High | "massage" returns results in random alphabetical order |
| Bio excluded from search | Medium | Intentional (prevents false positives) but loses signal |
| No typo tolerance | Medium | "acupuncure" → zero results |
| Tier sort uses text ordering | Bug | `ORDER BY tier DESC` produces wrong order |
| `is_featured` boolean is dead code | Low | Cleanup needed |
| No search analytics | Medium | Can't measure or improve search quality |

### Migration risks

- ~400+ listings exist with current `modalities` array. Must be mapped to new taxonomy.
- ~40% of listings have no modalities set at all. Backfill is critical.
- `centers.modalities` was added late; many center records have it null/empty.
- RLS policies must be carefully preserved — broken RLS = data leak.
- Featured slots trigger must be tested against any schema changes.
- Stripe webhook writes to `practitioners.tier` and `centers.tier` — must continue working.

---

## 2. Target Architecture Overview

### Design principles

1. **Taxonomy is the spine.** Every search axis (modality, concern, approach, audience, format, geography) has a normalized structure in the database.
2. **Embeddings are the intelligence layer.** They enhance discovery but never replace structured search.
3. **Search is server-side.** Postgres full-text search + pgvector, called via Supabase RPC, with deterministic filters and scored ranking.
4. **Search is explainable.** Each result can eventually surface "why this match" signals.
5. **Data quality drives search quality.** Admin tooling makes it easy to enrich listings.
6. **Architecture is portable.** Nothing Hawaii-specific is hardcoded into the taxonomy engine.

### High-level data flow

```
User query
  ↓
Query Understanding Layer (parse intent → structured filters + semantic query)
  ↓
Supabase RPC: search_listings(params)
  ↓
Phase 1: Deterministic filters (island, format, audience, provider_type)
  ↓
Phase 2: Full-text search (ts_rank on search_document tsvector)
  ↓
Phase 3: Embedding similarity (pgvector cosine on search_embedding)
  ↓
Phase 4: Composite ranking (weighted combination of all signals)
  ↓
Return scored, ranked results with match explanation metadata
```

### What changes vs. what stays

| Component | Action |
|-----------|--------|
| `practitioners` table | Keep, add `search_document tsvector`, `search_embedding vector` |
| `centers` table | Keep, add same search columns |
| `modalities text[]` | Keep for backward compatibility, but new taxonomy is source of truth |
| Client-side filtering in Directory.tsx | **Replace** with server-side RPC |
| Synonym map in JS | **Replace** with `taxonomy_terms` + `taxonomy_aliases` tables |
| Custom stemmer | **Replace** with Postgres `english` text search config |
| Homepage search bar | Enhance with query understanding layer |
| Admin panel | Enhance with taxonomy tagging + profile completeness |

---

## 3. Taxonomy / Ontology Design

### Taxonomy axes

Seven search axes, each modeled as a taxonomy:

| Axis | Slug | Examples | Question answered |
|------|------|----------|-------------------|
| Modality | `modality` | Acupuncture, Lomilomi, Reiki, Massage | What method do they practice? |
| Concern | `concern` | Anxiety, Chronic Pain, Grief, Fertility | What does the user need help with? |
| Approach | `approach` | Trauma-informed, Spiritual, Clinical, Gentle | How does the care feel? |
| Provider Type | `provider_type` | Individual Practitioner, Wellness Center, Clinic | Who/what is offering it? |
| Service Format | `format` | In-person, Virtual, Group, Retreat, Workshop | How is it delivered? |
| Audience | `audience` | Adults, Families, Prenatal, Athletes, Visitors | Who is it for? |
| Geography | `geography` | Big Island, Maui, Kona, Hilo, Online | Where can I receive it? |

### Schema: `taxonomy_axes`

```sql
CREATE TABLE taxonomy_axes (
  id          serial PRIMARY KEY,
  slug        text UNIQUE NOT NULL,     -- 'modality', 'concern', 'approach', etc.
  label       text NOT NULL,            -- 'Modality', 'Concern / Need', etc.
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);
```

Seeded with the 7 axes above. Extensible — add "Credential" or "Language" axes later without schema changes.

### Schema: `taxonomy_terms`

```sql
CREATE TABLE taxonomy_terms (
  id          serial PRIMARY KEY,
  axis_id     int NOT NULL REFERENCES taxonomy_axes(id),
  slug        text NOT NULL,            -- 'acupuncture', 'chronic-pain', 'trauma-informed'
  label       text NOT NULL,            -- 'Acupuncture', 'Chronic Pain', 'Trauma-Informed'
  description text,                     -- short explanation for tooltips / guided search
  parent_id   int REFERENCES taxonomy_terms(id),  -- optional hierarchy
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (axis_id, slug)
);

CREATE INDEX idx_taxonomy_terms_axis ON taxonomy_terms(axis_id);
CREATE INDEX idx_taxonomy_terms_parent ON taxonomy_terms(parent_id);
```

### Schema: `taxonomy_aliases`

```sql
CREATE TABLE taxonomy_aliases (
  id          serial PRIMARY KEY,
  term_id     int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  alias       text NOT NULL,            -- 'lomilomi', 'lomi', 'hawaiian massage'
  locale      text NOT NULL DEFAULT 'en',
  UNIQUE (alias, locale)
);

CREATE INDEX idx_taxonomy_aliases_alias ON taxonomy_aliases(alias);
```

This replaces the entire 354-entry JS synonym map. Each alias resolves to a canonical `taxonomy_term`, which belongs to an axis. Multiple aliases can point to the same term.

### Schema: `taxonomy_relationships` (cross-axis associations)

```sql
CREATE TABLE taxonomy_relationships (
  id              serial PRIMARY KEY,
  source_term_id  int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  target_term_id  int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  relationship    text NOT NULL DEFAULT 'related',  -- 'related', 'treats', 'uses', 'requires'
  strength        real NOT NULL DEFAULT 0.5,         -- 0.0–1.0 weight for search boosting
  UNIQUE (source_term_id, target_term_id, relationship)
);
```

Example relationships:
- Acupuncture (modality) → treats → Chronic Pain (concern), strength 0.8
- Lomilomi (modality) → related → Hawaiian Healing (approach), strength 0.9
- Trauma-Informed (approach) → uses → Somatic Therapy (modality), strength 0.7

These relationships power guided search and semantic expansion without needing embeddings.

### Hierarchy support

Some modalities have a natural parent-child structure:

```
Bodywork (parent)
  ├── Massage
  ├── Craniosacral
  ├── Lomilomi / Hawaiian Healing
  ├── Myofascial Release
  └── Watsu / Water Therapy

Energy Work (parent)
  ├── Reiki
  ├── Sound Healing
  ├── Biofield Therapy
  └── Pranic Healing

Mind-Body (parent)
  ├── Yoga
  ├── Breathwork
  ├── Meditation
  └── Somatic Therapy
```

Parents are optional. A term with `parent_id = NULL` is a top-level term. The hierarchy is for UI grouping and browse navigation, not strict classification — a listing can have both a parent and child modality.

### Seed data count estimates

| Axis | Estimated terms |
|------|----------------|
| Modality | 45–55 (current 36 + missing ones like Myofascial, Art Therapy, etc.) |
| Concern | 30–40 (anxiety, chronic pain, grief, fertility, sleep, gut health, etc.) |
| Approach | 15–20 (trauma-informed, spiritual, clinical, gentle, integrative, etc.) |
| Provider Type | 10–12 (individual, center, clinic, retreat, coach, etc.) |
| Service Format | 8–10 (in-person, virtual, group, retreat, workshop, etc.) |
| Audience | 12–15 (adults, families, prenatal, athletes, visitors, etc.) |
| Geography | 50–60 (5 islands + ~50 towns/regions) |

Total aliases: 300–500 (migrated from current synonym map + additions)

---

## 4. Schema Design

### Listing ↔ Taxonomy join tables

Each axis gets a join table linking listings to taxonomy terms:

```sql
-- Generic pattern (one table per axis for clarity + indexing)
CREATE TABLE listing_modalities (
  listing_id    uuid NOT NULL,
  listing_type  text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  term_id       int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  is_primary    boolean NOT NULL DEFAULT false,  -- flag the main modality for display
  PRIMARY KEY (listing_id, listing_type, term_id)
);

CREATE TABLE listing_concerns (
  listing_id    uuid NOT NULL,
  listing_type  text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  term_id       int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, listing_type, term_id)
);

CREATE TABLE listing_approaches (
  listing_id    uuid NOT NULL,
  listing_type  text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  term_id       int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, listing_type, term_id)
);

CREATE TABLE listing_formats (
  listing_id    uuid NOT NULL,
  listing_type  text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  term_id       int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, listing_type, term_id)
);

CREATE TABLE listing_audiences (
  listing_id    uuid NOT NULL,
  listing_type  text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  term_id       int NOT NULL REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, listing_type, term_id)
);
```

### Search columns on listings

Add to both `practitioners` and `centers`:

```sql
ALTER TABLE practitioners ADD COLUMN
  search_document tsvector,              -- composed from name + modalities + concerns + bio + location
  search_embedding vector(384),          -- sentence-transformers/all-MiniLM-L6-v2 (384 dims)
  profile_completeness int DEFAULT 0,    -- 0–100 score
  search_summary text;                   -- AI-generated or template-composed search summary

ALTER TABLE centers ADD COLUMN
  search_document tsvector,
  search_embedding vector(384),
  profile_completeness int DEFAULT 0,
  search_summary text;

CREATE INDEX idx_practitioners_search ON practitioners USING gin(search_document);
CREATE INDEX idx_centers_search ON centers USING gin(search_document);
CREATE INDEX idx_practitioners_embedding ON practitioners USING ivfflat(search_embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX idx_centers_embedding ON centers USING ivfflat(search_embedding vector_cosine_ops) WITH (lists = 50);
```

### Search document composition

The `search_document` tsvector is NOT just a raw bio dump. It's intentionally composed from structured fields with weights:

```sql
-- Trigger function to rebuild search_document on insert/update
CREATE OR REPLACE FUNCTION build_practitioner_search_document()
RETURNS trigger AS $$
DECLARE
  modality_text text;
  concern_text text;
  approach_text text;
BEGIN
  -- Gather taxonomy labels for this listing
  SELECT string_agg(t.label, ' ')
  INTO modality_text
  FROM listing_modalities lm
  JOIN taxonomy_terms t ON t.id = lm.term_id
  WHERE lm.listing_id = NEW.id AND lm.listing_type = 'practitioner';

  SELECT string_agg(t.label, ' ')
  INTO concern_text
  FROM listing_concerns lc
  JOIN taxonomy_terms t ON t.id = lc.term_id
  WHERE lc.listing_id = NEW.id AND lc.listing_type = 'practitioner';

  SELECT string_agg(t.label, ' ')
  INTO approach_text
  FROM listing_approaches la
  JOIN taxonomy_terms t ON t.id = la.term_id
  WHERE la.listing_id = NEW.id AND la.listing_type = 'practitioner';

  NEW.search_document :=
    setweight(to_tsvector('english', coalesce(NEW.display_name, NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(modality_text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(concern_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(approach_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '') || ' ' || coalesce(NEW.island, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.search_summary, '')), 'C');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Weight scheme:**
- **A** (highest): Name, modalities — exact match signals
- **B**: Concerns, approaches, location — intent match signals
- **C** (lowest): Bio, search summary — semantic context (bio is included here with low weight, solving the "exclude bio" problem properly instead of ignoring it)

### Profile completeness scoring

```sql
CREATE OR REPLACE FUNCTION compute_profile_completeness(p practitioners)
RETURNS int AS $$
DECLARE score int := 0;
BEGIN
  IF p.display_name IS NOT NULL OR p.name IS NOT NULL THEN score := score + 10; END IF;
  IF p.bio IS NOT NULL AND length(p.bio) > 30 THEN score := score + 15; END IF;
  IF p.avatar_url IS NOT NULL AND p.avatar_url != '' THEN score := score + 15; END IF;
  IF p.phone IS NOT NULL THEN score := score + 10; END IF;
  IF p.email IS NOT NULL THEN score := score + 10; END IF;
  IF p.website_url IS NOT NULL THEN score := score + 5; END IF;
  IF p.city IS NOT NULL THEN score := score + 10; END IF;
  IF p.lat IS NOT NULL AND p.lng IS NOT NULL THEN score := score + 5; END IF;
  -- Taxonomy richness
  IF EXISTS (SELECT 1 FROM listing_modalities WHERE listing_id = p.id AND listing_type = 'practitioner') THEN score := score + 10; END IF;
  IF EXISTS (SELECT 1 FROM listing_concerns WHERE listing_id = p.id AND listing_type = 'practitioner') THEN score := score + 5; END IF;
  IF EXISTS (SELECT 1 FROM listing_approaches WHERE listing_id = p.id AND listing_type = 'practitioner') THEN score := score + 5; END IF;
  RETURN score;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 5. Hybrid Search Architecture

### Server-side search RPC

Replace client-side filtering with a single Supabase RPC:

```sql
CREATE OR REPLACE FUNCTION search_listings(
  p_query          text DEFAULT '',
  p_island         text DEFAULT NULL,
  p_modalities     int[] DEFAULT NULL,     -- taxonomy term IDs
  p_concerns       int[] DEFAULT NULL,
  p_approaches     int[] DEFAULT NULL,
  p_formats        int[] DEFAULT NULL,
  p_audiences      int[] DEFAULT NULL,
  p_provider_type  text DEFAULT NULL,      -- 'practitioner' | 'center' | NULL (both)
  p_city           text DEFAULT NULL,
  p_session_type   text DEFAULT NULL,
  p_accepts_new    boolean DEFAULT NULL,
  p_page           int DEFAULT 0,
  p_page_size      int DEFAULT 20,
  p_embedding      vector(384) DEFAULT NULL  -- pre-computed query embedding from client
)
RETURNS TABLE (
  id               uuid,
  listing_type     text,
  name             text,
  display_name     text,
  avatar_url       text,
  bio              text,
  city             text,
  island           text,
  tier             text,
  modalities       text[],
  modality_labels  text[],        -- from taxonomy join
  concern_labels   text[],
  approach_labels  text[],
  fts_rank         real,
  embedding_score  real,
  composite_score  real,
  profile_completeness int
) AS $$
-- See Section 6 for full ranking SQL
$$ LANGUAGE sql STABLE;
```

### Query flow

1. **Client calls** `supabase.rpc('search_listings', params)` with parsed filters
2. **RPC function** applies deterministic filters first (island, city, provider_type, format, audience, accepts_new — these are WHERE clauses, not ranking)
3. **Full-text search** scores matching listings against `search_document` tsvector
4. **Embedding similarity** scores against `search_embedding` if `p_embedding` is provided
5. **Composite ranking** combines all signals
6. **Paginated results** returned with explanation metadata

### Deterministic vs. scored filters

| Filter | Type | Behavior |
|--------|------|----------|
| Island | Deterministic | Hard WHERE — never returns off-island results |
| City | Deterministic (free tier) / Bypassed (premium/featured) | Premium/featured appear island-wide |
| Provider type | Deterministic | Hard WHERE if set |
| Session type | Deterministic | Hard WHERE if set |
| Accepts new clients | Deterministic | Hard WHERE if set |
| Modality | **Scored** | Exact taxonomy match boosts rank; partial/related also matches |
| Concern | **Scored** | Taxonomy match boosts rank |
| Approach | **Scored** | Taxonomy match boosts rank |
| Audience | Soft filter | Boosts if matched, doesn't exclude if not tagged |
| Free-text query | **Scored** | FTS rank + embedding similarity |

---

## 6. Ranking & Scoring Model

### Composite score formula

```
composite_score =
    (0.30 × fts_rank_normalized)           -- full-text relevance
  + (0.20 × embedding_similarity)           -- semantic fit
  + (0.20 × taxonomy_match_score)           -- structured axis matches
  + (0.10 × profile_completeness / 100)     -- data quality signal
  + (0.10 × tier_boost)                     -- paid tier influence (capped)
  + (0.10 × freshness_score)               -- recently updated listings
```

### Tier boost (capped, transparent)

```sql
CASE tier
  WHEN 'featured' THEN 0.10   -- max 10% of composite score
  WHEN 'premium'  THEN 0.05
  ELSE 0.00
END
```

Tier influence is intentionally capped at 10% of total score. A featured listing with weak relevance will still rank below a free listing with strong relevance. This is NOT pay-to-win — it's a visibility nudge for paying users.

### Taxonomy match score

When user selects or query-understanding detects specific taxonomy terms:

```
taxonomy_match_score =
  (count of matched modality terms / total requested) × 0.4
+ (count of matched concern terms / total requested)  × 0.3
+ (count of matched approach terms / total requested)  × 0.2
+ (count of matched audience terms / total requested)  × 0.1
```

If no taxonomy filters are active, this component defaults to 0.5 (neutral).

### Freshness score

```sql
CASE
  WHEN updated_at > now() - interval '7 days'  THEN 1.0
  WHEN updated_at > now() - interval '30 days' THEN 0.7
  WHEN updated_at > now() - interval '90 days' THEN 0.4
  ELSE 0.2
END
```

---

## 7. Query Understanding Layer

### Purpose

Map natural language into structured search intent without requiring an LLM at query time.

### Implementation: `parse_search_query` function

Client-side TypeScript function that runs before calling the search RPC:

```typescript
interface SearchIntent {
  rawQuery: string;
  textQuery: string;        // residual text after extraction
  detectedIsland: string | null;
  detectedCity: string | null;
  detectedModalities: number[];    // taxonomy term IDs
  detectedConcerns: number[];
  detectedApproaches: number[];
  detectedAudiences: number[];
  detectedFormats: number[];
}
```

### How it works

1. **Load taxonomy aliases** — on app init, fetch `taxonomy_aliases` + `taxonomy_terms` into a client-side lookup table (cached, ~1KB compressed)
2. **Tokenize query** — split on whitespace, check 1-gram, 2-gram, 3-gram phrases
3. **Match aliases** — each matched alias resolves to a `taxonomy_term` with its axis
4. **Extract geography** — reuse existing `TOWN_TO_ISLAND` and `detectIslandFromText` logic
5. **Residual text** — any tokens that didn't match an alias become the free-text query for FTS
6. **Return structured intent** — passed to `search_listings` RPC

### Example parses

| User types | Parsed intent |
|---|---|
| "gentle body based support for stress near Kona" | concerns: [stress], approaches: [gentle, body-based], city: Kona, island: big_island |
| "something spiritual for grief on Maui" | concerns: [grief], approaches: [spiritual], island: maui |
| "trauma informed women's care Big Island" | approaches: [trauma-informed], audiences: [women], island: big_island |
| "acupuncture Hilo" | modalities: [acupuncture], city: Hilo, island: big_island |
| "fertility support Oahu" | concerns: [fertility], island: oahu |

### Graceful degradation

If query understanding extracts nothing, the full raw query goes to FTS. The system never fails — it just gets less precise.

### Future enhancement

A lightweight LLM rewrite layer can be added later that takes the raw query and returns a cleaned `SearchIntent` JSON. The architecture supports this because the RPC already accepts structured params.

---

## 8. Embeddings Strategy

### Model choice

**`all-MiniLM-L6-v2`** (384 dimensions) — small, fast, good quality for English semantic similarity. Available via:
- Supabase Edge Function calling OpenAI-compatible API
- Local inference via Python `sentence-transformers`
- Future: Supabase's native `pg_vectorize` extension

### What gets embedded

Each listing gets a composed text → embedding:

```
"{name}. {modality labels joined}. {concern labels joined}.
 {approach labels joined}. Serves {audience labels joined}.
 {search_summary or first 200 chars of bio}.
 Located in {city}, {island}."
```

This is stored in `search_embedding vector(384)` on the listing row.

### When embeddings are used

1. **Query fallback**: When FTS returns <5 results, embedding similarity retrieves semantically related listings
2. **"Similar practitioners"**: Profile page shows related listings by embedding distance
3. **Guided search enhancement**: When user selects a concern, related modalities are suggested via embedding clusters
4. **Future: query rewrite**: LLM parses query → embedding → semantic retrieval → re-rank

### When embeddings are NOT used

- Deterministic filters (island, city, format) — always SQL WHERE
- Exact modality search ("acupuncture Hilo") — FTS is precise enough
- Sort-only queries (browsing all listings on an island)

### Embedding pipeline

```
Listing insert/update
  → Trigger or cron: compose search text from structured fields
  → Call embedding API (Edge Function or batch script)
  → Store vector in search_embedding column
  → IVFFlat index auto-updates
```

### Embedding API options (in priority order)

1. **Supabase Edge Function** calling OpenAI `text-embedding-3-small` (1536 dims, would need to adjust) or a hosted `all-MiniLM-L6-v2`
2. **Batch Python script** using `sentence-transformers` locally
3. **Future**: Supabase `pg_vectorize` extension for automatic embedding

### Cost estimate

- ~600 listings × 384-dim vector × 4 bytes = ~1MB storage
- Embedding generation: ~$0.02 total for all listings via OpenAI
- Query embedding: ~$0.0001 per search query
- Negligible cost

---

## 9. Migration Plan

### Phase 1: Schema foundation (non-breaking)

All new tables are additive. Nothing touches existing columns.

1. Create `taxonomy_axes`, `taxonomy_terms`, `taxonomy_aliases`, `taxonomy_relationships`
2. Create `listing_modalities`, `listing_concerns`, `listing_approaches`, `listing_formats`, `listing_audiences`
3. Add `search_document`, `search_embedding`, `profile_completeness`, `search_summary` columns to `practitioners` and `centers`
4. Create indexes
5. Seed taxonomy terms + aliases (migrated from current synonym map + expanded)

**Risk: Zero.** No existing columns are modified. App continues working on old code.

### Phase 2: Data backfill

1. **Map old `modalities text[]` → `listing_modalities`**: Python script reads each listing's modalities array, matches against `taxonomy_terms` by label, inserts join rows
2. **Infer concerns from modalities**: Use `taxonomy_relationships` to auto-tag concerns (e.g., listing with "Acupuncture" gets concern "Chronic Pain" with confidence)
3. **Infer approaches from bio text**: Keyword scan of bio for approach terms (trauma-informed, spiritual, etc.)
4. **Map `session_type` → `listing_formats`**: Direct 1:1 mapping
5. **Map `center_type` → provider_type taxonomy terms**: Direct mapping
6. **Build `search_document` tsvector**: Run trigger function on all listings
7. **Compute `profile_completeness`**: Run scoring function on all listings
8. **Generate embeddings**: Batch script composes text + calls embedding API

**Rollback: Safe.** Old `modalities` column is untouched. If backfill is wrong, delete join table rows and retry.

### Phase 3: Search switchover

1. Deploy `search_listings` RPC function
2. Update `Directory.tsx` to call RPC instead of client-side filtering
3. Update `usePractitioners` / `useCenters` hooks to use new RPC
4. Update `SearchBar` to pass structured params
5. Deploy query understanding layer

**Rollback plan:** Feature flag. If new search is broken, revert to old client-side filtering via a `VITE_USE_NEW_SEARCH=false` env var.

### Phase 4: Admin enrichment

1. Add taxonomy tag editor to practitioner/center edit dialogs
2. Add profile completeness badge
3. Add "suggest tags" button (uses taxonomy_relationships to suggest)
4. Add missing-taxonomy warning indicators

### Phase 5: Cleanup

1. Remove old synonym map from Directory.tsx
2. Remove old stemmer
3. Remove `is_featured` column
4. Consider removing `modalities text[]` once all consumers use join tables (or keep as denormalized cache)

---

## 10. Sprint Plan

### Sprint 0 — Architecture & Planning ← WE ARE HERE

**Deliverables:**
- [x] Current-state audit
- [x] Target architecture document (this file)
- [ ] Taxonomy seed data (JSONL or SQL)
- [ ] First coding task specs for qwen

**Duration:** 1 day

### Sprint 1 — Schema Foundation

**Tasks:**
1. SQL migration: create taxonomy tables (axes, terms, aliases, relationships)
2. SQL migration: create listing join tables (modalities, concerns, approaches, formats, audiences)
3. SQL migration: add search columns to practitioners + centers
4. SQL migration: create search document trigger functions
5. Seed data: insert taxonomy terms + aliases
6. Seed data: insert taxonomy relationships (modality → concern mappings)

**Delegation:** All SQL to qwen. Opus reviews migrations before applying.

**Duration:** 2–3 days

### Sprint 2 — Data Migration & Backfill

**Tasks:**
1. Python script: map old `modalities[]` → `listing_modalities` join rows
2. Python script: infer concerns from modalities via relationships
3. Python script: scan bios for approach keywords
4. Python script: map session_type → listing_formats
5. Python script: map center_type → provider_type terms
6. SQL: rebuild all search_document tsvectors
7. SQL: compute all profile_completeness scores
8. Python script: generate embeddings (batch)

**Delegation:** All scripts to qwen. Opus writes the mapping spec, reviews output.

**Duration:** 2–3 days

### Sprint 3 — Hybrid Search Engine

**Tasks:**
1. SQL RPC: `search_listings` function with FTS + facet filtering
2. SQL RPC: `resolve_query_aliases` function (alias → term lookup for query understanding)
3. TypeScript: `parseSearchQuery` client-side query understanding
4. TypeScript: update hooks to call search RPC
5. Add pgvector embedding similarity to search RPC
6. Add composite ranking formula
7. Test with real queries

**Delegation:** SQL RPCs to qwen. TypeScript query parser to qwen. Opus designs ranking weights and reviews.

**Duration:** 3–4 days

### Sprint 4 — Frontend Integration

**Tasks:**
1. Refactor Directory.tsx to use server-side search
2. Update filter UI: grouped modality facets, concern pills, approach toggles
3. Add guided search flow (concern-first browse)
4. Update SearchBar with autocomplete from taxonomy terms
5. Add result card explanation labels ("Matches: Acupuncture, Chronic Pain")
6. Admin: add taxonomy tag editor to listing edit dialogs
7. Admin: add profile completeness indicator

**Delegation:** UI components to qwen with design specs from Opus.

**Duration:** 3–4 days

### Sprint 5 — QA, Tuning & Documentation

**Tasks:**
1. Relevance test suite: 20 canonical queries with expected results
2. Performance benchmarks: search latency, index sizes
3. Edge case testing: empty queries, misspellings, very long queries
4. Ranking weight tuning based on test results
5. Search analytics: log queries + result counts for future optimization
6. Update CLAUDE.md with new architecture
7. Clean up deprecated code

**Duration:** 2 days

---

## 11. Delegation Plan for qwen/qwen3-coder-30b

### Task sizing rules

- Maximum 1 file per task (ideally)
- Maximum 300 lines of output per task
- Always provide: input spec, expected output format, constraints
- Always review before committing

### Sprint 1 tasks (ready to delegate)

| # | Task | Input | Output | Lines |
|---|------|-------|--------|-------|
| 1.1 | Write taxonomy foundation migration SQL | Schema spec from Section 3 | Single .sql migration file | ~120 |
| 1.2 | Write listing join tables migration SQL | Schema spec from Section 4 | Single .sql migration file | ~60 |
| 1.3 | Write search columns migration SQL | Column spec from Section 4 | Single .sql migration file | ~40 |
| 1.4 | Write search document trigger function SQL | Composition spec from Section 4 | Single .sql migration file | ~80 |
| 1.5 | Write taxonomy seed data SQL (modalities axis) | Current modality list + aliases from synonym map | SQL INSERT statements | ~200 |
| 1.6 | Write taxonomy seed data SQL (concerns axis) | Concern list from Section 3 | SQL INSERT statements | ~100 |
| 1.7 | Write taxonomy seed data SQL (approaches + other axes) | Lists from Section 3 | SQL INSERT statements | ~100 |
| 1.8 | Write taxonomy relationships seed SQL | Modality → concern mappings | SQL INSERT statements | ~150 |

### Sprint 2 tasks (after Sprint 1 is verified)

| # | Task | Input | Output |
|---|------|-------|--------|
| 2.1 | Write modalities backfill Python script | Current modality labels, taxonomy_terms table | Python script |
| 2.2 | Write concerns inference Python script | taxonomy_relationships table | Python script |
| 2.3 | Write bio-scan approach tagging Python script | approach taxonomy terms | Python script |
| 2.4 | Write profile completeness SQL function | Scoring spec from Section 4 | SQL function |
| 2.5 | Write embedding generation Python script | Listing data + embedding API | Python script |

### Sprint 3 tasks

| # | Task | Input | Output |
|---|------|-------|--------|
| 3.1 | Write `search_listings` SQL RPC | Full ranking spec from Section 6 | SQL function |
| 3.2 | Write `resolve_query_aliases` SQL RPC | Alias resolution spec | SQL function |
| 3.3 | Write `parseSearchQuery` TypeScript | Query understanding spec from Section 7 | TS module |
| 3.4 | Write updated search hooks | New RPC signature | TS hooks |

---

## 12. Frontend UX Recommendations

### Guided search flow

Add a "What are you looking for?" landing experience:

```
Step 1: Pick your need
  [Stress & Anxiety] [Pain & Recovery] [Spiritual Growth]
  [Women's Health] [Trauma Healing] [General Wellness]

Step 2: Pick your style (optional)
  [Gentle] [Clinical] [Spiritual] [Body-based]

Step 3: Pick your island
  [Big Island] [Maui] [Oahu] [Kauai]

→ Shows filtered results with explanation labels
```

### Facet grouping in directory

Instead of one flat "Modality" dropdown with 36 options, group into categories:

```
Body
  Massage, Craniosacral, Chiropractic, Physical Therapy, Watsu

Energy & Healing
  Reiki, Sound Healing, Energy Healing

Mind & Spirit
  Meditation, Breathwork, Yoga, Hypnotherapy

Counseling & Therapy
  Psychotherapy, Counseling, Somatic Therapy, Life Coaching

Hawaiian & Indigenous
  Lomilomi, Hawaiian Healing

Medical & Clinical
  Acupuncture, TCM, Naturopathic, Functional Medicine

Birth & Women's
  Birth Doula, Midwife
```

### Result card enhancements

Each result card should show:
- **Match labels**: small pills showing WHY this result matched ("Acupuncture", "Chronic Pain", "Trauma-Informed")
- **Profile completeness**: subtle indicator (complete ✓, partial ◐)
- **Approach tags**: "Gentle", "Spiritual", "Clinical"

### Autocomplete

As user types in search bar, show:
- Matching taxonomy terms (with axis labels): "Acupuncture (modality)", "Chronic Pain (concern)"
- Matching locations: "Kona, Big Island"
- Recent searches (local storage)

### Category browse pages

SEO-friendly landing pages:
- `/big-island/acupuncture` — pre-filtered directory
- `/maui/trauma-healing` — concern-based
- `/oahu/spiritual-guidance` — approach-based
- These are just directory with pre-set filters, not separate pages

---

## Appendix A: Taxonomy Term Seed Data (Draft)

### Modality axis (partial — full list in seed SQL)

```
acupuncture, art-therapy, astrology, ayurveda, birth-doula, breathwork,
chiropractic, counseling, craniosacral, dentistry, energy-healing,
family-constellation, functional-medicine, hawaiian-healing, herbalism,
hypnotherapy, iv-therapy, life-coaching, lomilomi, longevity, massage,
meditation, midwife, myofascial-release, nature-therapy, naturopathic,
nervous-system-regulation, network-chiropractic, nutrition, osteopathic,
physical-therapy, psychic, psychotherapy, reiki, ritualist,
somatic-therapy, soul-guidance, sound-healing, tcm, trauma-informed-care,
watsu, yoga
```

### Concern axis (draft)

```
anxiety, burnout, chronic-pain, depression, digestive-health, fatigue,
fertility, grief, gut-health, headaches-migraines, hormonal-balance,
immune-support, insomnia, joint-pain, life-transitions, loneliness,
menopause, muscle-tension, nervous-system-dysregulation, overwhelm,
postpartum-recovery, prenatal-care, relationship-difficulties,
self-discovery, sexual-health, skin-conditions, spiritual-awakening,
sports-recovery, stress, trauma, weight-management, womens-health
```

### Approach axis (draft)

```
body-based, ceremonial, clinical, compassionate, evidence-informed,
family-centered, gentle, holistic, indigenous, integrative, intuitive,
luxury, performance-oriented, practical, somatic, spiritual,
traditional, trauma-informed
```

---

## Appendix B: Current Synonym Map → Taxonomy Migration

The 354-entry synonym map in `Directory.tsx` maps to this architecture as follows:

| Current synonym entry | New taxonomy alias | Resolves to term (axis) |
|-|-|-|
| `'soul retrieval': 'soul guidance'` | alias "soul retrieval" | soul-guidance (modality) |
| `'anxiety': 'counseling psychotherapy nervous system regulation'` | alias "anxiety" | anxiety (concern) — PLUS modality relationships |
| `'gentle': ...` | alias "gentle" | gentle (approach) |
| `'lomilomi': 'lomilomi hawaiian healing massage'` | alias "lomilomi" | lomilomi (modality) |

The key shift: instead of one synonym expanding to multiple modality names, each alias resolves to ONE canonical term on ONE axis. Cross-axis relationships (acupuncture treats chronic pain) are handled by `taxonomy_relationships`, not by stuffing multiple axis values into one alias.

---

*End of architecture document. This drives Sprint 1 onward.*
