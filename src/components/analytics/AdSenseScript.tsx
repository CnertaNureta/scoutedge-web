import Script from 'next/script'
import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense'

export function AdSenseScript() {
  return (
    <Script
      id="adsense-script"
      strategy="lazyOnload"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
      crossOrigin="anonymous"
    />
  )
}
