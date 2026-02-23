-- ============================================================
-- Vinland Learning — PostgreSQL + pgvector schema
-- Run once against your database to initialise everything.
-- ============================================================

-- 1. Enable the pgvector extension (needs superuser on first run)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Sessions — one row per YouTube video or uploaded PDF
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT        NOT NULL DEFAULT '',
    source_type TEXT        NOT NULL CHECK (source_type IN ('youtube', 'pdf')),
    content     TEXT        NOT NULL,      -- full extracted text (up to 60 KB)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Documents — text chunks with 768-dim Gemini embeddings
CREATE TABLE IF NOT EXISTS documents (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER     NOT NULL DEFAULT 0,
    source_type TEXT,
    title       TEXT,
    content     TEXT        NOT NULL,
    embedding   VECTOR(768),               -- text-embedding-004 produces 768 dims
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes
--    IVFFlat for approximate nearest-neighbour search (fast at scale)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

--    B-tree index to filter by session before doing the vector scan
CREATE INDEX IF NOT EXISTS documents_session_idx
    ON documents (session_id);

-- ============================================================
-- That's it!  The application creates/updates rows at runtime.
-- No stored procedures needed — vector search is done in Python
-- via asyncpg using the <=> cosine-distance operator.
-- ============================================================
