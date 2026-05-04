'use client'

import { useState, useRef } from 'react'
import { Link } from '@/i18n/navigation'
import QuizApp from './QuizApp'

const GATE_STORAGE_KEY = 'scoutedge-quiz-gate-dismissed'
const GATE_AFTER_QUESTION = 3

function RegistrationGate({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-container border border-white/[0.12] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <span className="text-4xl mb-3 block">⚽</span>
          <h2 className="font-headline text-2xl uppercase tracking-wide text-on-surface mb-2">
            Unlock All Questions
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            You&apos;re on a roll! Create a free account to finish the quiz,
            track your score history, and get daily AI World Cup predictions.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/register"
            className="block w-full bg-primary text-on-primary font-label font-bold uppercase tracking-widest text-sm px-6 py-4 rounded-full text-center hover:opacity-90 active:scale-95 transition-all"
          >
            Create Free Account
          </Link>
          <button
            onClick={onDismiss}
            className="block w-full text-on-surface-variant font-label text-sm py-3 hover:text-on-surface transition-colors"
          >
            Continue without account
          </button>
        </div>

        <p className="text-on-surface-variant/50 text-[10px] text-center mt-4 font-label uppercase tracking-wider">
          Free forever · No credit card needed
        </p>
      </div>
    </div>
  )
}

export default function QuizWithGate() {
  const [showGate, setShowGate] = useState(false)
  const answeredCount = useRef(0)

  function handleQuestionAnswered() {
    answeredCount.current += 1
    if (
      answeredCount.current === GATE_AFTER_QUESTION &&
      typeof window !== 'undefined' &&
      !localStorage.getItem(GATE_STORAGE_KEY)
    ) {
      setShowGate(true)
    }
  }

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GATE_STORAGE_KEY, '1')
    }
    setShowGate(false)
  }

  return (
    <>
      {showGate && <RegistrationGate onDismiss={handleDismiss} />}
      <QuizApp onQuestionAnswered={handleQuestionAnswered} />
    </>
  )
}
