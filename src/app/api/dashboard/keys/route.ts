import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { generateApiKey, listApiKeys } from '@/lib/api-keys'
import type { ApiTier } from '@/lib/api-v1/middleware'

const VALID_TIERS: ApiTier[] = ['basic', 'advanced', 'event', 'whitelabel']

export const GET = withAuth(async (_req, user) => {
  const keys = await listApiKeys(user.id)
  return NextResponse.json({ keys })
})

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : 'Default'
  const tier: ApiTier = VALID_TIERS.includes(body.tier) ? body.tier : 'basic'

  if (!name || name.length > 64) {
    return NextResponse.json({ error: 'Name must be 1-64 characters' }, { status: 400 })
  }

  const result = await generateApiKey(user.id, tier, name)
  return NextResponse.json({ key: result.key, record: result.record }, { status: 201 })
})
