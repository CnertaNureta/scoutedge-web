'use client'

import dynamic from 'next/dynamic'

const ChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), { ssr: false })
const UpsellBanner = dynamic(() => import('@/components/monetization/UpsellBanner'), { ssr: false })
const InstallBanner = dynamic(() => import('@/components/pwa/InstallBanner'), { ssr: false })

export default function ClientRuntimeWidgets() {
  return (
    <>
      <ChatWidget />
      <UpsellBanner />
      <InstallBanner />
    </>
  )
}
