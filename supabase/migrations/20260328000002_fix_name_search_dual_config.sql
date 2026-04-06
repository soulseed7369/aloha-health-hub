-- ============================================================================
-- FIX NAME SEARCH — DUAL TEXT-SEARCH CONFIG + ILIKE FALLBACK
-- ============================================================================

-- Drop existing function first (return type changes in this migration)
DROP FUNCTION IF EXISTS search_listings(text,text,text,integer[],integer[],integer[],integer[],integer[],text,text,boolean,integer,integer,vector);
-- Root cause: GM pipeline sets practitioners.name to the *business* name.
-- Personal names only live in display_name, which is often NULL for imported
-- listings.  Even when populated, the 'english' tsvector config can mangle
-- proper nouns through stemming, making exact-name searches unreliable.
--
-- This migration:
--   1. Updates both search-document triggers to index names with BOTH the
--      'simple' config (preserves proper nouns exactly) AND the existing
--      'english' config (handles stemmed content queries like "healing").
--   2. Replaces the search_listings RPC to:
--      a) Try both 'english' and 'simple' tsquery, take the best rank.
--      b) Add an ILIKE name fallback so name searches always surface results
--         even if tsvector matching fails for any reason.
--   3. Re-backfills search_document for all published listings.
--
-- Preserves: modality sync (20260327000001), embedding_dirty flag,
--            FTS 0.35 / freshness 0.05 weights (20260328000001),
--            strict WHERE clause (20260311000001).
-- ============================================================================

SET search_path TO public, extensions;

-- Ensure embedding_dirty column exists (idempotent)
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS embedding_dirty boolean NOT NULL DEFAULT false;
ALTER TABLE centers        ADD COLUMN IF NOT EXISTS embedding_dirty boolean NOT NULL DEFAULT false;


-- ── 1a. Practitioner trigger ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION build_practitioner_search_document()
RETURNS trigger AS $$
DECLARE
  mod_label        text;
  term_rec         record;
  i                int := 0;
  modality_labels  text;
  concern_labels   text;
  approach_labels  text;
  old_modalities   text;
  name_text        text;
BEGIN

  -- ── Step A: Sync listing_modalities if modalities[] changed ────────────────
  IF TG_OP = 'UPDATE' AND OLD.modalities IS DISTINCT FROM NEW.modalities THEN
    DELETE FROM listing_modalities
      WHERE listing_id = NEW.id AND listing_type = 'practitioner';

    i := 0;
    FOREACH mod_label IN ARRAY COALESCE(NEW.modalities, ARRAY[]::text[])
    LOOP
      SELECT t.id INTO term_rec
        FROM taxonomy_terms t
        JOIN taxonomy_axes a ON a.id = t.axis_id
        WHERE a.slug = 'modality'
          AND lower(t.label) = lower(trim(mod_label))
        LIMIT 1;

      IF NOT FOUND THEN
        SELECT t.id INTO term_rec
          FROM taxonomy_aliases al
          JOIN taxonomy_terms t ON t.id = al.term_id
          JOIN taxonomy_axes a ON a.id = t.axis_id
          WHERE a.slug = 'modality'
            AND lower(al.alias) = lower(trim(mod_label))
          LIMIT 1;
      END IF;

      IF FOUND THEN
        INSERT INTO listing_modalities (listing_id, listing_type, term_id, is_primary)
          VALUES (NEW.id, 'practitioner', term_rec.id, i = 0)
          ON CONFLICT (listing_id, listing_type, term_id) DO NOTHING;
      END IF;
      i := i + 1;
    END LOOP;
  END IF;

  -- ── Step B: Mark embedding as stale ────────────────────────────────────────
  IF (OLD.modalities IS DISTINCT FROM NEW.modalities OR
      OLD.bio        IS DISTINCT FROM NEW.bio        OR
      OLD.name       IS DISTINCT FROM NEW.name       OR
      OLD.city       IS DISTINCT FROM NEW.city) THEN
    NEW.embedding_dirty := true;
  END IF;

  -- ── Step C: Rebuild tsvector ───────────────────────────────────────────────
  SELECT string_agg(t.label, ' ') INTO modality_labels
    FROM listing_modalities lm JOIN taxonomy_terms t ON t.id = lm.term_id
    WHERE lm.listing_id = NEW.id AND lm.listing_type = 'practitioner';

  SELECT string_agg(t.label, ' ') INTO concern_labels
    FROM listing_concerns lc JOIN taxonomy_terms t ON t.id = lc.term_id
    WHERE lc.listing_id = NEW.id AND lc.listing_type = 'practitioner';

  SELECT string_agg(t.label, ' ') INTO approach_labels
    FROM listing_approaches la JOIN taxonomy_terms t ON t.id = la.term_id
    WHERE la.listing_id = NEW.id AND la.listing_type = 'practitioner';

  old_modalities := array_to_string(COALESCE(NEW.modalities, ARRAY[]::text[]), ' ');

  -- Combine all name variants for indexing
  name_text := coalesce(NEW.display_name, '') || ' ' ||
               coalesce(NEW.name, '')         || ' ' ||
               coalesce(NEW.business_name, '');

  NEW.search_document :=
    -- Names with 'simple' config — preserves proper nouns exactly (no stemming)
    setweight(to_tsvector('simple', name_text), 'A') ||
    -- Names + modalities with 'english' config — supports stemmed queries
    setweight(to_tsvector('english',
      name_text || ' ' ||
      coalesce(modality_labels, '') || ' ' ||
      old_modalities
    ), 'A') ||
    setweight(to_tsvector('english',
      coalesce(concern_labels, '') || ' ' ||
      coalesce(approach_labels, '') || ' ' ||
      coalesce(NEW.city, '') || ' ' ||
      coalesce(NEW.island, '')
    ), 'B') ||
    setweight(to_tsvector('english',
      coalesce(NEW.bio, '') || ' ' ||
      coalesce(NEW.search_summary, '')
    ), 'C');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 1b. Center trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION build_center_search_document()
