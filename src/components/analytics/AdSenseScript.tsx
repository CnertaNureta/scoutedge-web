import Script from 'next/script'

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID

export function AdSenseScript() {
  if (!PUBLISHER_ID) return null
  return (
    <Script
      id="adsense-script"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`}
      crossOrigin="anonymous"
    />
  )
}
