'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { streamChat } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  sessionId: string
}

const SAGA_PROMPTS = [
  'What is the main theme of this material?',
  'Explain the most complex concept here',
  'Give me a summary in 3 key points',
  'What should I focus on most?',
]

export default function ChatSection({ sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || streaming) return

    const userMsg: Message = { role: 'user', content: msg }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const gen = streamChat(
        sessionId,
        msg,
        messages.map((m) => ({ role: m.role, content: m.content }))
      )

      for await (const chunk of gen) {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last.role !== 'assistant') return prev
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + chunk },
          ]
        })
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'The ravens could not reach their destination. Try again.' },
      ])
    } finally {
      setStreaming(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '500px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4" style={{ maxHeight: '450px' }}>
        {messages.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <p className="font-norse text-gold/70 text-sm tracking-widest">
              THE GUIDE AWAITS
            </p>
            <p className="text-mist font-body italic text-sm">
              Ask anything about the material — Askeladd's wisdom is at your disposal
            </p>
            <div className="flex flex-col gap-2 mt-6">
              {SAGA_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left px-4 py-2 border border-gold/15 text-parchment/60 hover:text-parchment hover:border-gold/35 text-sm font-body transition-all duration-200 hover:bg-gold/5"
                >
                  → {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 ${
                  msg.role === 'user'
                    ? 'bg-blood/20 border border-blood/30 text-parchment/90'
                    : 'saga-card border-gold/15'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gold font-norse text-xs tracking-widest">
                      THE GUIDE
                    </span>
                    <span className="text-gold/30 text-xs">᛭</span>
                  </div>
                )}
                {msg.role === 'assistant' ? (
                  <div className="saga-prose text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {streaming && i === messages.length - 1 && msg.content === '' && (
                      <span className="inline-flex gap-1">
                        {['ᚠ', 'ᚢ', 'ᚦ'].map((r, j) => (
                          <span
                            key={r}
                            className="animate-pulse text-gold text-xs"
                            style={{ animationDelay: `${j * 0.2}s` }}
                          >
                            {r}
                          </span>
                        ))}
                      </span>
                    )}
                    {streaming && i === messages.length - 1 && msg.content !== '' && (
                      <span className="inline-block w-0.5 h-4 bg-gold animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                ) : (
                  <p className="font-body text-sm">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border border-gold/20 flex items-end gap-0 bg-ink-800/50">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask thy question... (Enter to send, Shift+Enter for newline)"
          disabled={streaming}
          rows={2}
          className="flex-1 bg-transparent px-4 py-3 text-sm font-body text-parchment placeholder-mist/50 resize-none outline-none disabled:opacity-50"
          style={{ lineHeight: 1.5 }}
        />
        <button
          onClick={() => send()}
          disabled={streaming || !input.trim()}
          className="self-stretch px-5 border-l border-gold/20 text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 font-norse text-xs tracking-wider"
        >
          {streaming ? '...' : 'SEND'}
        </button>
      </div>

      {/* Clear */}
      {messages.length > 0 && (
        <button
          onClick={() => setMessages([])}
          className="mt-2 text-xs text-mist/50 hover:text-mist font-norse tracking-wider text-right transition-colors"
        >
          CLEAR SCROLL
        </button>
      )}
    </div>
  )
}
