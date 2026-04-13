export function progressColor(value: number): string {
  if (value <= 33) return 'bg-red-500'
  if (value <= 66) return 'bg-amber-500'
  return 'bg-green-500'
}

export function progressTextColor(value: number): string {
  if (value <= 33) return 'text-red-600'
  if (value <= 66) return 'text-amber-600'
  return 'text-green-600'
}

export function progressBgLight(value: number): string {
  if (value <= 33) return 'bg-red-50'
  if (value <= 66) return 'bg-amber-50'
  return 'bg-green-50'
}

export function avgProgress(checkIns: { progress: number }[]): number {
  if (!checkIns.length) return 0
  return Math.round(checkIns.reduce((s, c) => s + c.progress, 0) / checkIns.length)
}

export function avgConfidence(checkIns: { confidence: number }[]): number {
  if (!checkIns.length) return 0
  return Math.round(checkIns.reduce((s, c) => s + c.confidence, 0) / checkIns.length)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
