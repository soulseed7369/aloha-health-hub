-- Add `title` column to search_listings RPC.
-- practitioners.title was added in 20260405000001 but the RPC was never updated.
-- Centers don't have a title column so we return NULL for them.

SET search_path TO public, extensions;

-- Drop all overloads (return type is changing)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT oid::regprocedure AS sig FROM pg_proc WHERE proname = 'search_listings' LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION search_listings(
  p_query        text        DEFAULT NULL,
  p_island       text        DEFAULT NULL,
  p_city         text        DEFAULT NULL,
  p_modalities   int[]       DEFAULT NULL,
  p_concerns     int[]       DEFAULT NULL,
  p_approaches   int[]       DEFAULT NULL,
  p_formats      int[]       DEFAULT NULL,
  p_audiences    int[]       DEFAULT NULL,
  p_session_type text        DEFAULT NULL,
  p_listing_type text        DEFAULT NULL,
  p_accepts_new  boolean     DEFAULT NULL,
  p_limit        int         DEFAULT 20,
  p_offset       int         DEFAULT 0,
  p_embedding    vector(384) DEFAULT NULL
)
RETURNS TABLE (
  id                  uuid,
  listing_type        text,
  name                text,
  title               text,
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
    p.title,
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
    NULL::text AS title,
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

    CASE
      WHEN p_query IS NOT NULL AND p_query != '' AND f.search_document IS NOT NULL
      THEN GREATEST(
        ts_rank_cd(f.search_document, websearch_to_tsquery('english', p_query), 32),
        ts_rank_cd(f.search_document, websearch_to_tsquery('simple',  p_query), 32)
      )
      ELSE 0.0
    END::real AS raw_fts_rank,

    CASE
      WHEN p_embedding IS NOT NULL AND f.search_embedding IS NOT NULL
      THEN 1.0 - (f.search_embedding <=> p_embedding)
      ELSE 0.0
    END::real AS raw_embedding_score,

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

    CASE
      WHEN p_query IS NOT NULL AND p_query != '' THEN (
        lower(coalesce(f.name, ''))             LIKE '%' || lower(p_query) || '%'
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
  w.title,
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
  (
    (p_query IS NULL OR p_query = '')
    AND p_modalities IS NULL
    AND p_concerns IS NULL
    AND p_approaches IS NULL
  )
  OR (
    (p_modalities IS NOT NULL OR p_concerns IS NOT NULL OR p_approaches IS NOT NULL)
    AND (p_query IS NULL OR p_query = '')
    AND (w.raw_taxonomy_score > 0)
  )
  OR (
    p_query IS NOT NULL AND p_query != ''
    AND (
      w.raw_fts_rank > 0
      OR w.raw_embedding_score > 0.3
      OR w.raw_taxonomy_score > 0
      OR w.name_match
    )
  )
ORDER BY
  w.final_composite DESC,
  w.name ASC
LIMIT  p_limit
OFFSET p_offset;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_listings(text,text,text,int[],int[],int[],int[],int[],text,text,boolean,int,int,vector) TO authenticated, anon;
