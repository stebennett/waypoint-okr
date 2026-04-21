'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ObjectiveCard } from './components/ObjectiveCard'
import { formatDate } from '@/lib/utils'

interface Quarter {
  id: string
  name: string
  startDate: Date | string
  endDate: Date | string
  status: string
}

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

interface Team {
  id: string
  name: string
}

interface ChildObjective {
  id: string
  title: string
  description?: string | null
  level: string
  status: string
  team: Team | null
  tags: Tag[]
  keyResults: KeyResult[]
  parent?: { id: string; title: string } | null
}

interface Objective {
  id: string
  title: string
  description?: string | null
  level: string
  status: string
  team: Team | null
  tags: Tag[]
  keyResults: KeyResult[]
  parent: { id: string; title: string } | null
  children: ChildObjective[]
}

interface DashboardClientProps {
  quarters: Quarter[]
  activeQuarter: Quarter
  objectives: Objective[]
  role: string
}

export function DashboardClient({ quarters, activeQuarter, objectives, role }: DashboardClientProps) {
  const router = useRouter()
  const canMutate = role === 'okr_manager' || role === 'admin'

  const companyObjectives = objectives.filter((o) => o.level === 'company')
  const teamObjectives = objectives.filter((o) => o.level === 'team')

  const groupedByTeam = teamObjectives.reduce<Record<string, Objective[]>>((acc, obj) => {
    const key = obj.team?.id ?? 'no-team'
    if (!acc[key]) acc[key] = []
    acc[key].push(obj)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {formatDate(activeQuarter.startDate)} – {formatDate(activeQuarter.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeQuarter.id}
            onChange={(e) => router.push(`/?quarterId=${e.target.value}`)}
            className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {quarters.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} {q.status === 'closed' ? '(closed)' : ''}
              </option>
            ))}
          </select>
          {canMutate && (
            <Link
              href="/check-in"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              ✓ Weekly Check-in
            </Link>
          )}
          {canMutate && (
            <Link
              href="/objectives/new"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              + New Objective
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Objectives" value={objectives.length} />
        <StatCard label="Company OKRs" value={companyObjectives.length} />
        <StatCard label="Team OKRs" value={teamObjectives.length} />
        <StatCard
          label="Active"
          value={objectives.filter((o) => o.status === 'active').length}
          highlight
        />
      </div>

      {/* Company Objectives */}
      {companyObjectives.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏢</span>
            <h2 className="text-lg font-semibold text-gray-900">Company Objectives</h2>
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {companyObjectives.length}
            </span>
          </div>
          <div className="space-y-4">
            {companyObjectives.map((obj) => (
              <div key={obj.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Link
                    href={`/objectives/${obj.id}`}
                    className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors text-base"
                  >
                    {obj.title}
                  </Link>
                  {obj.status === 'closed' && (
                    <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Closed
                    </span>
                  )}
                </div>
                {obj.description && (
                  <p className="text-sm text-gray-500 mb-3">{obj.description}</p>
                )}
                {obj.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {obj.tags.map((t) => (
                      <span
                        key={t.tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: t.tag.color }}
                      >
                        {t.tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Aligned team objectives */}
                {obj.children.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      Aligned Team Objectives
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {obj.children.map((child) => (
                        <ObjectiveCard
                          key={child.id}
                          id={child.id}
                          title={child.title}
                          description={child.description}
                          teamName={child.team?.name}
                          tags={child.tags}
                          keyResults={child.keyResults}
                          status={child.status}
                          level={child.level}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team Objectives */}
      {Object.keys(groupedByTeam).length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">👥</span>
            <h2 className="text-lg font-semibold text-gray-900">Team Objectives</h2>
          </div>
          <div className="space-y-6">
            {Object.entries(groupedByTeam).map(([teamId, objs]) => {
              const teamName = objs[0]?.team?.name ?? 'Unassigned'
              return (
                <div key={teamId}>
                  <div className="flex items-center gap-2 mb-3">
                    <Link
                      href={teamId !== 'no-team' ? `/teams/${teamId}` : '/teams'}
                      className="font-medium text-gray-700 hover:text-indigo-600 transition-colors text-sm"
                    >
                      {teamName}
                    </Link>
                    <span className="text-xs text-gray-400">({objs.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {objs.map((obj) => (
                      <ObjectiveCard
                        key={obj.id}
                        id={obj.id}
                        title={obj.title}
                        description={obj.description}
                        teamName={null}
                        tags={obj.tags}
                        keyResults={obj.keyResults}
                        status={obj.status}
                        level={obj.level}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {objectives.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-3">No objectives yet for {activeQuarter.name}</p>
          {canMutate && (
            <Link
              href="/objectives/new"
              className="text-indigo-600 font-medium hover:text-indigo-700 text-sm"
            >
              + Add the first objective
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'
      }`}
    >
      <p className={`text-2xl font-bold ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className={`text-xs mt-1 ${highlight ? 'text-indigo-500' : 'text-gray-500'}`}>{label}</p>
    </div>
  )
}
