import { getSitemapChunk, getSitemapChunkCount, sitemapEntriesToXml } from '@/lib/sitemap-utils'

export const dynamic = 'force-static'
export const dynamicParams = false
export const revalidate = 86400

interface RouteContext {
  params: Promise<{ id: string }>
}

export function generateStaticParams() {
  return Array.from({ length: getSitemapChunkCount() }, (_, id) => ({
    id: `${id}.xml`,
  }))
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const match = id.match(/^(\d+)\.xml$/)

  if (!match) {
    return new Response('Not Found', { status: 404 })
  }

  const entries = getSitemapChunk(Number(match[1]))

  if (!entries) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(sitemapEntriesToXml(entries), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
