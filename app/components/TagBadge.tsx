interface TagBadgeProps {
  name: string
  color: string
}

export function TagBadge({ name, color }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  )
}
