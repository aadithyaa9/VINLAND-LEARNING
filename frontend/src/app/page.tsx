'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import UploadSection from '@/components/UploadSection'
import FlashcardSection from '@/components/FlashcardSection'
import QuizSection from '@/components/QuizSection'
import ChatSection from '@/components/ChatSection'
import { ProcessResult } from '@/lib/api'

type Tab = 'flashcards' | 'quiz' | 'chat'

const TABS: { id: Tab; label: string; rune: string }[] = [
  { id: 'flashcards', label: 'Rune Scrolls', rune: 'ᚠ' },
  { id: 'quiz', label: 'The Trial', rune: 'ᛏ' },
  { id: 'chat', label: 'The Guide', rune: 'ᚢ' },
]

export default function Home() {
  const [session, setSession] = useState<ProcessResult | null>(null)
  const [tab, setTab] = useState<Tab>('flashcards')

  const handleProcessed = (result: ProcessResult) => {
    setSession(result)
    setTab('flashcards')
  }

  return (
    <div className="texture-overlay min-h-screen relative">
      {/* Background decorative runes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none" aria-hidden>
        <div className="absolute top-10 left-8 text-gold/[0.04] font-norse text-8xl rotate-12 leading-none">
          ᚠᚢᚦᚨᚱᚲ
        </div>
        <div className="absolute bottom-20 right-8 text-gold/[0.04] font-norse text-8xl -rotate-6 leading-none">
          ᚷᚹᚺᚾᛁᛃ
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blood/[0.025] font-norse text-[200px] leading-none select-none">
          ᛟ
        </div>
      </div>

      {/* Main layout */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-12 md:mb-16"
        >
          {/* Decorative top line */}
          <div className="flex items-center gap-4 mb-8 justify-center">
            <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-gold/40" />
            <span className="text-gold/50 font-norse text-xs tracking-[0.5em]">᛭ ᚠᚢᚦ ᛭</span>
            <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-gold/40" />
          </div>

          <h1 className="font-norse text-5xl md:text-6xl lg:text-7xl font-black text-parchment mb-3 tracking-wide leading-none">
            VINLAND
          </h1>
          <h2 className="font-norse text-2xl md:text-3xl text-gold mb-2 tracking-[0.3em]">
            LEARNING
          </h2>
          <div className="flex items-center gap-4 mt-6 justify-center">
            <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent to-blood/40" />
            <p className="text-mist font-body italic text-sm tracking-wide">
              Forge thy wisdom from any scroll or saga
            </p>
            <div className="h-px flex-1 max-w-32 bg-gradient-to-l from-transparent to-blood/40" />
          </div>
        </motion.header>

        {/* Upload / Input */}
        <AnimatePresence mode="wait">
          {!session ? (
            <motion.section
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="saga-card p-8 mb-8 glow-gold"
            >
              <div className="rune-divider mb-8">
                <span className="font-norse text-xs tracking-widest">BEGIN THY SAGA</span>
              </div>
              <UploadSection onProcessed={handleProcessed} />
            </motion.section>
          ) : (
            <motion.div
              key="learning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Session info banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 border border-gold/20 bg-ink-800/80"
              >
                <div>
                  <p className="font-norse text-gold text-xs tracking-widest mb-0.5">SAGA LOADED</p>
                  <p className="font-body text-parchment/90 text-sm line-clamp-1">{session.title}</p>
                  <p className="text-mist text-xs">
                    {session.word_count.toLocaleString()} words · {session.chunks} scrolls
                  </p>
                </div>
                <button
                  onClick={() => setSession(null)}
                  className="text-xs text-mist hover:text-blood-bright font-norse tracking-widest transition-colors ml-4 flex-shrink-0"
                >
                  NEW SAGA
                </button>
              </motion.div>

              {/* Tabs */}
              <div className="border-b border-gold/15">
                <div className="flex overflow-x-auto">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`saga-tab ${tab === t.id ? 'active' : ''} flex items-center gap-2`}
                    >
                      <span className="text-sm">{t.rune}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="saga-card p-6 md:p-8"
                >
                  {tab === 'flashcards' && <FlashcardSection sessionId={session.session_id} />}
                  {tab === 'quiz' && <QuizSection sessionId={session.session_id} />}
                  {tab === 'chat' && <ChatSection sessionId={session.session_id} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <div className="rune-divider mb-4">
            <span className="font-norse text-xs text-gold/30 tracking-[0.4em]">᛫</span>
          </div>
          <p className="text-mist/40 font-body italic text-sm">
            Powered by Gemini · Forged with purpose
          </p>
          <p className="text-mist/25 font-norse text-xs tracking-widest mt-1">
            ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ
          </p>
        </footer>
      </div>
    </div>
  )
}
