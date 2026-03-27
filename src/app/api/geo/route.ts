import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geo
 * Returns the user's country and US state from Vercel's geo headers.
 * Falls back to 'unknown' when headers aren't present (local dev).
 */
export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') ?? null
  const region = request.headers.get('x-vercel-ip-country-region') ?? null

  return NextResponse.json(
    {
      country,
      region,
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    }
  )
}
