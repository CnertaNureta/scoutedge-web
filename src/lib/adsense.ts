export const ADSENSE_PUBLISHER_ID = 'ca-pub-8023288538508749'

// AdSense is OFF by default. The site copy advertises "no display ads",
// no <AdSlot> is rendered anywhere, and the script was implicated in a
// 60-second main-thread block on production. To re-enable later (or to
// A/B test), set NEXT_PUBLIC_ADSENSE_ENABLED=1 in the deploy environment.
export const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === '1'
