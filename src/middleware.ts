import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const ALLOWED_API_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://kickoracle.com',
    'https://www.scoutedge.io',
    'https://kickoracle.com',
    'https://www.kickoracle.com',
  ].filter(Boolean),
)

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.redoc.ly https://js.stripe.com https://www.googletagmanager.com https://pagead2.googlesyndication.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://*.thesportsdb.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.googlesyndication.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.googlesyndication.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://googleads.g.doubleclick.net https://*.googlesyndication.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

const intlMiddleware = createMiddleware(routing)

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/webhooks/')) {
    return addSecurityHeaders(NextResponse.next())
  }

  if (req.nextUrl.pathname.startsWith('/api/v1/')) {
    const origin = req.headers.get('origin')
    const allowedOrigin = origin && ALLOWED_API_ORIGINS.has(origin) ? origin : null

    if (req.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 })
      preflight.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      preflight.headers.set('Access-Control-Allow-Headers', 'X-API-Key, Content-Type')
      preflight.headers.set('Access-Control-Max-Age', '86400')
      if (allowedOrigin) preflight.headers.set('Access-Control-Allow-Origin', allowedOrigin)
      return addSecurityHeaders(preflight)
    }

    const response = addSecurityHeaders(NextResponse.next())
    if (allowedOrigin) response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset')
    return response
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next())
  }

  const response = intlMiddleware(req)
  addSecurityHeaders(response as NextResponse)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|sitemap.xml|news-sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|xml|txt)$).*)',
  ],
}
