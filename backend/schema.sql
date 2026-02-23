-- ============================================================
-- Vinland Learning — PostgreSQL schema (Railway compatible)
-- No pgvector required
-- ============================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT        NOT NULL DEFAULT '',
    source_type TEXT        NOT NULL CHECK (source_type IN ('youtube', 'pdf')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Documents (store embeddings as float array instead of VECTOR)
CREATE TABLE IF NOT EXISTS documents (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER     NOT NULL DEFAULT 0,
    source_type TEXT,
    title       TEXT,
    content     TEXT        NOT NULL,
    embedding   FLOAT8[],              -- 768-dimension embedding stored as array
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index for session filtering
CREATE INDEX IF NOT EXISTS documents_session_idx
    ON documents (session_id);