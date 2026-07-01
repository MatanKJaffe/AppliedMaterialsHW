import { useState, useRef, useEffect } from 'react'
import { askQuestion } from '../api'
import { useAppState } from '../context'
import type { AskResponse } from '../types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
}

export default function AskQuestion() {
  const { selectedTable } = useAppState()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Ask a question about the selected dataset.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([{ role: 'assistant', content: 'Ask a question about the selected dataset.' }])
  }, [selectedTable])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !selectedTable) return

    const question = input
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res: AskResponse = await askQuestion(question, selectedTable)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          sql: res.sql,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          AI Insights
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
            }`}>
              <div>{msg.content}</div>
              {msg.sql && (
                <details className="mt-2">
                  <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">SQL used</summary>
                  <pre className="mt-1 text-xs text-zinc-400 bg-zinc-900 p-2 rounded overflow-x-auto">{msg.sql}</pre>
                </details>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-zinc-800">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedTable ? 'Ask a question about your data...' : 'Upload a dataset first'}
            disabled={!selectedTable}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-full pl-5 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || !selectedTable}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
