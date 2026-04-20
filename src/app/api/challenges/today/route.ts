import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const admin = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const { data: challenge, error: challengeErr } = await admin
    .from('daily_challenges')
    .select('id, challenge_date, title, description, total_questions, time_limit_minutes, settled')
    .eq('challenge_date', today)
    .eq('is_active', true)
    .single()

  if (challengeErr || !challenge) {
    return NextResponse.json({ challenge: null, questions: [] })
  }

  const { data: questions } = await admin
    .from('challenge_questions')
    .select('id, question_order, question_type, question_text, options, points, difficulty, settled, correct_answer')
    .eq('challenge_id', challenge.id)
    .order('question_order', { ascending: true })

  const safeQuestions = (questions ?? []).map(q => ({
    ...q,
    correct_answer: q.settled ? q.correct_answer : null,
  }))

  return NextResponse.json({ challenge, questions: safeQuestions })
}
