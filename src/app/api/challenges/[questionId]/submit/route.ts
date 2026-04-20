import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const POST = withAuth(async (req: NextRequest, user) => {
  const questionId = req.nextUrl.pathname.split('/').at(-2)
  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 })
  }

  const body = await req.json()
  const { answer } = body as { answer: string }

  if (!answer || typeof answer !== 'string') {
    return NextResponse.json({ error: 'answer is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: question, error: qErr } = await admin
    .from('challenge_questions')
    .select('id, challenge_id, correct_answer, points, settled, question_type')
    .eq('id', questionId)
    .single()

  if (qErr || !question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const { data: challenge } = await admin
    .from('daily_challenges')
    .select('challenge_date, is_active')
    .eq('id', question.challenge_id)
    .single()

  if (!challenge?.is_active) {
    return NextResponse.json({ error: 'Challenge is no longer active' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  if (challenge.challenge_date !== today) {
    return NextResponse.json({ error: 'This challenge has expired' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('user_challenge_attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already answered this question' }, { status: 409 })
  }

  const isCorrect = question.settled && question.correct_answer
    ? answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
    : null

  const pointsEarned = isCorrect ? question.points : 0

  const { data: attempt, error: insertErr } = await admin
    .from('user_challenge_attempts')
    .insert({
      user_id: user.id,
      challenge_id: question.challenge_id,
      question_id: questionId,
      submitted_answer: answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Award ScoutCoins for correct challenge answers
  if (isCorrect && pointsEarned > 0) {
    await admin.rpc('earn_points', {
      p_user_id: user.id,
      p_amount: pointsEarned,
      p_type: 'challenge_correct',
      p_reference_id: attempt.id,
      p_description: `Challenge question correct (${question.question_type})`,
    }).then(null, err => console.error('earn_points failed:', err))
  }

  return NextResponse.json({ attempt })
})