RETURNS trigger AS $$
DECLARE
  mod_label        text;
  term_rec         record;
  i                int := 0;
  modality_labels  text;
  concern_labels   text;
  approach_labels  text;
  old_modalities   text;
BEGIN

  -- ── Step A: Sync listing_modalities if modalities[] changed ────────────────
  IF TG_OP = 'UPDATE' AND OLD.modalities IS DISTINCT FROM NEW.modalities THEN
    DELETE FROM listing_modalities
      WHERE listing_id = NEW.id AND listing_type = 'center';

    i := 0;
    FOREACH mod_label IN ARRAY COALESCE(NEW.modalities, ARRAY[]::text[])
    LOOP
      SELECT t.id INTO term_rec
        FROM taxonomy_terms t
        JOIN taxonomy_axes a ON a.id = t.axis_id
        WHERE a.slug = 'modality'
          AND lower(t.label) = lower(trim(mod_label))
        LIMIT 1;

      IF NOT FOUND THEN
        SELECT t.id INTO term_rec
          FROM taxonomy_aliases al
          JOIN taxonomy_terms t ON t.id = al.term_id
          JOIN taxonomy_axes a ON a.id = t.axis_id
          WHERE a.slug = 'modality'
            AND lower(al.alias) = lower(trim(mod_label))
          LIMIT 1;
      END IF;

      IF FOUND THEN
        INSERT INTO listing_modalities (listing_id, listing_type, term_id, is_primary)
          VALUES (NEW.id, 'center', term_rec.id, i = 0)
          ON CONFLICT (listing_id, listing_type, term_id) DO NOTHING;
      END IF;
      i := i + 1;
    END LOOP;
  END IF;

  -- ── Step B: Mark embedding as stale ────────────────────────────────────────
  IF (OLD.modalities    IS DISTINCT FROM NEW.modalities OR
      OLD.description   IS DISTINCT FROM NEW.description OR
      OLD.name          IS DISTINCT FROM NEW.name       OR
      OLD.city          IS DISTINCT FROM NEW.city) THEN
    NEW.embedding_dirty := true;
  END IF;

  -- ── Step C: Rebuild tsvector ───────────────────────────────────────────────
  SELECT string_agg(t.label, ' ') INTO modality_labels
    FROM listing_modalities lm JOIN taxonomy_terms t ON t.id = lm.term_id
    WHERE lm.listing_id = NEW.id AND lm.listing_type = 'center';

  SELECT string_agg(t.label, ' ') INTO concern_labels
    FROM listing_concerns lc JOIN taxonomy_terms t ON t.id = lc.term_id
    WHERE lc.listing_id = NEW.id AND lc.listing_type = 'center';

  SELECT string_agg(t.label, ' ') INTO approach_labels
    FROM listing_approaches la JOIN taxonomy_terms t ON t.id = la.term_id
    WHERE la.listing_id = NEW.id AND la.listing_type = 'center';

  old_modalities := array_to_string(COALESCE(NEW.modalities, ARRAY[]::text[]), ' ');

  NEW.search_document :=
    -- Names with 'simple' config — preserves proper nouns exactly
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    -- Names + modalities with 'english' config
    setweight(to_tsvector('english',
      coalesce(NEW.name, '') || ' ' ||
      coalesce(modality_labels, '') || ' ' ||
      old_modalities
    ), 'A') ||
    setweight(to_tsvector('english',
      coalesce(concern_labels, '') || ' ' ||
      coalesce(approach_labels, '') || ' ' ||
      coalesce(NEW.city, '') || ' ' ||
      coalesce(NEW.island, '')
    ), 'B') ||
    setweight(to_tsvector('english',
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.search_summary, '')
    ), 'C');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 2. Backfill search_document for ALL published listings ──────────────────
