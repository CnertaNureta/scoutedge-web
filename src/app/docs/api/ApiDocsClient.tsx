'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

const SPEC_URL = '/openapi.yaml'

const REDOC_OPTIONS = {
  theme: {
    colors: {
      primary: { main: '#00DC82' },
      text: { primary: '#e4e4e7', secondary: '#a1a1aa' },
      http: {
        get: '#00DC82',
        post: '#3b82f6',
        put: '#f59e0b',
        delete: '#ef4444',
      },
    },
    typography: {
      fontSize: '15px',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      headings: { fontFamily: '"Bebas Neue", "Plus Jakarta Sans", system-ui, sans-serif' },
      code: { fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' },
    },
    sidebar: {
      backgroundColor: '#0a0a0f',
      textColor: '#a1a1aa',
      activeTextColor: '#00DC82',
      width: '280px',
    },
    rightPanel: { backgroundColor: '#111118', width: '40%' },
  },
  hideDownloadButton: false,
  expandResponses: '200',
  pathInMiddlePanel: true,
  sortOperationsAlphabetically: false,
  scrollYOffset: 0,
  nativeScrollbars: true,
}

export default function ApiDocsClient() {
  const containerRef = useRef<HTMLDivElement>(null)
  const initedRef = useRef(false)

  useEffect(() => {
    if (initedRef.current) return
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Redoc) {
      initRedoc()
    }
  }, [])

  function initRedoc() {
    if (initedRef.current || !containerRef.current) return
    initedRef.current = true
    const Redoc = (window as unknown as Record<string, { init: (url: string, opts: object, el: HTMLElement) => void }>).Redoc
    Redoc.init(SPEC_URL, REDOC_OPTIONS, containerRef.current)
  }

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background: #0a0a0f; }
        .redoc-wrap { min-height: 100vh; }
        /* hide site header/footer on this page */
        header, footer, [data-chat-widget] { display: none !important; }
        /* dark scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
      `}</style>
      <Script
        src="https://cdn.redoc.ly/redoc/v2.1.5/bundles/redoc.standalone.js"
        strategy="afterInteractive"
        onLoad={initRedoc}
      />
      <div ref={containerRef} />
    </>
  );
}
