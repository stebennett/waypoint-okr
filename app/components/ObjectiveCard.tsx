import Link from 'next/link'
import { TagBadge } from './TagBadge'
import { ProgressBar } from './ProgressBar'

interface CheckIn {
  progress: number
  confidence: number
}

interface KeyResult {
  id: string
  title: string
  checkIns: CheckIn[]
}

interface Tag {
  tag: { id: string; name: string; color: string }
}

interface ObjectiveCardProps {
  id: string
  title: string
  description?: string | null
  teamName?: string | null
  tags: Tag[]
  keyResults: KeyResult[]
  status: string
  level: string
}

function getLatestMetrics(keyResults: KeyResult[]) {
  const krsWithCheckins = keyResults.filter((kr) => kr.checkIns.length > 0)
  if (!krsWithCheckins.length) return { progress: 0, confidence: 0, hasData: false }

  const totalProgress = krsWithCheckins.reduce((s, kr) => s + kr.checkIns[0].progress, 0)
  const totalConfidence = krsWithCheckins.reduce((s, kr) => s + kr.checkIns[0].confidence, 0)

  return {
    progress: Math.round(totalProgress / krsWithCheckins.length),
    confidence: Math.round(totalConfidence / krsWithCheckins.length),
    hasData: true,
  }
}

export function ObjectiveCard({
  id,
  title,
  description,
  teamName,
  tags,
  keyResults,
  status,
  level,
}: ObjectiveCardProps) {
  const { progress, confidence, hasData } = getLatestMetrics(keyResults)

  return (
    <Link href={`/objectives/${id}`} className="block group">
      <div
        className={`bg-white rounded-xl border transition-all duration-200 p-5 h-full hover:shadow-md hover:border-indigo-200 ${
          status === 'closed' ? 'opacity-60 border-gray-200' : 'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {teamName && (
              <p className="text-xs font-medium text-indigo-600 mb-1 truncate">{teamName}</p>
            )}
            {level === 'company' && (
              <p className="text-xs font-medium text-purple-600 mb-1">🏢 Company</p>
            )}
            <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
              {title}
            </h3>
          </div>
          {status === 'closed' && (
            <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              Closed
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{description}</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((t) => (
              <TagBadge key={t.tag.id} name={t.tag.name} color={t.tag.color} />
            ))}
          </div>
        )}

        <div className="mt-auto space-y-2">
          <ProgressBar value={progress} label="Progress" size="sm" />
          <ProgressBar value={confidence} label="Confidence" size="sm" />
          {!hasData && (
            <p className="text-xs text-gray-400 italic">No check-ins yet</p>
          )}
          <p className="text-xs text-gray-400">
            {keyResults.length} key result{keyResults.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}
