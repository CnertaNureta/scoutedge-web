/**
 * Lightweight cookie-based A/B test framework.
 * Assigns users to variants on first visit, stable for 30 days.
 */

type TestId = 'cta-position' | 'cta-copy' | 'cta-partner-primary'

const TEST_CONFIG: Record<TestId, string[]> = {
  'cta-position': ['below-ai-insight', 'card-footer'],
  'cta-copy': ['view-forecast', 'see-probabilities', 'back-team'],
  'cta-partner-primary': ['travel-packages', 'ticket-alerts'],
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

/**
 * Get the user's variant for a given test.
 * Assigns randomly on first call, then stable for 30 days.
 */
export function getAbVariant(testId: TestId): string {
  const cookieName = `ab_${testId}`
  const existing = getCookie(cookieName)
  if (existing) return existing

  const variants = TEST_CONFIG[testId]
  if (!variants || variants.length === 0) return 'control'

  const variant = variants[Math.floor(Math.random() * variants.length)]
  setCookie(cookieName, variant, 30)
  return variant
}

/**
 * Get all active A/B variants for the current user.
 * Useful for analytics logging.
 */
export function getAllAbVariants(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const testId of Object.keys(TEST_CONFIG) as TestId[]) {
    result[testId] = getAbVariant(testId)
  }
  return result
}
