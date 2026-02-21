const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ProcessResult {
  session_id: string
  title: string
  word_count: number
  chunks: number
  status: string
}

export interface Flashcard {
  id: string
  front: string
  back: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export async function processVideo(url: string, sessionId?: string): Promise<ProcessResult> {
  const res = await fetch(`${API_URL}/process-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, session_id: sessionId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to process video')
  }
  return res.json()
}

export async function processPDF(file: File, sessionId?: string): Promise<ProcessResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (sessionId) formData.append('session_id', sessionId)

  const res = await fetch(`${API_URL}/process-pdf`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to process PDF')
  }
  return res.json()
}

export async function generateFlashcards(sessionId: string): Promise<{ flashcards: Flashcard[] }> {
  const res = await fetch(`${API_URL}/generate-flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
  if (!res.ok) throw new Error('Failed to generate flashcards')
  return res.json()
}

export async function generateQuiz(sessionId: string): Promise<{ quiz: QuizQuestion[] }> {
  const res = await fetch(`${API_URL}/generate-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
  if (!res.ok) throw new Error('Failed to generate quiz')
  return res.json()
}

export async function* streamChat(
  sessionId: string,
  message: string,
  history: { role: string; content: string }[]
): AsyncGenerator<string> {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message, history }),
  })

  if (!res.ok) throw new Error('Chat request failed')
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value)
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) yield parsed.content
        } catch {}
      }
    }
  }
}
