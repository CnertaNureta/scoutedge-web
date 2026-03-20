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
  if (value >= 70) return '#22c55e'
  if (value >= 50) return '#3b82f6'
  if (value >= 35) return '#f59e0b'
  return '#ef4444'
}

export function chemistryColorClass(value: number): string {
  if (value >= 70) return 'bg-green-500'
  if (value >= 50) return 'bg-blue-500'
  if (value >= 35) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function fitnessColorClass(status: 'green' | 'amber' | 'red'): string {
  switch (status) {
    case 'green': return 'bg-green-500'
    case 'amber': return 'bg-yellow-500 animate-pulse-slow'
    case 'red': return 'bg-red-500 animate-pulse-fast'
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

export function positionLabel(position: string): string {
  switch (position) {
    case 'GK': return 'Goalkeepers'
    case 'DEF': return 'Defenders'
    case 'MID': return 'Midfielders'
    case 'FWD': return 'Forwards'
    default: return position
  }
}
