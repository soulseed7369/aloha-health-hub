-- ============================================================================
-- Cross-Project Memory System (Tier 2 verbatim store)
-- See: tasks/memory-system-plan.md
-- ============================================================================
--
-- This table stores verbatim chunks of transcripts, tasks, lessons, and repo
-- context for semantic + keyword retrieval via the search_memory() RPC.
--
-- Design notes:
--   - Shape is MemPal-inspired: verbatim `content`, with `project`/`wing`/`kind`
--     metadata for filtering and a hybrid score combining cosine + text rank
--     + temporal recency.
--   - 384-dim embeddings match the existing `vector(384)` columns on
--     practitioners/centers, so we can reuse a single embedder on the pipeline
--     side (bge-small-en-v1.5).
--   - HNSW index on the embedding for <100ms top-50 retrieval.
--   - GIN index on the generated tsvector for keyword re-ranking.
--
-- Apply via: Supabase dashboard → SQL editor → paste entire file → run.
-- ============================================================================

set search_path to public, extensions;

create extension if not exists vector;

-- ── memory_chunks ───────────────────────────────────────────────────────────
create table if not exists memory_chunks (
  id             uuid primary key default gen_random_uuid(),
  project        text not null,
  wing           text,
  kind           text not null check (
    kind in ('transcript', 'task', 'lesson', 'decision', 'curated', 'note')
  ),
  source         text,
  speaker        text check (speaker in ('user', 'assistant', 'system', null)),
  content        text not null,
  content_tsv    tsvector generated always as (to_tsvector('english', content)) stored,
  embedding      vector(384),
  session_id     text,
  chunk_index    int,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- Idempotent ingest: (session_id, chunk_index) is the dedup key for
-- transcript-sourced chunks. Nulls are allowed for non-transcript sources.
create unique index if not exists memory_chunks_session_chunk_uniq
  on memory_chunks (session_id, chunk_index)
  where session_id is not null;

-- Create vector index: prefer HNSW (pgvector ≥0.5), fall back to ivfflat
do $$
begin
  begin
    execute 'create index if not exists memory_chunks_embedding_idx
             on memory_chunks using hnsw (embedding vector_cosine_ops)';
  exception when others then
    execute 'create index if not exists memory_chunks_embedding_idx
             on memory_chunks using ivfflat (embedding vector_cosine_ops)
             with (lists = 100)';
  end;
end;
$$;

create index if not exists memory_chunks_tsv_idx
  on memory_chunks using gin (content_tsv);

create index if not exists memory_chunks_project_idx
  on memory_chunks (project);

create index if not exists memory_chunks_kind_idx
  on memory_chunks (kind);

create index if not exists memory_chunks_created_idx
  on memory_chunks (created_at desc);

comment on table memory_chunks is
  'Verbatim chunks of transcripts, tasks, lessons, and repo context for the
   cross-project memory system. Tier 2 of the two-tier memory model — Tier 1
   lives on disk at /sessions/*/mnt/.auto-memory/ as curated markdown files.';

-- ── search_memory() RPC ─────────────────────────────────────────────────────
-- Hybrid retrieval: semantic cosine + keyword rank + temporal recency boost.
-- Formula modeled after MemPal:
--   score = semantic * (1 + kw_weight * keyword_rank) + temporal_weight * recency
-- where semantic is (1 - cosine_distance), keyword_rank is ts_rank, and
-- recency is 1.0 for docs inside `days_back` and 0 otherwise.

create or replace function search_memory(
  q_embedding       vector(384),
  q_text            text,
  q_project         text default null,
  q_kind            text default null,
  q_limit           int default 10,
  days_back         int default null,
  keyword_weight    float default 0.30,
  temporal_weight   float default 0.10,
  candidate_pool    int default 50
)
returns table (
  id uuid,
  project text,
  wing text,
  kind text,
  source text,
  content text,
  session_id text,
  created_at timestamptz,
  semantic_score float,
  keyword_score float,
  temporal_score float,
  score float
)
language sql
stable
as $$
  with candidates as (
    select
      m.id,
      m.project,
      m.wing,
      m.kind,
      m.source,
      m.content,
      m.session_id,
      m.created_at,
      (1.0 - (m.embedding <=> q_embedding))::float                             as semantic,
      coalesce(
        ts_rank(m.content_tsv, plainto_tsquery('english', coalesce(q_text, ''))),
        0.0
      )::float                                                                  as keyword,
      case
        when days_back is not null
             and m.created_at > now() - (days_back || ' days')::interval
          then 1.0::float
        else 0.0::float
      end                                                                       as temporal
    from memory_chunks m
    where (q_project is null or m.project = q_project)
      and (q_kind    is null or m.kind    = q_kind)
      and m.embedding is not null
    order by m.embedding <=> q_embedding
    limit candidate_pool
  )
  select
    id, project, wing, kind, source, content, session_id, created_at,
    semantic as semantic_score,
    keyword  as keyword_score,
    temporal as temporal_score,
    (semantic * (1.0 + keyword_weight * keyword) + temporal_weight * temporal)::float as score
  from candidates
  order by score desc
  limit q_limit;
$$;

comment on function search_memory is
  'Hybrid semantic + keyword + temporal retrieval over memory_chunks.
   Pulls top `candidate_pool` by cosine distance, re-scores with keyword
   rank and temporal recency, returns top `q_limit`.';

-- ── RLS (permissive — single user, service role ingests) ───────────────────
alter table memory_chunks enable row level security;

-- Allow the authenticated user to read their own memory (future multi-user).
-- For MVP, service role does all writes and reads via the pipeline/MCP server.
drop policy if exists memory_chunks_service_all on memory_chunks;
create policy memory_chunks_service_all
  on memory_chunks
  for all
  to service_role
  using (true)
  with check (true);
