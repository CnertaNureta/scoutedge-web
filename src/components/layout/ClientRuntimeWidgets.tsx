'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const ChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), { ssr: false })
const UpsellBanner = dynamic(() => import('@/components/monetization/UpsellBanner'), { ssr: false })
const InstallBanner = dynamic(() => import('@/components/pwa/InstallBanner'), { ssr: false })

const IDLE_TIMEOUT_MS = 2500

function useIdleMount(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const fire = () => setReady(true)
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(fire, { timeout: IDLE_TIMEOUT_MS })
    } else {
      timeoutId = setTimeout(fire, IDLE_TIMEOUT_MS)
    }

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [])
  return ready
}

export default function ClientRuntimeWidgets() {
  const ready = useIdleMount()
  return (
    <>
      <InstallBanner />
      {ready ? (
        <>
          <ChatWidget />
          <UpsellBanner />
        </>
      ) : null}
    </>
  )
}