-- Fires the updated triggers so every row gets the dual-config tsvector.
UPDATE practitioners SET updated_at = updated_at WHERE status = 'published';
UPDATE centers       SET updated_at = updated_at WHERE status = 'published';


-- ── 3. Replace search_listings RPC ──────────────────────────────────────────
-- Same signature as 20260311000001 (the live RPC).
-- Changes:
--   • FTS weight 0.35, freshness 0.05 (from 20260328000001)
--   • raw_fts_rank = GREATEST(english_rank, simple_rank) — dual tsquery
--   • Carries display_name + business_name through CTEs for ILIKE fallback
--   • WHERE clause adds OR name_match for belt-and-suspenders safety
CREATE OR REPLACE FUNCTION search_listings(
  p_query          text     DEFAULT '',
  p_island         text     DEFAULT NULL,
  p_city           text     DEFAULT NULL,
  p_modalities     int[]    DEFAULT NULL,
  p_concerns       int[]    DEFAULT NULL,
  p_approaches     int[]    DEFAULT NULL,
  p_formats        int[]    DEFAULT NULL,
  p_audiences      int[]    DEFAULT NULL,
  p_listing_type   text     DEFAULT NULL,
  p_session_type   text     DEFAULT NULL,
  p_accepts_new    boolean  DEFAULT NULL,
  p_page           int      DEFAULT 0,
  p_page_size      int      DEFAULT 20,
  p_embedding      vector(384) DEFAULT NULL
)
RETURNS TABLE (
  id                  uuid,
  listing_type        text,
  name                text,
  bio                 text,
  photo_url           text,
  city                text,
  island              text,
  tier                text,
  modalities          text[],
  session_type        text,
  accepts_new_clients boolean,
  phone               text,
  email               text,
  website_url         text,
  external_booking_url text,
  lat                 float8,
  lng                 float8,
  center_type         text,
  modality_labels     text[],
  concern_labels      text[],
  approach_labels     text[],
  fts_rank            real,
  embedding_score     real,
  taxonomy_score      real,
  composite_score     real,
  profile_completeness int,
  total_count         bigint
) AS $$
WITH

all_listings AS (
  SELECT
    p.id,
    'practitioner'::text AS listing_type,
    p.name,
    p.bio AS bio,
    p.avatar_url AS photo_url,
    p.city,
    p.island,
    p.tier,
    p.modalities,
    p.session_type,
    p.accepts_new_clients,
    p.phone,
    p.email,
    p.website_url,
    p.external_booking_url,
    p.lat,
    p.lng,
    NULL::text AS center_type,
    p.search_document,
    p.search_embedding,
    p.profile_completeness,
    p.updated_at,
    -- Extra columns for name ILIKE fallback (not in RETURNS TABLE)
    p.display_name   AS _display_name,
    p.business_name  AS _business_name
  FROM practitioners p
  WHERE p.status = 'published'
    AND (p_listing_type IS NULL OR p_listing_type = 'practitioner')

  UNION ALL

  SELECT
    c.id,
    'center'::text AS listing_type,
    c.name,
    c.description AS bio,
    c.avatar_url AS photo_url,
    c.city,
    c.island,
    c.tier,
    c.modalities,
    c.session_type,
    NULL::boolean AS accepts_new_clients,
    c.phone,
    c.email,
    c.website_url,
    c.external_website_url AS external_booking_url,
    c.lat,
    c.lng,
    c.center_type,
    c.search_document,
    c.search_embedding,
    c.profile_completeness,
    c.updated_at,
    NULL::text AS _display_name,
    NULL::text AS _business_name
  FROM centers c
  WHERE c.status = 'published'
    AND (p_listing_type IS NULL OR p_listing_type = 'center')
),

