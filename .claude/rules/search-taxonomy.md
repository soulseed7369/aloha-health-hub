# Search / Taxonomy Rebuild

Sprints 1–4 complete. Sprint 5 partially complete (see status below).

---

## New DB Tables

Migrations in `supabase/migrations/20260310*` — apply via Supabase dashboard SQL editor (all 000000–000007).

- `taxonomy_axes` — 7 axes: modality, concern, approach, provider_type, format, audience, geography
- `taxonomy_terms` — ~130 terms with parent-child hierarchy
- `taxonomy_aliases` — ~315 aliases for fuzzy matching
- `taxonomy_relationships` — ~256 cross-axis edges (modality→treats→concern, modality→related→approach) with strength scores
- `listing_modalities`, `listing_concerns`, `listing_approaches`, `listing_formats`, `listing_audiences` — join tables
- `search_tsv tsvector` + `search_embedding vector(384)` + `profile_completeness int` added to `practitioners` and `centers`

---

## New Hooks

| Hook | Purpose |
|------|---------|
| `useAliasMap()` | Loads all taxonomy terms + aliases → client-side `AliasMap` (`Map<string, TaxonomyTerm>`). `staleTime: Infinity` |
| `useSearchListings(params, enabled)` | Calls `search_listings` Supabase RPC |
| `useParsedSearch(rawQuery)` | Alias map + parser → `SearchIntent` |
| `useDirectorySearch(filters)` | Bridge hook: old filter UI → new search RPC |
| `useTaxonomyFacets()` | Grouped modality parents/children for faceted UI |

---

## SearchBar Autocomplete

`src/components/SearchBar.tsx` — taxonomy-powered autocomplete on the "What?" input. Uses `useAliasMap()` for client-side filtering (no extra DB calls). Grouped by axis. Max 8 suggestions. 200ms debounce. Arrow key navigation.

---

## Feature Flag

`VITE_USE_NEW_SEARCH` — set to `'false'` in `.env` to revert to old client-side search in `Directory.tsx`. Default: new search enabled.

---

## Key Files

**`src/lib/parseSearchQuery.ts`** — client-side query parser: tokenize → geography detection → stop word removal → n-gram alias matching → residual freeText. Returns `SearchIntent` with modalities/concerns/approaches as term IDs + island/city.

**`search_listings` RPC** — 14-parameter hybrid search: FTS (30%) + embedding (20%) + taxonomy overlap (20%) + completeness (10%) + tier (10%) + freshness (10%). Paginated. Returns `total_count`. Also returns `lat`/`lng` for map display.

**Match explanation labels** — `Provider` type has optional `matchedConcerns?: string[]` and `matchedApproaches?: string[]`. `ProviderCard` shows "Helps with: ..." and "Approach: ..." when present (new search only).

---

## Backfill Pipeline Scripts

In `pipeline/scripts/`:

| Script | What it does |
|--------|-------------|
| `30_backfill_taxonomy.py` | 5-step backfill: modalities→joins, infer concerns, bio-scan approaches, session_type→formats, center_type→provider_type |
| `31_rebuild_search_docs.py` | Touches all rows to fire tsvector triggers + computes profile completeness |
| `32_generate_embeddings.py` | Generates 384-dim embeddings |
| `run_backfill.sh` | Orchestrator — run this |

---

## Sprint 5 Status

**Done:**
- ✅ `lat`/`lng` added to `search_listings` RPC return + TypeScript types + Directory adapter
- ✅ Build passes cleanly

**Still TODO:**
- Apply all migration files (000000–000007) via Supabase dashboard SQL editor
- Run backfill pipeline: `pipeline/scripts/run_backfill.sh`
- QA: test search on all 4 islands, verify autocomplete, check map
- Tuning: adjust composite score weights based on real results
- Documentation
