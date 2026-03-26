'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { generateAnswer, getSuggestions, type ChatMessage } from '@/lib/chat-engine'

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-on-primary rounded-br-md'
            : 'bg-surface-container-high text-on-surface rounded-bl-md'
        }`}
      >
        <div
          className="chat-content prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_table]:my-2 [&_strong]:text-primary-fixed [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
      </div>
    </div>
  )
}

// Simple markdown to HTML renderer
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim())
      if (cells.every((c) => /^[-:]+$/.test(c))) return '<tr class="border-b border-white/10"></tr>'
      const tag = match.includes('---') ? 'th' : 'td'
      return `<tr>${cells.map((c) => `<${tag} class="px-2 py-1 text-left">${c}</${tag}>`).join('')}</tr>`
    })
    .replace(/((?:<tr>[\s\S]*?<\/tr>\s*)+)/g, '<table class="w-full text-xs">$1</table>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-headline text-xs uppercase tracking-wide text-primary mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-headline text-sm uppercase tracking-wide text-primary mt-3 mb-1">$1</h3>')
    // List items
    .replace(/^- (.+)$/gm, '<li class="ml-3">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-3">$1. $2</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Show welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to **ScoutEdge AI**. I know everything about World Cup 2026 — all 48 teams, 1,200+ players, match schedules, and AI predictions.

What would you like to know?`,
          timestamp: Date.now(),
        },
      ])
    }
  }, [isOpen, messages.length])

  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text || input).trim()
      if (!msg) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: msg,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsTyping(true)

      // Simulate brief thinking delay
      setTimeout(() => {
        const answer = generateAnswer(msg)
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setIsTyping(false)
      }, 400 + Math.random() * 400)
    },
    [input]
  )

  const suggestions = getSuggestions()

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[60] bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'bg-surface-container-high text-on-surface rotate-0'
            : 'bg-primary text-on-primary hover:scale-110 animate-pulse-slow'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open AI assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed z-[60] bottom-40 md:bottom-24 right-4 md:right-8 w-[calc(100vw-2rem)] md:w-[420px] max-h-[70vh] md:max-h-[600px] bg-surface-container-low rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08] bg-primary-container/60">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-lg">&#x26BD;</span>
            </div>
            <div>
              <h3 className="font-headline text-sm uppercase tracking-wide text-primary">ScoutEdge AI</h3>
              <p className="text-xs text-on-surface-variant">World Cup 2026 Intelligence</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse-slow" />
              <span className="text-xs text-on-surface-variant">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isTyping && (
              <div className="flex justify-start mb-3">
                <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Suggestion chips — show after welcome */}
            {messages.length === 1 && !isTyping && (
              <div className="flex flex-wrap gap-2 mt-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/[0.08] bg-surface-container-lowest/50">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any team, player, or match..."
                className="flex-1 bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 border border-white/[0.06] focus:border-primary/40 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
