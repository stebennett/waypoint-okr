import type { Trend } from '@/lib/utils'

const CONFIG: Record<Trend, { glyph: string; label: string; className: string }> = {
  up: { glyph: '▲', label: 'trend up', className: 'text-green-600' },
  steady: { glyph: '▬', label: 'trend steady', className: 'text-gray-400' },
  down: { glyph: '▼', label: 'trend down', className: 'text-amber-600' },
}

export function TrendIndicator({ trend }: { trend: Trend }) {
  const { glyph, label, className } = CONFIG[trend]
  return (
    <span className={`text-xs ${className}`} aria-label={label} title={label}>
      {glyph}
    </span>
  )
}