filtered AS (
  SELECT l.*
  FROM all_listings l
  WHERE
    (p_island IS NULL OR l.island = p_island)
    AND (p_city IS NULL OR lower(l.city) = lower(p_city))
    AND (p_session_type IS NULL OR l.session_type = p_session_type OR l.session_type = 'both')
    AND (p_accepts_new IS NULL OR l.accepts_new_clients = p_accepts_new)
    AND (p_formats IS NULL OR EXISTS (
      SELECT 1 FROM listing_formats lf
      WHERE lf.listing_id = l.id AND lf.listing_type = l.listing_type
        AND lf.term_id = ANY(p_formats)
    ))
    AND (p_audiences IS NULL OR EXISTS (
      SELECT 1 FROM listing_audiences la
      WHERE la.listing_id = l.id AND la.listing_type = l.listing_type
        AND la.term_id = ANY(p_audiences)
    ) OR NOT EXISTS (
      SELECT 1 FROM listing_audiences la2
      WHERE la2.listing_id = l.id AND la2.listing_type = l.listing_type
    ))
),

scored AS (
  SELECT
    f.*,

    -- FTS rank: best of english and simple tsquery matching
    CASE
      WHEN p_query IS NOT NULL AND p_query != '' AND f.search_document IS NOT NULL
      THEN GREATEST(
        ts_rank_cd(f.search_document, websearch_to_tsquery('english', p_query), 32),
        ts_rank_cd(f.search_document, websearch_to_tsquery('simple',  p_query), 32)
      )
      ELSE 0.0
    END::real AS raw_fts_rank,

    -- Embedding similarity
    CASE
      WHEN p_embedding IS NOT NULL AND f.search_embedding IS NOT NULL
      THEN 1.0 - (f.search_embedding <=> p_embedding)
      ELSE 0.0
    END::real AS raw_embedding_score,

    -- Taxonomy overlap
    (
      COALESCE(
        CASE WHEN p_modalities IS NOT NULL THEN (
          SELECT count(*)::real / array_length(p_modalities, 1)
          FROM listing_modalities lm
          WHERE lm.listing_id = f.id AND lm.listing_type = f.listing_type
            AND lm.term_id = ANY(p_modalities)
        ) ELSE 0.0 END, 0.0
      ) +
      COALESCE(
        CASE WHEN p_concerns IS NOT NULL THEN (
          SELECT count(*)::real / array_length(p_concerns, 1)
          FROM listing_concerns lc
          WHERE lc.listing_id = f.id AND lc.listing_type = f.listing_type
            AND lc.term_id = ANY(p_concerns)
        ) ELSE 0.0 END, 0.0
      ) +
      COALESCE(
        CASE WHEN p_approaches IS NOT NULL THEN (
          SELECT count(*)::real / array_length(p_approaches, 1)
          FROM listing_approaches la
          WHERE la.listing_id = f.id AND la.listing_type = f.listing_type
            AND la.term_id = ANY(p_approaches)
        ) ELSE 0.0 END, 0.0
      )
    ) / GREATEST(
      (CASE WHEN p_modalities IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN p_concerns IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN p_approaches IS NOT NULL THEN 1 ELSE 0 END),
      1
    )::real AS raw_taxonomy_score,

    CASE f.tier
      WHEN 'featured' THEN 1.0
      WHEN 'premium'  THEN 0.5
      ELSE 0.0
    END::real AS tier_boost,

    CASE
      WHEN f.updated_at IS NOT NULL
      THEN GREATEST(0.0, 1.0 - EXTRACT(EPOCH FROM (now() - f.updated_at)) / (180.0 * 86400.0))
      ELSE 0.0
    END::real AS freshness,

    -- Direct name match fallback (catches cases where FTS fails on names)
    CASE
      WHEN p_query IS NOT NULL AND p_query != '' THEN (
        lower(coalesce(f.name, ''))           LIKE '%' || lower(p_query) || '%'
        OR lower(coalesce(f._display_name, '')) LIKE '%' || lower(p_query) || '%'
        OR lower(coalesce(f._business_name, '')) LIKE '%' || lower(p_query) || '%'
      )
      ELSE false
    END AS name_match

  FROM filtered f
),

