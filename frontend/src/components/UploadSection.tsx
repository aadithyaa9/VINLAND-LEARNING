'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { processVideo, processPDF, ProcessResult } from '@/lib/api'

interface Props {
  onProcessed: (result: ProcessResult) => void
}

export default function UploadSection({ onProcessed }: Props) {
  const [mode, setMode] = useState<'youtube' | 'pdf'>('youtube')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      let result: ProcessResult
      if (mode === 'youtube') {
        if (!url.trim()) throw new Error('Enter a YouTube URL')
        result = await processVideo(url.trim())
      } else {
        if (!file) throw new Error('Select a PDF file')
        result = await processPDF(file)
      }
      onProcessed(result)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setMode('pdf')
    }
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Mode Tabs */}
      <div className="flex gap-0 mb-6 border border-gold/20 overflow-hidden">
        {(['youtube', 'pdf'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className={`flex-1 py-3 font-norse text-xs tracking-widest uppercase transition-all duration-300 ${
              mode === m
                ? 'bg-blood/40 text-parchment border-r border-gold/20 shadow-inner'
                : 'bg-ink-800/50 text-mist hover:text-parchment hover:bg-ink-700/50'
            }`}
          >
            {m === 'youtube' ? '⚔ YouTube Scroll' : '📜 PDF Tome'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'youtube' ? (
          <motion.div
            key="youtube"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="https://youtube.com/watch?v=..."
                className="saga-input pr-4"
              />
            </div>
            <p className="text-mist text-sm mt-2 font-body italic">
              The transcript shall be extracted and forged into wisdom
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="pdf"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`
                border-2 border-dashed transition-all duration-300 cursor-pointer
                flex flex-col items-center justify-center gap-3 py-10 px-6
                ${dragging
                  ? 'border-gold/70 bg-gold/5 shadow-[0_0_30px_rgba(201,168,76,0.15)]'
                  : 'border-gold/25 hover:border-gold/50 hover:bg-ink-700/30'
                }
              `}
            >
              <span className="text-4xl">{file ? '📖' : '📜'}</span>
              {file ? (
                <div className="text-center">
                  <p className="font-norse text-gold text-sm tracking-wide">{file.name}</p>
                  <p className="text-mist text-sm">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-norse text-parchment/80 text-sm tracking-wide">
                    Drop thy tome here
                  </p>
                  <p className="text-mist text-sm mt-1">or click to summon file browser</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 border border-blood/50 bg-blood/10 text-blood-bright text-sm font-body"
          >
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-saga w-full mt-5 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <LoadingRune />
            <span>Forging Knowledge...</span>
          </>
        ) : (
          <>
            <span>⚔</span>
            <span>Begin The Saga</span>
          </>
        )}
      </button>
    </div>
  )
}

function LoadingRune() {
  return (
    <span className="inline-flex gap-1">
      {['ᚠ', 'ᚢ', 'ᚦ'].map((r, i) => (
        <span
          key={r}
          className="animate-pulse text-gold"
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          {r}
        </span>
      ))}
    </span>
  )
}
