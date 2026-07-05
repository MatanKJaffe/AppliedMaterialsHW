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
          <svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-red-500">
            <path d="m 4.2968449,11.533241 -2.6102621,-1.4922 2.64e-4,-3.0247004 2.61e-4,-3.0246 2.6558259,-1.4959 2.6558285,-1.4958 2.655829,1.4958 2.6558258,1.4959 0.0015,3.0246 0.0015,3.0247004 -2.6034928,1.4665 c -1.431921,0.8065 -2.648285,1.478 -2.703032,1.4922 -0.05475,0.014 -1.274156,-0.6457 -2.7098014,-1.4665 z m 5.1052963,-0.6215 2.1762628,-1.2373004 0,-2.6581 0,-2.658 -2.1762628,-1.2373 c -1.196945,-0.6806 -2.278466,-1.2374 -2.403379,-1.2374 -0.124912,0 -1.206433,0.5568 -2.4033783,1.2374 l -2.1762636,1.2373 2.376e-4,2.658 2.376e-4,2.6581 2.1520929,1.2320004 c 1.1836498,0.6777 2.2650588,1.2345 2.4031318,1.2374 0.138073,0 1.230361,-0.5516 2.427303,-1.2321 z m -4.186409,-0.8313 -1.6913749,-0.9560004 -2.493e-4,-2.1081 -2.493e-4,-2.108 1.7374515,-0.9721 1.737452,-0.972 1.737452,0.972 1.7374518,0.9721 0,2.108 0,2.1081 -1.7204018,0.9624004 c -0.94622,0.5293 -1.748694,0.9595 -1.78328,0.956 -0.03458,0 -0.823997,-0.4366 -1.754252,-0.9624 z m 3.299333,-0.6480004 1.416675,-0.792 0,-1.6174 0,-1.6174 -1.466489,-0.8308 -1.466489,-0.8309 -1.466489,0.8309 -1.4664883,0.8308 0,1.6119 0,1.6118 1.4206613,0.8242 c 0.781363,0.4533 1.463699,0.8122004 1.516302,0.7975004 0.0526,-0.015 0.733145,-0.3831004 1.512317,-0.8186004 z m -2.616169,-1.3162 c -0.201643,-0.2016 -0.366623,-0.4424 -0.366623,-0.5349 0,-0.093 -0.05168,-0.303 -0.11484,-0.4676 -0.09227,-0.2405 -0.02921,-0.2779 0.320794,-0.1902 0.584226,0.1464 1.123052,-0.2777 1.123052,-0.8838 0,-0.6068 0.435048,-0.6495 1.120972,-0.1099 0.64515,0.5075 0.674286,1.5762 0.05874,2.1544 -0.554432,0.5209 -1.637033,0.5371 -2.142091,0.032 z"/>
          </svg>
          AI Insights
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-red-600 text-white rounded-tr-sm'
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
            className="w-full bg-zinc-800 border border-zinc-700 rounded-full pl-5 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || !selectedTable}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-40 transition-colors shadow-lg shadow-red-600/20"
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
