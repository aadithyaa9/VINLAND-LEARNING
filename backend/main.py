import os
import asyncio
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncpg
import google.generativeai as genai
import uuid

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DATABASE_URL   = os.getenv("DATABASE_URL", "")

genai.configure(api_key=GEMINI_API_KEY)
model      = genai.GenerativeModel("gemini-2.0-flash")
EMBED_DIM  = 768

db_pool: asyncpg.Pool | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    yield
    await db_pool.close()

app = FastAPI(title="Vinland Learning API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "alive", "message": "The saga continues..."}
