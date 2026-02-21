'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [cards, setCards] = useState<Flashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
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

  const next = () => {
    setFlipped(false)
    setTimeout(() => setCurrent((c) => Math.min(c + 1, cards.length - 1)), 200)
  }

  const prev = () => {
    setFlipped(false)
    setTimeout(() => setCurrent((c) => Math.max(c - 1, 0)), 200)
  }

  const toggleMaster = (id: string) => {
    setMastered((m) => {
      const n = new Set(m)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

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
          {loading ? (
            <span className="animate-pulse">ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ</span>
          ) : (
            '⚔ Forge 12 Flashcards'
          )}
        </button>
      </div>
    )
  }

  const card = cards[current]
  const progress = (mastered.size / cards.length) * 100

  return (
    <div className="space-y-6">
      {/* Stats bar */}
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

      {/* Progress */}
      <div className="saga-progress">
        <div className="saga-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="flip-card h-64 cursor-pointer select-none"
          style={{ height: '280px' }}
          onClick={() => setFlipped(!flipped)}
        >
          <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`} style={{ height: '280px' }}>
            {/* Front */}
            <div className="flip-card-front w-full h-full saga-card p-8 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span
                  className="font-norse text-xs tracking-widest px-2 py-1 border"
                  style={{
                    color: DIFFICULTY_COLORS[card.difficulty],
                    borderColor: `${DIFFICULTY_COLORS[card.difficulty]}40`,
                  }}
                >
                  {DIFFICULTY_RUNES[card.difficulty]} {card.difficulty.toUpperCase()}
                </span>
                <span className="text-xs text-mist font-norse tracking-wide">{card.category}</span>
              </div>

              <div className="text-center">
                <p className="font-norse text-parchment text-lg leading-relaxed">
                  {card.front}
                </p>
              </div>

              <p className="text-center text-mist/60 text-xs font-body italic">
                Tap to reveal the answer
              </p>
            </div>

            {/* Back */}
            <div className="flip-card-back w-full saga-card p-8 flex flex-col justify-between"
              style={{
                background: 'linear-gradient(135deg, #1a0e0e 0%, #251818 100%)',
                borderColor: 'rgba(139,26,26,0.3)',
              }}
            >
              <div className="flex items-center justify-center">
                <span className="text-blood/60 font-norse text-xs tracking-widest">ANSWER</span>
              </div>

              <div className="text-center">
                <p className="font-body text-parchment text-base leading-relaxed">
                  {card.back}
                </p>
              </div>

              <p className="text-center text-mist/60 text-xs font-body italic">
                Tap again to return
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={prev}
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
          onClick={next}
          disabled={current === cards.length - 1}
          className="btn-saga disabled:opacity-30 flex-1 py-2 text-xs"
        >
          NEXT →
        </button>
      </div>

      {/* Category dots */}
      <div className="flex justify-center gap-1 flex-wrap">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => { setFlipped(false); setCurrent(i) }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current
                ? 'bg-gold w-4'
                : mastered.has(c.id)
                ? 'bg-frost/60'
                : 'bg-ash hover:bg-mist'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
