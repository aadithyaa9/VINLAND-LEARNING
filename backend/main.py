import os
import json
import asyncio
import re
import subprocess
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

import httpx
import asyncpg
import fitz  # PyMuPDF
import google.generativeai as genai
import uuid

# ─── Config ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DATABASE_URL   = os.getenv("DATABASE_URL", "")

genai.configure(api_key=GEMINI_API_KEY)
gen_model  = genai.GenerativeModel("gemini-2.5-flash")
EMBED_MODEL = "models/text-embedding-004"
EMBED_DIM   = 768

# ─── DB pool ─────────────────────────────────────────────────────────────────
db_pool: asyncpg.Pool | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(
        DATABASE_URL, min_size=2, max_size=10, command_timeout=60
    )
    await _init_schema()
    print("[db] Schema ready")
    yield
    await db_pool.close()

async def _init_schema():
    async with db_pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                title       TEXT        NOT NULL DEFAULT '',
                source_type TEXT        NOT NULL CHECK (source_type IN ('youtube','pdf')),
                content     TEXT        NOT NULL,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS documents (
                id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id  TEXT        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                chunk_index INTEGER     NOT NULL DEFAULT 0,
                source_type TEXT,
                title       TEXT,
                content     TEXT        NOT NULL,
                embedding   VECTOR({EMBED_DIM}),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS documents_embedding_idx
            ON documents USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS documents_session_idx
            ON documents (session_id);
        """)

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Vinland Learning API", version="2.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models ─────────────────────────────────────────────────────────
class VideoRequest(BaseModel):
    url: str
    session_id: Optional[str] = None

class FlashcardRequest(BaseModel):
    session_id: str

class QuizRequest(BaseModel):
    session_id: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: Optional[List[dict]] = []

# ─── Helpers ─────────────────────────────────────────────────────────────────
def extract_video_id(url: str) -> str:
    for pattern in [
        r'(?:v=)([A-Za-z0-9_-]{11})',
        r'(?:youtu\.be/)([A-Za-z0-9_-]{11})',
        r'(?:embed/)([A-Za-z0-9_-]{11})',
        r'(?:shorts/)([A-Za-z0-9_-]{11})',
    ]:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    raise ValueError("Could not extract a YouTube video ID from the URL")

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + chunk_size]))
        i += chunk_size - overlap
    return [c for c in chunks if c.strip()]

async def get_embedding(text: str) -> List[float]:
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: genai.embed_content(
            model=EMBED_MODEL,
            content=text,
            task_type="retrieval_document",
        )
    )
    return result["embedding"]

# ─── Transcript strategies ───────────────────────────────────────────────────

def _fetch_via_transcript_api(video_id: str) -> Optional[str]:
    """Strategy 1: youtube-transcript-api — tries all available transcripts."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

        # Try English first, then any language
        for lang_codes in (['en'], None):
            try:
                if lang_codes:
                    data = YouTubeTranscriptApi.get_transcript(video_id, languages=lang_codes)
                else:
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                    # pick the first available (manual or generated)
                    transcript = next(iter(transcript_list))
                    data = transcript.fetch()
                text = " ".join(t.get("text", "") for t in data)
                if text.strip():
                    print(f"[transcript] strategy 1 (transcript-api) succeeded")
                    return text.strip()
            except (TranscriptsDisabled, NoTranscriptFound):
                break
            except Exception as e:
                print(f"[transcript] strategy 1 lang={lang_codes} error: {e}")
                continue
    except Exception as e:
        print(f"[transcript] strategy 1 import/outer error: {e}")
    return None


def _fetch_via_ytdlp(video_id: str) -> Optional[str]:
    """Strategy 2: yt-dlp — downloads the auto-subtitle .vtt and parses it."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            out_template = os.path.join(tmpdir, "sub")
            cmd = [
                "yt-dlp",
                "--skip-download",
                "--write-auto-sub",
                "--write-sub",
                "--sub-lang", "en",
                "--sub-format", "vtt",
                "--convert-subs", "vtt",
                "-o", out_template,
                f"https://www.youtube.com/watch?v={video_id}",
            ]
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=60
            )
            print(f"[transcript] yt-dlp stdout: {result.stdout[-300:]}")
            print(f"[transcript] yt-dlp stderr: {result.stderr[-300:]}")

            # Find the .vtt file
            vtt_path = None
            for fname in os.listdir(tmpdir):
                if fname.endswith(".vtt"):
                    vtt_path = os.path.join(tmpdir, fname)
                    break

            if not vtt_path:
                print("[transcript] strategy 2 — no .vtt file written")
                return None

            with open(vtt_path, "r", encoding="utf-8") as f:
                vtt = f.read()

            # Parse VTT: strip timestamps and de-duplicate lines
            lines, seen = [], set()
            for line in vtt.splitlines():
                line = line.strip()
                # Skip header, timestamps, empty lines, position tags
                if (not line or line.startswith("WEBVTT") or
                        "-->" in line or line.startswith("NOTE") or
                        re.match(r'^\d+$', line)):
                    continue
                # Strip inline VTT tags like <00:00:00.000><c>
                line = re.sub(r'<[^>]+>', '', line).strip()
                if line and line not in seen:
                    seen.add(line)
                    lines.append(line)

            text = " ".join(lines)
            if text.strip():
                print("[transcript] strategy 2 (yt-dlp) succeeded")
                return text.strip()
    except subprocess.TimeoutExpired:
        print("[transcript] strategy 2 — yt-dlp timed out")
    except Exception as e:
        print(f"[transcript] strategy 2 error: {e}")
    return None


def _fetch_via_gemini_url(video_id: str) -> Optional[str]:
    """Strategy 3: ask Gemini to summarise/transcribe from the YouTube URL directly."""
    try:
        print("[transcript] strategy 3 — asking Gemini to extract content from URL")
        prompt = (
            f"Please watch this YouTube video and provide a detailed transcript or "
            f"comprehensive summary of everything said in it. Include all key information, "
            f"examples, and explanations.\n\n"
            f"Video URL: https://www.youtube.com/watch?v={video_id}"
        )
        response = gen_model.generate_content(prompt)
        text = response.text.strip()
        if len(text) > 200:
            print("[transcript] strategy 3 (Gemini URL) succeeded")
            return text
    except Exception as e:
        print(f"[transcript] strategy 3 error: {e}")
    return None


async def get_transcript(video_id: str) -> str:
    """Try all strategies in order, return first that works."""
    loop = asyncio.get_event_loop()

    # Strategy 1: youtube-transcript-api
    text = await loop.run_in_executor(None, lambda: _fetch_via_transcript_api(video_id))
    if text:
        return text

    # Strategy 2: yt-dlp subtitle download
    text = await loop.run_in_executor(None, lambda: _fetch_via_ytdlp(video_id))
    if text:
        return text

    # Strategy 3: Gemini direct URL understanding
    text = await loop.run_in_executor(None, lambda: _fetch_via_gemini_url(video_id))
    if text:
        return text

    raise HTTPException(
        status_code=400,
        detail=(
            "Could not extract transcript from this video. "
            "Ensure the video has captions/subtitles enabled, "
            "or try a different video."
        )
    )

# ─── DB helpers ──────────────────────────────────────────────────────────────
async def upsert_session(session_id: str, content: str, source_type: str, title: str):
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO sessions (id, content, source_type, title)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE
              SET content=EXCLUDED.content,
                  source_type=EXCLUDED.source_type,
                  title=EXCLUDED.title;
            """,
            session_id, content[:60000], source_type, title,
        )

