'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TagBadge } from '@/app/components/TagBadge'
import { ProgressBar } from '@/app/components/ProgressBar'
import { formatDate } from '@/lib/utils'

interface Quarter {
  id: string
  name: string
  startDate: Date | string
  endDate: Date | string
  status: string
}

interface Team {
  id: string
  name: string
}

interface Tag {
  id: string
  name: string
  color: string
}

interface CheckIn {
  progress: number
  confidence: number
}

interface KeyResult {
  id: string
  title: string
  checkIns: CheckIn[]
  finalScore?: number | null
}

interface ObjectiveTag {
  tag: Tag
}

interface Objective {
  id: string
  title: string
  description?: string | null
  level: string
  status: string
  team: Team | null
  tags: ObjectiveTag[]
  keyResults: KeyResult[]
}

interface QuarterDetailClientProps {
  quarter: Quarter
  objectives: Objective[]
  teams: Team[]
  tags: Tag[]
  selectedTeamId: string | null
  selectedTagId: string | null
}

export function QuarterDetailClient({
  quarter,
  objectives,
  teams,
  tags,
  selectedTeamId,
  selectedTagId,
}: QuarterDetailClientProps) {
  const router = useRouter()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams()
    if (key !== 'teamId' && selectedTeamId) params.set('teamId', selectedTeamId)
    if (key !== 'tagId' && selectedTagId) params.set('tagId', selectedTagId)
    if (value) params.set(key, value)
    router.push(`/quarters/${quarter.id}?${params.toString()}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/quarters" className="text-sm text-gray-400 hover:text-gray-600">
            Quarters
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">{quarter.name}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quarter.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(quarter.startDate)} – {formatDate(quarter.endDate)} ·{' '}
              <span
                className={`font-medium ${
                  quarter.status === 'active' ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {quarter.status}
              </span>
            </p>
          </div>
          <Link
            href={`/objectives/new?quarterId=${quarter.id}`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + New Objective
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedTeamId ?? ''}
          onChange={(e) => setFilter('teamId', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500"
        >
          <option value="">All Teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={selectedTagId ?? ''}
          onChange={(e) => setFilter('tagId', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500"
        >
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{objectives.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Objectives</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">
            {objectives.filter((o) => o.status === 'active').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-400">
            {objectives.filter((o) => o.status === 'closed').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Closed</p>
        </div>
      </div>

      {/* Objectives */}
      {objectives.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-3">No objectives found</p>
          <Link
            href={`/objectives/new?quarterId=${quarter.id}`}
            className="text-indigo-600 font-medium hover:text-indigo-700 text-sm"
          >
            + Add the first objective
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map((obj) => {
            const krsWithData = obj.keyResults.filter((kr) => kr.checkIns.length > 0)
            const avgProgress = krsWithData.length
              ? Math.round(krsWithData.reduce((s, kr) => s + kr.checkIns[0].progress, 0) / krsWithData.length)
              : 0
            const avgConfidence = krsWithData.length
              ? Math.round(krsWithData.reduce((s, kr) => s + kr.checkIns[0].confidence, 0) / krsWithData.length)
              : 0

            return (
              <div
                key={obj.id}
                className={`bg-white rounded-xl border p-5 ${
                  obj.status === 'closed' ? 'border-gray-100 opacity-70' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {obj.level === 'company' ? (
                        <span className="text-xs font-medium text-purple-600">🏢 Company</span>
                      ) : (
                        <span className="text-xs font-medium text-indigo-600">
                          {obj.team?.name ?? 'Unassigned'}
                        </span>
                      )}
                      {obj.status === 'closed' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Closed
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/objectives/${obj.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors"
                    >
                      {obj.title}
                    </Link>
                  </div>
                  <Link
                    href={`/objectives/${obj.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-700 shrink-0"
                  >
                    Details →
                  </Link>
                </div>

                {obj.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {obj.tags.map((t) => (
                      <TagBadge key={t.tag.id} name={t.tag.name} color={t.tag.color} />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <ProgressBar value={avgProgress} label="Progress" size="sm" />
                  <ProgressBar value={avgConfidence} label="Confidence" size="sm" />
                </div>

                {quarter.status === 'closed' && obj.keyResults.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Final Scores</p>
                    <div className="space-y-1">
                      {obj.keyResults.map((kr) => (
                        <div key={kr.id} className="flex justify-between text-xs">
                          <span className="text-gray-600 truncate">{kr.title}</span>
                          <span className="text-gray-900 font-medium shrink-0 ml-2">
                            {kr.finalScore !== null && kr.finalScore !== undefined
                              ? `${kr.finalScore}%`
                              : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
