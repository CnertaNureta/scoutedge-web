'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import GlassCard from '@/components/ui/GlassCard'

interface Challenge {
  id: string
  challenge_date: string
  title: string
  description: string | null
  total_questions: number
  time_limit_minutes: number
  settled: boolean
}

interface Question {
  id: string
  question_order: number
  question_type: string
  question_text: string
  options: string[]
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
  settled: boolean
  correct_answer: string | null
}

interface Attempt {
  id: string
  question_id: string
  submitted_answer: string
  is_correct: boolean | null
  points_earned: number
}

interface Streak {
  current_streak: number
  longest_streak: number
  total_challenges_completed: number
  total_points_earned: number
  last_challenge_date: string | null
}

interface LeaderboardEntry {
  user_id: string
  display_name: string
  avatar_url: string | null
  current_streak: number
  total_points_earned: number
  rank: number
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const TYPE_LABELS: Record<string, string> = {
  match_winner: 'Match Winner',
  exact_score: 'Exact Score',
  first_goalscorer: 'First Goalscorer',
  over_under_goals: 'Over/Under Goals',
  corners: 'Corners',
  possession: 'Possession',
  both_teams_score: 'Both Teams Score',
}

function StreakBadge({ streak }: { streak: Streak }) {
  return (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <div className="font-mono text-3xl font-black text-primary tabular-nums">
          {streak.current_streak}
        </div>
        <div className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant mt-1">
          Streak
        </div>
      </div>
      <div className="w-px h-10 bg-white/[0.08]" />
      <div className="text-center">
        <div className="font-mono text-3xl font-black text-on-surface tabular-nums">
          {streak.longest_streak}
        </div>
        <div className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant mt-1">
          Best
        </div>
      </div>
      <div className="w-px h-10 bg-white/[0.08]" />
      <div className="text-center">
        <div className="font-mono text-3xl font-black text-on-surface tabular-nums">
          {streak.total_points_earned}
        </div>
        <div className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant mt-1">
          Points
        </div>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  attempt,
  onSubmit,
  submitting,
}: {
  question: Question
  attempt: Attempt | undefined
  onSubmit: (questionId: string, answer: string) => void
  submitting: string | null
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const isAnswered = !!attempt
  const isSubmitting = submitting === question.id
  const options = Array.isArray(question.options) ? question.options : []

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-primary/20 text-primary font-mono font-bold text-sm flex items-center justify-center">
            {question.question_order}
          </span>
          <span className={`text-[11px] font-label uppercase tracking-widest px-2.5 py-1 rounded-full border ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {question.difficulty}
          </span>
          <span className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant">
            {TYPE_LABELS[question.question_type] ?? question.question_type}
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-primary">
          +{question.points}pt
        </span>
      </div>

      <h3 className="font-headline text-lg text-on-surface mb-5">
        {question.question_text}
      </h3>

      <div className="grid gap-2">
        {options.map((option: string) => {
          const isSelected = selected === option || attempt?.submitted_answer === option
          const isCorrect = question.settled && question.correct_answer === option
          const isWrong = isAnswered && attempt?.submitted_answer === option && attempt?.is_correct === false

          let optionClass = 'bg-white/[0.04] border-white/[0.08] text-on-surface hover:bg-white/[0.08] hover:border-white/[0.15]'
          if (isAnswered) {
            if (isCorrect) {
              optionClass = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
            } else if (isWrong) {
              optionClass = 'bg-red-500/15 border-red-500/40 text-red-400'
            } else {
              optionClass = 'bg-white/[0.02] border-white/[0.05] text-on-surface-variant'
            }
          } else if (isSelected) {
            optionClass = 'bg-primary/15 border-primary/40 text-primary'
          }

          return (
            <button
              key={option}
              disabled={isAnswered || isSubmitting}
              onClick={() => setSelected(option)}
              className={`w-full text-left px-4 py-3 rounded-xl border font-label text-sm transition-all ${optionClass} disabled:cursor-default`}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                {isCorrect && <span className="text-emerald-400 font-bold text-xs">CORRECT</span>}
                {isWrong && <span className="text-red-400 font-bold text-xs">WRONG</span>}
              </div>
            </button>
          )
        })}
      </div>

      {!isAnswered && selected && (
        <button
          onClick={() => onSubmit(question.id, selected)}
          disabled={isSubmitting}
          className="mt-4 w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Lock In Answer'}
        </button>
      )}

      {isAnswered && (
        <div className="mt-4 flex items-center gap-2">
          {attempt.is_correct === true && (
            <span className="text-sm font-bold text-emerald-400">+{attempt.points_earned}pt earned</span>
          )}
          {attempt.is_correct === false && (
            <span className="text-sm font-bold text-red-400">Wrong answer</span>
          )}
          {attempt.is_correct === null && (
            <span className="text-sm text-on-surface-variant">Answer locked — awaiting settlement</span>
          )}
        </div>
      )}
    </GlassCard>
  )
}

function MiniLeaderboard({ entries, userRank }: { entries: LeaderboardEntry[]; userRank: number | null }) {
  if (entries.length === 0) return null

  return (
    <GlassCard className="p-6">
      <h2 className="font-headline text-xl text-primary mb-4">Challenge Leaders</h2>
      <div className="space-y-2">
        {entries.slice(0, 10).map(entry => (
          <div key={entry.user_id} className="flex items-center gap-3 py-2">
            <span className="w-7 text-center font-mono text-sm font-bold text-on-surface-variant">
              {entry.rank}
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-on-surface-variant">
              {entry.display_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-on-surface truncate">
                {entry.display_name ?? 'Anonymous'}
              </div>
              <div className="text-[11px] text-on-surface-variant">
                {entry.current_streak} day streak
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-primary tabular-nums">
              {entry.total_points_earned}
            </span>
          </div>
        ))}
      </div>
      {userRank && userRank > 10 && (
        <div className="mt-3 pt-3 border-t border-white/[0.08] text-sm text-on-surface-variant text-center">
          Your rank: <span className="font-mono font-bold text-primary">#{userRank}</span>
        </div>
      )}
    </GlassCard>
  )
}

export default function ChallengesPage() {
  const { user, loading: authLoading } = useAuth()
  const { apiFetch, isAuthenticated } = useApi()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempts, setAttempts] = useState<Map<string, Attempt>>(new Map())
  const [streak, setStreak] = useState<Streak>({
    current_streak: 0,
    longest_streak: 0,
    total_challenges_completed: 0,
    total_points_earned: 0,
    last_challenge_date: null,
  })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const todayRes = await fetch('/api/challenges/today')
      const todayData = await todayRes.json()
      setChallenge(todayData.challenge)
      setQuestions(todayData.questions ?? [])

      if (isAuthenticated) {
        const statsData = await apiFetch('/api/challenges/stats')
        setStreak(statsData.streak)
        setLeaderboard(statsData.leaderboard ?? [])
        setUserRank(statsData.userRank)

        const attemptMap = new Map<string, Attempt>()
        for (const a of statsData.todayAttempts ?? []) {
          attemptMap.set(a.question_id, a)
        }
        setAttempts(attemptMap)
      }
    } catch {
      // fall through
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, apiFetch])

  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData])

  async function handleSubmit(questionId: string, answer: string) {
    setSubmitting(questionId)
    try {
      const data = await apiFetch(`/api/challenges/${questionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answer }),
      })
      setAttempts(prev => new Map(prev).set(questionId, data.attempt))
    } catch {
      // error displayed by UI state
    } finally {
      setSubmitting(null)
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <GlassCard className="p-8 text-center">
          <h1 className="font-display text-3xl text-primary mb-3">Daily Challenge</h1>
          <p className="text-on-surface-variant mb-6">Sign in to take on today&apos;s prediction challenge and build your streak.</p>
          <Link href="/auth/login" className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 transition-all">
            Sign In
          </Link>
        </GlassCard>
      </div>
    )
  }

  const answeredCount = attempts.size
  const totalQuestions = questions.length
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-28 md:pb-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-primary">
          Daily Challenge
        </h1>
        <p className="text-on-surface-variant mt-2">
          Answer today&apos;s prediction questions. Build your streak. Climb the leaderboard.
        </p>
      </div>

      {isAuthenticated && (
        <GlassCard className="p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <StreakBadge streak={streak} />
            {challenge && totalQuestions > 0 && (
              <div className="w-full sm:w-48">
                <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5">
                  <span>{answeredCount}/{totalQuestions} answered</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-white/[0.08] p-6 animate-pulse">
              <div className="h-5 bg-white/[0.06] rounded w-1/3 mb-4" />
              <div className="h-6 bg-white/[0.06] rounded w-2/3 mb-5" />
              <div className="space-y-2">
                <div className="h-12 bg-white/[0.06] rounded" />
                <div className="h-12 bg-white/[0.06] rounded" />
                <div className="h-12 bg-white/[0.06] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !challenge && (
        <GlassCard className="p-12 text-center">
          <div className="text-5xl mb-4">&#9917;</div>
          <h2 className="font-headline text-xl text-on-surface mb-2">No Challenge Today</h2>
          <p className="text-on-surface-variant">
            Today&apos;s challenge hasn&apos;t been generated yet. Check back soon!
          </p>
        </GlassCard>
      )}

      {!loading && challenge && (
        <>
          <div className="mb-6">
            <h2 className="font-headline text-2xl text-on-surface">{challenge.title}</h2>
            {challenge.description && (
              <p className="text-on-surface-variant mt-1">{challenge.description}</p>
            )}
          </div>

          <div className="space-y-4 mb-10">
            {questions.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                attempt={attempts.get(q.id)}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            ))}
          </div>

          {answeredCount === totalQuestions && totalQuestions > 0 && (
            <GlassCard className="p-8 text-center mb-10">
              <div className="text-4xl mb-3">&#127942;</div>
              <h2 className="font-headline text-2xl text-primary mb-2">Challenge Complete!</h2>
              <p className="text-on-surface-variant">
                You&apos;ve answered all {totalQuestions} questions.
                {challenge.settled
                  ? ` You earned ${Array.from(attempts.values()).reduce((sum, a) => sum + a.points_earned, 0)} points today!`
                  : ' Results will be settled after the matches finish.'}
              </p>
            </GlassCard>
          )}
        </>
      )}

      <MiniLeaderboard entries={leaderboard} userRank={userRank} />
    </div>
  )
}
