-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT        NOT NULL DEFAULT '',
    source_type TEXT        NOT NULL CHECK (source_type IN ('youtube', 'pdf')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table (chunks + embeddings)
CREATE TABLE IF NOT EXISTS documents (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER     NOT NULL DEFAULT 0,
    source_type TEXT,
    title       TEXT,
    content     TEXT        NOT NULL,
    embedding   VECTOR(768),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS documents_session_idx
    ON documents (session_id);
