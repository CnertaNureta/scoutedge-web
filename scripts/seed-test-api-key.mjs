#!/usr/bin/env node
// Seeds a test API key for k6 load testing. Outputs the raw key to stdout.
// Usage: node scripts/seed-test-api-key.mjs [tier]

import { createClient } from '@supabase/supabase-js'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const tier = (process.argv[2] ?? 'advanced').toLowerCase()
const TIERS = {
  basic: { min: 60, month: 10_000 },
  advanced: { min: 120, month: 100_000 },
  event: { min: 200, month: 999_999_999 },
  whitelabel: { min: 300, month: 999_999_999 },
}
if (!TIERS[tier]) {
  console.error(`Unknown tier: ${tier}`)
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const TEST_EMAIL = `k6-loadtest-${Date.now()}@scoutedge.test`
const TEST_PASSWORD = randomBytes(24).toString('base64url')

const { data: userData, error: userErr } = await admin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true,
})
if (userErr) {
  console.error('Failed to create user:', userErr.message)
  process.exit(1)
}

const userId = userData.user.id
const rawKey = 'se_live_' + randomBytes(32).toString('base64url')
const pepper = process.env.API_KEY_PEPPER
const hash = pepper
  ? createHmac('sha256', pepper).update(rawKey).digest('hex')
  : createHash('sha256').update(rawKey).digest('hex')
const prefix = rawKey.slice(0, 'se_live_'.length + 8)

const defaults = TIERS[tier]
const { error: insertErr } = await admin.from('api_keys').insert({
  user_id: userId,
  key_hash: hash,
  key_prefix: prefix,
  name: 'k6-loadtest',
  tier,
  rate_limit_per_minute: defaults.min,
  rate_limit_per_month: defaults.month,
})

if (insertErr) {
  console.error('Failed to insert api_key:', insertErr.message)
  await admin.auth.admin.deleteUser(userId).catch(() => {})
  process.exit(1)
}

// Machine-readable output on stdout
console.log(JSON.stringify({ key: rawKey, userId, tier, ratePerMin: defaults.min, ratePerMonth: defaults.month }))
