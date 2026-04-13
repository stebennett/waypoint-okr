'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProgressBar } from '@/app/components/ProgressBar'
import { TagBadge } from '@/app/components/TagBadge'

interface Quarter {
  id: string
  name: string
  status: string
}

interface CheckIn {
  progress: number
  confidence: number
}

interface KeyResult {
  id: string
  title: string
  description?: string | null
  checkIns: CheckIn[]
  finalScore?: number | null
}

interface Tag {
  tag: { id: string; name: string; color: string }
}

interface Objective {
  id: string
  title: string
  description?: string | null
  status: string
  tags: Tag[]
  keyResults: KeyResult[]
  parent: { id: string; title: string } | null
}

interface Team {
  id: string
  name: string
}

interface TeamDetailClientProps {
  team: Team
  quarters: Quarter[]
  activeQuarter: Quarter | null
  objectives: Objective[]
}

export function TeamDetailClient({ team, quarters, activeQuarter, objectives }: TeamDetailClientProps) {
  const router = useRouter()

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/teams" className="text-sm text-gray-400 hover:text-gray-600">
              Teams
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">{team.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          {activeQuarter && (
            <select
              value={activeQuarter.id}
              onChange={(e) => router.push(`/teams/${team.id}?quarterId=${e.target.value}`)}
              className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500"
            >
              {quarters.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} {q.status === 'closed' ? '(closed)' : ''}
                </option>
              ))}
            </select>
          )}
          <Link
            href={`/objectives/new?teamId=${team.id}`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + New Objective
          </Link>
          <Link
            href={`/check-in?teamId=${team.id}`}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ✓ Check-in
          </Link>
        </div>
      </div>

      {!activeQuarter ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400">No quarters available. <Link href="/quarters" className="text-indigo-600">Create one</Link>.</p>
        </div>
      ) : objectives.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-3">No objectives for {activeQuarter.name}</p>
          <Link
            href={`/objectives/new?teamId=${team.id}`}
            className="text-indigo-600 font-medium hover:text-indigo-700 text-sm"
          >
            + Add the first objective
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {objectives.map((obj) => {
            const activeKRs = obj.keyResults
            const krsWithData = activeKRs.filter((kr) => kr.checkIns.length > 0)
            const avgProgress = krsWithData.length
              ? Math.round(krsWithData.reduce((s, kr) => s + kr.checkIns[0].progress, 0) / krsWithData.length)
              : 0
            const avgConfidence = krsWithData.length
              ? Math.round(krsWithData.reduce((s, kr) => s + kr.checkIns[0].confidence, 0) / krsWithData.length)
              : 0

            return (
              <div key={obj.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <Link
                      href={`/objectives/${obj.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors text-base"
                    >
                      {obj.title}
                    </Link>
                    {obj.parent && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ↳ Aligned to:{' '}
                        <Link href={`/objectives/${obj.parent.id}`} className="text-indigo-500 hover:underline">
                          {obj.parent.title}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {obj.status === 'closed' && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Closed
                      </span>
                    )}
                    <Link
                      href={`/objectives/${obj.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      Details →
                    </Link>
                  </div>
                </div>

                {obj.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {obj.tags.map((t) => (
                      <TagBadge key={t.tag.id} name={t.tag.name} color={t.tag.color} />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <ProgressBar value={avgProgress} label="Avg Progress" size="sm" />
                  <ProgressBar value={avgConfidence} label="Avg Confidence" size="sm" />
                </div>

                {activeKRs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Key Results
                    </p>
                    {activeKRs.map((kr) => {
                      const latest = kr.checkIns[0]
                      return (
                        <div key={kr.id} className="flex items-center gap-3 py-2 border-t border-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{kr.title}</p>
                          </div>
                          {latest ? (
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Progress</p>
                                <p className="text-sm font-medium text-gray-900">{latest.progress}%</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Confidence</p>
                                <p className="text-sm font-medium text-gray-900">{latest.confidence}%</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 shrink-0">No check-ins</span>
                          )}
                        </div>
                      )
                    })}
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
