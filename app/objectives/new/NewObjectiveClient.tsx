'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Team {
  id: string
  name: string
}

interface Quarter {
  id: string
  name: string
  status: string
}

interface Tag {
  id: string
  name: string
  color: string
}

interface CompanyObjective {
  id: string
  title: string
  quarter: { id: string; name: string }
}

interface NewObjectiveClientProps {
  teams: Team[]
  quarters: Quarter[]
  tags: Tag[]
  companyObjectives: CompanyObjective[]
  defaultTeamId: string | null
  defaultQuarterId: string | null
}

export function NewObjectiveClient({
  teams,
  quarters,
  tags,
  companyObjectives,
  defaultTeamId,
  defaultQuarterId,
}: NewObjectiveClientProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    level: 'team' as 'company' | 'team',
    teamId: defaultTeamId ?? '',
    quarterId: defaultQuarterId ?? '',
    parentId: '',
    tagIds: [] as string[],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Filter company objectives for selected quarter
  const alignableObjectives = companyObjectives.filter(
    (o) => !form.quarterId || o.quarter.id === form.quarterId
  )

  function toggleTag(tagId: string) {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId)
        ? f.tagIds.filter((id) => id !== tagId)
        : [...f.tagIds, tagId],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) return setError('Title is required')
    if (!form.quarterId) return setError('Quarter is required')
    if (form.level === 'team' && !form.teamId) return setError('Team is required for team-level objectives')

    setLoading(true)
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          level: form.level,
          teamId: form.level === 'team' ? form.teamId : null,
          quarterId: form.quarterId,
          parentId: form.parentId || null,
          tagIds: form.tagIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create objective')
      } else {
        router.push(`/objectives/${data.id}`)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">New Objective</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">New Objective</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Increase customer satisfaction"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Why this objective matters…"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        {/* Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
          <div className="flex gap-3">
            {(['team', 'company'] as const).map((level) => (
              <label
                key={level}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  form.level === level
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="level"
                  value={level}
                  checked={form.level === level}
                  onChange={() => setForm({ ...form, level, teamId: '' })}
                  className="sr-only"
                />
                <span className="capitalize text-sm font-medium">{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Team (only if team level) */}
        {form.level === 'team' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team <span className="text-red-500">*</span>
            </label>
            <select
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              required
            >
              <option value="">Select a team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quarter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quarter <span className="text-red-500">*</span>
          </label>
          <select
            value={form.quarterId}
            onChange={(e) => setForm({ ...form, quarterId: e.target.value, parentId: '' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            required
          >
            <option value="">Select a quarter…</option>
            {quarters.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} {q.status === 'closed' ? '(closed)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    form.tagIds.includes(tag.id)
                      ? 'text-white ring-2 ring-offset-1'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={
                    form.tagIds.includes(tag.id)
                      ? { backgroundColor: tag.color }
                      : {}
                  }
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parent alignment (only for team level) */}
        {form.level === 'team' && alignableObjectives.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Align to Company Objective <span className="text-gray-400">(optional)</span>
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="">None</option>
              {alignableObjectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} ({o.quarter.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create Objective'}
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
