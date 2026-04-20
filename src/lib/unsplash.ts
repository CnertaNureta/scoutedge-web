/**
 * Homepage hero — dramatic player-in-action shot (celebration / powerful kick).
 * Board requested: "球员踢球的激情瞬间" — passionate player moment, not a wide stadium.
 */
export const HOMEPAGE_HERO_IMAGE =
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1920&h=1080&q=85&fit=crop&crop=center'

const TEAM_HERO_IMAGES: Record<string, string> = {
  argentina: 'photo-1624523781850-a7f38cce4f45',
  brazil: 'photo-1551958219-acbc608c6377',
  england: 'photo-1522778119026-d647f0596c20',
  france: 'photo-1574629810360-7efbbe195018',
  spain: 'photo-1560272564-c83b66b1ad12',
  germany: 'photo-1574629810360-7efbbe195018',
  portugal: 'photo-1553778263-73a83bab9b0c',
  netherlands: 'photo-1459865264687-595d652de67e',
  usa: 'photo-1431324155629-1a6deb1dec8d',
  mexico: 'photo-1606925797300-0b35e9d1794e',
  italy: 'photo-1508098682722-e99c643c5e76',
  japan: 'photo-1556056333-40ca07ff0b0c',
  'south-korea': 'photo-1556056333-40ca07ff0b0c',
  morocco: 'photo-1606925797300-0b35e9d1794e',
  croatia: 'photo-1459865264687-595d652de67e',
  belgium: 'photo-1522778119026-d647f0596c20',
  colombia: 'photo-1551958219-acbc608c6377',
  canada: 'photo-1431324155629-1a6deb1dec8d',
}

const FOOTBALL_ACTION_IMAGES = [
  'photo-1431324155629-1a6deb1dec8d',
  'photo-1574629810360-7efbbe195018',
  'photo-1551958219-acbc608c6377',
  'photo-1522778119026-d647f0596c20',
  'photo-1508098682722-e99c643c5e76',
  'photo-1606925797300-0b35e9d1794e',
  'photo-1553778263-73a83bab9b0c',
  'photo-1459865264687-595d652de67e',
]

export function getTeamHeroImage(slug: string): string {
  const id = TEAM_HERO_IMAGES[slug]
  if (id) return `https://images.unsplash.com/${id}?w=1400&h=800&q=80&fit=crop`
  const idx = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % FOOTBALL_ACTION_IMAGES.length
  return `https://images.unsplash.com/${FOOTBALL_ACTION_IMAGES[idx]}?w=1400&h=800&q=80&fit=crop`
}

export function getPlayerActionImage(playerName: string): string {
  const actionImages = [
    'photo-1431324155629-1a6deb1dec8d',
    'photo-1553778263-73a83bab9b0c',
    'photo-1508098682722-e99c643c5e76',
    'photo-1574629810360-7efbbe195018',
    'photo-1551958219-acbc608c6377',
    'photo-1606925797300-0b35e9d1794e',
  ]
  const idx = playerName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % actionImages.length
  return `https://images.unsplash.com/${actionImages[idx]}?w=1200&h=600&q=80&fit=crop`
}
