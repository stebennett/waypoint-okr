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

export function ProgressConfidenceChart({ points, height = 160 }: Props) {
  if (!points.length) {
    return <p className="text-xs text-gray-400 italic">No check-ins yet</p>
  }
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const n = sorted.length
  const padLeft = 40
  const padRight = 40
  const padTop = 14
  const padBottom = 22
  const slot = 44
  const W = Math.max(360, padLeft + padRight + slot * n)
  const H = height
  const plotW = W - padLeft - padRight
  const plotH = H - padTop - padBottom
  const barSlot = plotW / n
  const barW = Math.max(6, Math.min(28, barSlot * 0.55))
  const xAt = (i: number) => padLeft + barSlot * (i + 0.5)

  // Left axis: progress (0 at top, 100 at bottom). Remaining = 100 - progress,
  // drawn as a bar anchored at the baseline (bottom) growing upward.
  const baselineY = padTop + plotH
  const remainingBarH = (progress: number) => ((100 - progress) / 100) * plotH

  // Right axis: confidence (0 at bottom, 100 at top).
  const confY = (c: number) => padTop + plotH - (c / 100) * plotH

  const linePts = sorted
    .map((p, i) => `${xAt(i).toFixed(2)},${confY(p.confidence).toFixed(2)}`)
    .join(' ')

  const ticks = [0, 50, 100]

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMinYMid meet"
        style={{ minWidth: W, height: H }}
        role="img"
        aria-label="Progress burn-down (left axis) and confidence (right axis) over time"
      >
        {/* Gridlines */}
        {ticks.map((t) => {
          const y = padTop + plotH - (t / 100) * plotH
          return (
            <line
              key={`grid-${t}`}
              x1={padLeft}
              y1={y}
              x2={W - padRight}
              y2={y}
              stroke="#f1f5f9"
            />
          )
        })}

        {/* Left axis labels — progress: 100% at bottom, 0% at top */}
        {ticks.map((t) => {
          const y = padTop + (t / 100) * plotH
          return (
            <text
              key={`left-${t}`}
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#2563eb"
            >
              {t}%
            </text>
          )
        })}

        {/* Right axis labels — confidence: 0% at bottom, 100% at top */}
        {ticks.map((t) => {
          const y = padTop + plotH - (t / 100) * plotH
          return (
            <text
              key={`right-${t}`}
              x={W - padRight + 6}
              y={y + 3}
              textAnchor="start"
              fontSize="10"
              fill="#1d4ed8"
            >
              {t}%
            </text>
          )
        })}

        {/* Burn-down bars: anchored at baseline, growing up */}
        {sorted.map((p, i) => {
          const h = remainingBarH(p.progress)
          return (
            <rect
              key={`bar-${i}`}
              x={xAt(i) - barW / 2}
              y={baselineY - h}
              width={barW}
              height={h}
              fill="#93c5fd"
              opacity="0.85"
            />
          )
        })}

        {/* Baseline */}
        <line
          x1={padLeft}
          y1={baselineY}
          x2={W - padRight}
          y2={baselineY}
          stroke="#cbd5e1"
        />

        {/* Confidence line (burn-up) */}
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

        {/* X labels */}
        {sorted.map((p, i) => {
          const d = new Date(p.date)
          const label = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
          return (
            <text
              key={`x-${i}`}
              x={xAt(i)}
              y={H - 6}
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
          Remaining (left axis, 100%→0%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-blue-700" />
          Confidence (right axis, 0%→100%)
        </span>
      </div>
    </div>
  )
}
