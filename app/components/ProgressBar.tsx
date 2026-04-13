'use client'

import { progressColor } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, label, showValue = true, size = 'md' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'
  const color = progressColor(value)

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-gray-500">{label}</span>}
          {showValue && <span className="text-xs font-medium text-gray-700">{value}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}
