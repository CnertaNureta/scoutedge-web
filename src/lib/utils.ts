export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function hashString(str: string): number {
  return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

export function chemistryColor(value: number): string {
  if (value >= 70) return '#a0d494'
  if (value >= 50) return '#bcf0ae'
  if (value >= 35) return '#e9c400'
  return '#ffb4aa'
}

export function chemistryColorClass(value: number): string {
  if (value >= 70) return 'bg-primary'
  if (value >= 50) return 'bg-accent'
  if (value >= 35) return 'bg-tertiary'
  return 'bg-secondary'
}

export function fitnessColorClass(status: 'green' | 'amber' | 'red'): string {
  switch (status) {
    case 'green': return 'bg-primary'
    case 'amber': return 'bg-tertiary animate-pulse-slow'
    case 'red': return 'bg-secondary animate-pulse-fast'
  }
}

export function positionOrder(position: string): number {
  switch (position) {
    case 'GK': return 0
    case 'DEF': return 1
    case 'MID': return 2
    case 'FWD': return 3
    default: return 4
  }
}

export function getPlayerPhoto(player: { cutoutUrl?: string; imageUrl?: string }): string | undefined {
  return player.cutoutUrl || player.imageUrl || undefined
}

export function positionLabel(position: string): string {
  switch (position) {
    case 'GK': return 'Goalkeepers'
    case 'DEF': return 'Defenders'
    case 'MID': return 'Midfielders'
    case 'FWD': return 'Forwards'
    default: return position
  }
}