async def fetch_session(session_id: str) -> Optional[dict]:
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, title, source_type, content FROM sessions WHERE id = $1",
            session_id,
        )
    return dict(row) if row else None

async def store_chunks_bg(session_id: str, chunks: List[str], source_type: str, title: str):
    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM documents WHERE session_id = $1", session_id)
        for i, chunk in enumerate(chunks):
            try:
                emb = await get_embedding(chunk)
                vec_str = "[" + ",".join(str(v) for v in emb) + "]"
                await conn.execute(
                    """
                    INSERT INTO documents
                        (session_id, chunk_index, source_type, title, content, embedding)
                    VALUES ($1, $2, $3, $4, $5, $6::vector)
                    """,
                    session_id, i, source_type, title, chunk, vec_str,
                )
            except Exception as exc:
                print(f"[embed] chunk {i} failed: {exc}")
    print(f"[embed] done — {len(chunks)} chunks for session {session_id}")

async def similarity_search(session_id: str, query: str, top_k: int = 5) -> List[str]:
    try:
        emb = await get_embedding(query)
        vec_str = "[" + ",".join(str(v) for v in emb) + "]"
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT content FROM documents
                WHERE session_id = $1
                ORDER BY embedding <=> $2::vector
                LIMIT $3
                """,
                session_id, vec_str, top_k,
            )
        return [r["content"] for r in rows]
    except Exception as exc:
        print(f"[rag] similarity_search failed: {exc}")
        return []

# ─── Routes ──────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "alive", "db": "ok" if db_ok else "error", "message": "The saga continues..."}


@app.post("/process-video")
async def process_video(req: VideoRequest):
    # 1. Extract video ID
    try:
        video_id = extract_video_id(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    print(f"[video] processing video_id={video_id}")

    # 2. Get transcript using multi-strategy fetcher
    full_text = await get_transcript(video_id)

    session_id = req.session_id or str(uuid.uuid4())

    # 3. Best-effort title fetch
    title = f"YouTube: {video_id}"
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            r = await client.get(
                f"https://www.youtube.com/oembed?url=https://youtu.be/{video_id}&format=json"
            )
            if r.status_code == 200:
                title = r.json().get("title", title)
    except Exception:
        pass

    # 4. Store + kick off background embedding
    chunks = chunk_text(full_text)
    await upsert_session(session_id, full_text, "youtube", title)
    asyncio.create_task(store_chunks_bg(session_id, chunks, "youtube", title))

    print(f"[video] done — title='{title}' words={len(full_text.split())} chunks={len(chunks)}")

    return {
        "session_id": session_id,
        "title": title,
        "word_count": len(full_text.split()),
        "chunks": len(chunks),
        "status": "processed",
    }


@app.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    session_id: Optional[str] = Query(default=None),
):
    raw = await file.read()
    try:
        doc = fitz.open(stream=raw, filetype="pdf")
        full_text = "".join(page.get_text() for page in doc)
        doc.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF parse error: {e}")

    if not full_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found. Scanned/image PDFs need OCR pre-processing.",
        )

    sid    = session_id or str(uuid.uuid4())
    title  = file.filename or "Uploaded PDF"
    chunks = chunk_text(full_text)

    await upsert_session(sid, full_text, "pdf", title)
    asyncio.create_task(store_chunks_bg(sid, chunks, "pdf", title))

    return {
        "session_id": sid,
        "title": title,
        "word_count": len(full_text.split()),
        "chunks": len(chunks),
        "status": "processed",
    }


@app.post("/generate-flashcards")
async def generate_flashcards(req: FlashcardRequest):
    session = await fetch_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found — process a video or PDF first.")

    content_sample = session["content"][:12000]
    prompt = f"""You are an expert educator. Based on the content below, generate exactly 12 high-quality flashcards.

