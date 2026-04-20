'use client'

interface Point {
  date: string | Date
  progress: number
  confidence: number
}

interface Props {
  points: Point[]
  height?: number
}

export function ProgressConfidenceChart({ points, height = 140 }: Props) {
  if (!points.length) {
    return <p className="text-xs text-gray-400 italic">No check-ins yet</p>
  }
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const n = sorted.length
  const padX = 36
  const padY = 14
  const slot = 44
  const W = Math.max(360, padX * 2 + slot * n)
  const H = height
  const plotW = W - padX * 2
  const plotH = H - padY * 2
  const barSlot = plotW / n
  const barW = Math.max(6, Math.min(28, barSlot * 0.55))
  const xAt = (i: number) => padX + barSlot * (i + 0.5)
  const burnDownH = (progress: number) => ((100 - progress) / 100) * plotH
  const confY = (c: number) => padY + plotH - (c / 100) * plotH

  const linePts = sorted.map((p, i) => `${xAt(i).toFixed(2)},${confY(p.confidence).toFixed(2)}`).join(' ')
  const yTicks = [0, 50, 100]

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMinYMid meet"
        style={{ minWidth: W, height: H }}
        role="img"
        aria-label="Progress burn-down and confidence over time"
      >
        {yTicks.map((t) => {
          const y = padY + plotH - (t / 100) * plotH
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={W - padX / 2} y2={y} stroke="#f1f5f9" />
              <text
                x={padX - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
              >
                {t}%
              </text>
            </g>
          )
        })}
        {sorted.map((p, i) => (
          <rect
            key={`bar-${i}`}
            x={xAt(i) - barW / 2}
            y={padY}
            width={barW}
            height={burnDownH(p.progress)}
            fill="#93c5fd"
            opacity="0.85"
          />
        ))}
        <polyline fill="none" stroke="#1d4ed8" strokeWidth="2" points={linePts} />
        {sorted.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={xAt(i)}
            cy={confY(p.confidence)}
            r="3"
            fill="#1d4ed8"
          />
        ))}
        {sorted.map((p, i) => {
          const d = new Date(p.date)
          const label = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
          return (
            <text
              key={`x-${i}`}
              x={xAt(i)}
              y={H - 2}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
            >
              {label}
            </text>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-300" />
          Remaining (burn-down)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-blue-700" />
          Confidence
        </span>
      </div>
    </div>
  )
}
