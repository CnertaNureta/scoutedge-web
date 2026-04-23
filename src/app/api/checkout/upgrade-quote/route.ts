import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'
import { computeUpgradeCredit, type EntitlementWithAmount, type EntitlementType } from '@/lib/entitlements'

const UPGRADE_TARGETS = new Set<string>(['tournament_pass', 'scout_pass'])

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabaseUser = getSupabaseForUser(token)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const targetPass = req.nextUrl.searchParams.get('target')
    if (!targetPass || !UPGRADE_TARGETS.has(targetPass)) {
      return NextResponse.json({ error: 'Invalid target pass' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: entitlements } = await admin
      .from('user_entitlements')
      .select('id, entitlement_type, scope, valid_from, valid_until, amount_paid_cents')
      .eq('user_id', user.id)
      .gt('valid_until', new Date().toISOString())

    const quote = computeUpgradeCredit(
      (entitlements ?? []) as EntitlementWithAmount[],
      targetPass as EntitlementType,
    )

    return NextResponse.json(quote)
  } catch (err) {
    console.error('Upgrade quote error:', err)
    return NextResponse.json(
      { error: 'Failed to compute upgrade quote' },
      { status: 500 },
    )
  }
}
