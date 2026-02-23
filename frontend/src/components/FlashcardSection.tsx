'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { generateFlashcards, Flashcard } from '@/lib/api'

interface Props {
  sessionId: string
}

const DIFFICULTY_COLORS = {
  easy: '#5b8fa8',
  medium: '#c9a84c',
  hard: '#8b1a1a',
}

const DIFFICULTY_RUNES = {
  easy: 'ᚢ',
  medium: 'ᚠ',
  hard: 'ᛏ',
}

export default function FlashcardSection({ sessionId }: Props) {
  const [cards, setCards]       = useState<Flashcard[]>([])
  const [current, setCurrent]   = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [mastered, setMastered] = useState<Set<string>>(new Set())
  const [generated, setGenerated] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const data = await generateFlashcards(sessionId)
      setCards(data.flashcards)
      setCurrent(0)
      setFlipped(false)
      setMastered(new Set())
      setGenerated(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const goTo = (idx: number) => {
    setFlipped(false)
    // tiny delay so the un-flip animation plays before slide
    setTimeout(() => setCurrent(idx), 250)
  }

  const toggleMaster = (id: string) => {
    setMastered((m) => {
      const n = new Set(m)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  /* ── Idle state ──────────────────────────────────────────── */
  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="text-center">
          <p className="font-norse text-gold text-lg tracking-widest mb-2">Forge Thy Flashcards</p>
          <p className="text-mist font-body italic">
            Let the knowledge be etched into rune-cards for study
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-saga flex items-center gap-3 disabled:opacity-50"
        >
          {loading
            ? <span className="animate-pulse font-norse tracking-widest">ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ</span>
            : '⚔ Forge 12 Flashcards'}
        </button>
      </div>
    )
  }

  const card     = cards[current]
  const progress = (mastered.size / cards.length) * 100

  return (
    <div className="space-y-6">

      {/* ── Stats bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-norse text-gold/80 tracking-wide text-xs">
          {current + 1} / {cards.length} SCROLLS
        </span>
        <span className="font-norse text-mist text-xs tracking-wide">
          {mastered.size} MASTERED
        </span>
        <button
          onClick={generate}
          className="text-xs text-mist hover:text-gold transition-colors font-norse tracking-wide"
        >
          ↺ REFORGE
        </button>
      </div>

      {/* ── Progress bar ──────────────────────────────────── */}
      <div className="saga-progress">
        <div className="saga-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Flip Card ─────────────────────────────────────── */}
      {/*
        KEY FIXES:
        1. No AnimatePresence wrapping the card — it was remounting and
           destroying the CSS transition on every navigation.
        2. The `flipped` class goes on the OUTER .flip-card div so the CSS
           selector `.flip-card.flipped .flip-card-inner` matches correctly.
        3. Slide animation is on a wrapper div keyed by `current`, NOT on the
           flip-card itself, so both animations are independent.
      */}
      <div style={{ perspective: '1000px', height: '280px' }}>
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ height: '100%' }}
        >
          {/* Outer div gets the `flipped` class — matches CSS selector */}
          <div
            className={`flip-card w-full h-full cursor-pointer select-none${flipped ? ' flipped' : ''}`}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* Inner rotates */}
            <div className="flip-card-inner w-full h-full">

              {/* ── FRONT ── */}
              <div className="flip-card-front w-full h-full saga-card p-8 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span
                    className="font-norse text-xs tracking-widest px-2 py-1 border"
                    style={{
                      color: DIFFICULTY_COLORS[card.difficulty] ?? '#c9a84c',
                      borderColor: `${DIFFICULTY_COLORS[card.difficulty] ?? '#c9a84c'}40`,
                    }}
                  >
                    {DIFFICULTY_RUNES[card.difficulty] ?? 'ᚠ'} {card.difficulty?.toUpperCase() ?? 'MEDIUM'}
                  </span>
                  <span className="text-xs text-mist font-norse tracking-wide">{card.category}</span>
                </div>

                <div className="text-center px-2">
                  <p className="font-norse text-parchment text-lg leading-relaxed">{card.front}</p>
                </div>

                <p className="text-center text-mist/60 text-xs font-body italic">
                  Tap to reveal the answer
                </p>
              </div>

              {/* ── BACK ── */}
              <div
                className="flip-card-back w-full h-full saga-card p-8 flex flex-col justify-between"
                style={{
                  background: 'linear-gradient(135deg, #1a0e0e 0%, #251818 100%)',
                  borderColor: 'rgba(139,26,26,0.3)',
                }}
              >
                <div className="flex items-center justify-center">
                  <span className="text-blood/60 font-norse text-xs tracking-widest">ANSWER</span>
                </div>

                <div className="text-center px-2">
                  <p className="font-body text-parchment text-base leading-relaxed">{card.back}</p>
                </div>

                <p className="text-center text-mist/60 text-xs font-body italic">
                  Tap again to return
                </p>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="btn-saga btn-secondary disabled:opacity-30 flex-1 py-2 text-xs"
        >
          ← PREV
        </button>

        <button
          onClick={() => toggleMaster(card.id)}
          className={`px-4 py-2 border font-norse text-xs tracking-widest transition-all duration-300 ${
            mastered.has(card.id)
              ? 'bg-frost/20 border-frost/50 text-frost'
              : 'border-mist/30 text-mist hover:border-gold/40 hover:text-gold'
          }`}
        >
          {mastered.has(card.id) ? '✓ MASTERED' : 'MARK MASTERED'}
        </button>

        <button
          onClick={() => goTo(current + 1)}
          disabled={current === cards.length - 1}
          className="btn-saga disabled:opacity-30 flex-1 py-2 text-xs"
        >
          NEXT →
        </button>
      </div>

      {/* ── Dot navigation ────────────────────────────────── */}
      <div className="flex justify-center gap-1 flex-wrap">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? 'bg-gold w-4'
                : mastered.has(c.id)
                ? 'bg-frost/60 w-2'
                : 'bg-ash hover:bg-mist w-2'
            }`}
          />
        ))}
      </div>

    </div>
  )
}