ranked AS (
  SELECT
    s.*,
    CASE
      WHEN max(s.raw_fts_rank) OVER () > 0
      THEN s.raw_fts_rank / max(s.raw_fts_rank) OVER ()
      ELSE 0.0
    END::real AS norm_fts_rank,

    -- Composite: FTS 0.35, embedding 0.20, taxonomy 0.20,
    --            completeness 0.10, tier 0.10, freshness 0.05
    (
      0.35 * (CASE WHEN max(s.raw_fts_rank) OVER () > 0
               THEN s.raw_fts_rank / max(s.raw_fts_rank) OVER ()
               ELSE 0.0 END)
    + 0.20 * s.raw_embedding_score
    + 0.20 * s.raw_taxonomy_score
    + 0.10 * (COALESCE(s.profile_completeness, 0)::real / 100.0)
    + 0.10 * s.tier_boost
    + 0.05 * s.freshness
    )::real AS final_composite
  FROM scored s
),

with_labels AS (
  SELECT
    r.*,
    (SELECT array_agg(t.label ORDER BY t.label)
     FROM listing_modalities lm JOIN taxonomy_terms t ON t.id = lm.term_id
     WHERE lm.listing_id = r.id AND lm.listing_type = r.listing_type
    ) AS tax_modality_labels,
    (SELECT array_agg(t.label ORDER BY t.label)
     FROM listing_concerns lc JOIN taxonomy_terms t ON t.id = lc.term_id
     WHERE lc.listing_id = r.id AND lc.listing_type = r.listing_type
    ) AS tax_concern_labels,
    (SELECT array_agg(t.label ORDER BY t.label)
     FROM listing_approaches la JOIN taxonomy_terms t ON t.id = la.term_id
     WHERE la.listing_id = r.id AND la.listing_type = r.listing_type
    ) AS tax_approach_labels,
    count(*) OVER () AS total_count
  FROM ranked r
)

SELECT
  w.id,
  w.listing_type,
  w.name,
  w.bio,
  w.photo_url,
  w.city,
  w.island,
  w.tier,
  w.modalities,
  w.session_type,
  w.accepts_new_clients,
  w.phone,
  w.email,
  w.website_url,
  w.external_booking_url,
  w.lat,
  w.lng,
  w.center_type,
  COALESCE(w.tax_modality_labels, '{}'::text[]) AS modality_labels,
  COALESCE(w.tax_concern_labels,  '{}'::text[]) AS concern_labels,
  COALESCE(w.tax_approach_labels, '{}'::text[]) AS approach_labels,
  w.raw_fts_rank AS fts_rank,
  w.raw_embedding_score AS embedding_score,
  w.raw_taxonomy_score AS taxonomy_score,
  w.final_composite AS composite_score,
  COALESCE(w.profile_completeness, 0) AS profile_completeness,
  w.total_count
FROM with_labels w
WHERE
  -- Browse mode: no query, no taxonomy filters → show all
  (
    (p_query IS NULL OR p_query = '')
    AND p_modalities IS NULL
    AND p_concerns IS NULL
    AND p_approaches IS NULL
  )
  -- Taxonomy filter mode: must match requested terms
  OR (
    (p_modalities IS NOT NULL OR p_concerns IS NOT NULL OR p_approaches IS NOT NULL)
    AND (p_query IS NULL OR p_query = '')
    AND w.raw_taxonomy_score > 0
  )
  -- Text search mode: FTS match, taxonomy match, OR direct name match
  OR (
    p_query IS NOT NULL AND p_query != ''
    AND (w.raw_fts_rank > 0 OR w.raw_taxonomy_score > 0 OR w.name_match)
  )
  -- Combined: text + taxonomy filters
  OR (
    p_query IS NOT NULL AND p_query != ''
    AND (p_modalities IS NOT NULL OR p_concerns IS NOT NULL OR p_approaches IS NOT NULL)
    AND (w.raw_fts_rank > 0 OR w.raw_taxonomy_score > 0 OR w.name_match)
  )

ORDER BY
  CASE WHEN (p_query IS NULL OR p_query = '') AND p_modalities IS NULL AND p_concerns IS NULL
       THEN CASE w.tier WHEN 'featured' THEN 0 WHEN 'premium' THEN 1 ELSE 2 END
       ELSE 2 END,
  w.final_composite DESC,
  w.name ASC
OFFSET p_page * p_page_size
LIMIT p_page_size;

$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION search_listings(text, text, text, int[], int[], int[], int[], int[], text, text, boolean, int, int, vector) TO authenticated, anon;
