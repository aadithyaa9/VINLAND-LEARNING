'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateQuiz, QuizQuestion } from '@/lib/api'

interface Props {
  sessionId: string
}

type QuizState = 'idle' | 'loading' | 'active' | 'review'

export default function QuizSection({ sessionId }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [state, setState] = useState<QuizState>('idle')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<(number | null)[]>([])
  const [showExplanation, setShowExplanation] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const generate = async () => {
    setState('loading')
    try {
      const data = await generateQuiz(sessionId)
      setQuestions(data.quiz)
      setSelected(new Array(data.quiz.length).fill(null))
      setCurrent(0)
      setShowExplanation(false)
      setSubmitted(false)
      setState('active')
    } catch {
      setState('idle')
    }
  }

  const select = (idx: number) => {
    if (submitted) return
    const newSelected = [...selected]
    newSelected[current] = idx
    setSelected(newSelected)
    setSubmitted(true)
    setShowExplanation(true)
  }

  const next = () => {
    setSubmitted(false)
    setShowExplanation(false)
    if (current + 1 >= questions.length) {
      setState('review')
    } else {
      setCurrent(current + 1)
    }
  }
  const score = selected.reduce((acc: number, s, i) => {
  if (s === null) return acc;
  return (acc ?? 0) + (s === questions[i].correct_index ? 1 : 0);
}, 0);

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="text-center">
          <p className="font-norse text-gold text-lg tracking-widest mb-2">Enter The Trial</p>
          <p className="text-mist font-body italic">
            Prove thy understanding in battle — 8 questions await
          </p>
        </div>
        <button onClick={generate} className="btn-saga flex items-center gap-3">
          ⚔ Begin The Trial
        </button>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="font-norse text-gold animate-pulse tracking-widest">
          ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ
        </p>
        <p className="text-mist text-sm font-body italic">Forging thy trial...</p>
      </div>
    )
  }

  if (state === 'review') {
    const pct = Math.round((score / questions.length) * 100)
    const verdict = pct >= 80 ? 'Legendary' : pct >= 60 ? 'Worthy' : pct >= 40 ? 'Apprentice' : 'Return to Study'
    const verdictColor = pct >= 80 ? '#c9a84c' : pct >= 60 ? '#5b8fa8' : pct >= 40 ? '#8c8070' : '#8b1a1a'

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="saga-card p-8 text-center space-y-4">
          <p className="text-mist font-norse text-xs tracking-widest">TRIAL COMPLETE</p>
          <p
            className="font-norse text-4xl font-bold"
            style={{ color: verdictColor, textShadow: `0 0 30px ${verdictColor}60` }}
          >
            {pct}%
          </p>
          <p className="font-norse tracking-widest" style={{ color: verdictColor }}>
            {verdict}
          </p>
          <p className="text-mist font-body">
            {score} of {questions.length} questions answered correctly
          </p>
        </div>

        {/* Per-question review */}
        <div className="space-y-3">
          {questions.map((q, i) => {
            const userAnswer = selected[i]
            const correct = userAnswer === q.correct_index

            return (
              <div
                key={q.id}
                className={`p-4 border text-sm font-body transition-all ${
                  correct
                    ? 'border-frost/30 bg-frost/5'
                    : 'border-blood/30 bg-blood/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={correct ? 'text-frost' : 'text-blood-bright'}>
                    {correct ? '✓' : '✗'}
                  </span>
                  <div>
                    <p className="text-parchment/90 mb-1">{q.question}</p>
                    {!correct && (
                      <p className="text-mist text-xs">
                        Correct: <span className="text-frost">{q.options[q.correct_index]}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={generate} className="btn-saga w-full">
          ⚔ Retake The Trial
        </button>
      </motion.div>
    )
  }

  const q = questions[current]
  const userSel = selected[current]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-norse text-gold/80 text-xs tracking-widest">
          QUESTION {current + 1} / {questions.length}
        </span>
        <span
          className="font-norse text-xs tracking-widest px-2 py-1 border"
          style={{
            color: q.difficulty === 'easy' ? '#5b8fa8' : q.difficulty === 'medium' ? '#c9a84c' : '#8b1a1a',
            borderColor: q.difficulty === 'easy' ? '#5b8fa820' : q.difficulty === 'medium' ? '#c9a84c20' : '#8b1a1a20',
          }}
        >
          {q.difficulty.toUpperCase()}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 transition-all duration-300 ${
              i < current
                ? selected[i] === questions[i].correct_index
                  ? 'bg-frost'
                  : 'bg-blood'
                : i === current
                ? 'bg-gold'
                : 'bg-ash'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="saga-card p-6">
        <p className="font-body text-parchment text-lg leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((opt, i) => {
          let state = 'default'
          if (submitted) {
            if (i === q.correct_index) state = 'correct'
            else if (i === userSel && userSel !== q.correct_index) state = 'wrong'
          } else if (userSel === i) {
            state = 'selected'
          }

          return (
            <motion.button
              key={i}
              whileHover={!submitted ? { x: 4 } : {}}
              whileTap={!submitted ? { scale: 0.98 } : {}}
              onClick={() => select(i)}
              disabled={submitted}
              className={`w-full text-left p-4 border font-body transition-all duration-300 flex items-center gap-4 ${
                state === 'correct'
                  ? 'border-frost/60 bg-frost/10 text-frost'
                  : state === 'wrong'
                  ? 'border-blood/60 bg-blood/10 text-blood-bright'
                  : state === 'selected'
                  ? 'border-gold/60 bg-gold/10 text-gold'
                  : 'border-ash/40 hover:border-gold/30 hover:bg-gold/5 text-parchment/80 cursor-pointer'
              }`}
            >
              <span
                className={`font-norse text-sm w-6 h-6 flex items-center justify-center border flex-shrink-0 ${
                  state === 'correct'
                    ? 'border-frost/60 text-frost'
                    : state === 'wrong'
                    ? 'border-blood/60 text-blood-bright'
                    : 'border-current'
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
              {state === 'correct' && <span className="ml-auto text-frost">✓</span>}
              {state === 'wrong' && <span className="ml-auto text-blood-bright">✗</span>}
            </motion.button>
          )
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-gold/20 bg-gold/5 p-4"
          >
            <p className="font-norse text-gold text-xs tracking-widest mb-2">WISDOM</p>
            <p className="font-body text-parchment/80 text-sm leading-relaxed">{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      {submitted && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={next}
          className="btn-saga w-full"
        >
          {current + 1 >= questions.length ? 'View Results ⟩' : 'Next Question →'}
        </motion.button>
      )}
    </div>
  )
}