Content:
{content_sample}

Return ONLY valid JSON — no markdown fences, no extra text:
{{
  "flashcards": [
    {{
      "id": "1",
      "front": "Question or concept",
      "back": "Clear, concise answer",
      "category": "Topic category",
      "difficulty": "easy"
    }}
  ]
}}

Rules:
- difficulty must be one of: easy, medium, hard
- Vary difficulty — at least 3 of each
- Test understanding, not just recall"""

    response = gen_model.generate_content(prompt)
    text = response.text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    m = re.search(r'\{[\s\S]*\}', text)
    if not m:
        raise HTTPException(status_code=500, detail="AI returned unparseable flashcard data")
    return json.loads(m.group())


@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest):
    session = await fetch_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found — process a video or PDF first.")

    content_sample = session["content"][:12000]
    prompt = f"""You are an expert educator. Based on the content below, generate exactly 8 multiple-choice quiz questions.

Content:
{content_sample}

Return ONLY valid JSON — no markdown fences, no extra text:
{{
  "quiz": [
    {{
      "id": "1",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why this answer is correct",
      "difficulty": "easy"
    }}
  ]
}}

Rules:
- correct_index is 0-based (0=A, 1=B, 2=C, 3=D)
- Exactly ONE correct answer per question
- difficulty must be one of: easy, medium, hard"""

    response = gen_model.generate_content(prompt)
    text = response.text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    m = re.search(r'\{[\s\S]*\}', text)
    if not m:
        raise HTTPException(status_code=500, detail="AI returned unparseable quiz data")
    return json.loads(m.group())


@app.post("/chat")
async def chat(req: ChatRequest):
    context_chunks = await similarity_search(req.session_id, req.message, top_k=5)

    if not context_chunks:
        session = await fetch_session(req.session_id)
        if session:
            context_chunks = [session["content"][:4000]]

    context = "\n\n---\n\n".join(context_chunks) if context_chunks else "No specific context available."

    history_text = ""
    for turn in (req.history or [])[-6:]:
        label = "Student" if turn["role"] == "user" else "Guide"
        history_text += f"{label}: {turn['content']}\n"

    full_prompt = f"""You are a wise and knowledgeable learning guide in the spirit of Askeladd from Vinland Saga — sharp, insightful, and direct.

Relevant context from the learning material:
{context}

Previous conversation:
{history_text}

Student: {req.message}
Guide:"""

    async def stream_response():
        try:
            response = gen_model.generate_content(full_prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield f"data: {json.dumps({'content': chunk.text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'content': f'Error: {e}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")
