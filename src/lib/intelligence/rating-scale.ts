const TEN_POINT_RATING_MAX = 10
const HUNDRED_POINT_RATING_MAX = 100

function safeRating(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function ratingToHundredScale(value: number): number {
  const rating = safeRating(value)
  const normalized =
    rating <= TEN_POINT_RATING_MAX ? rating * 10 : rating

  return Math.max(0, Math.min(HUNDRED_POINT_RATING_MAX, normalized))
}
