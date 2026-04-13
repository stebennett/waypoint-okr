'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
  createdAt: Date | string
  _count: { objectives: number }
}

export function TeamsClient({ initialTeams }: { initialTeams: Team[] }) {
  const [teams, setTeams] = useState(initialTeams)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function createTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create team')
      } else {
        setTeams([...teams, { ...data, _count: { objectives: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name)
        ))
        setName('')
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTeam(id: string, name: string) {
    if (!confirm(`Delete team "${name}"? This cannot be undone.`)) return
    try {
      await fetch(`/api/teams/${id}`, { method: 'DELETE' })
      setTeams(teams.filter((t) => t.id !== id))
      router.refresh()
    } catch {
      alert('Failed to delete team')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your teams and their OKRs</p>
      </div>

      {/* Create team form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Create Team</h2>
        <form onSubmit={createTeam} className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Teams list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {teams.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center">No teams yet. Create one above.</p>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <Link
                href={`/teams/${team.id}`}
                className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
              >
                {team.name}
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {team._count.objectives} objective{team._count.objectives !== 1 ? 's' : ''}
                </span>
                <Link
                  href={`/teams/${team.id}`}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  View →
                </Link>
                <button
                  onClick={() => deleteTeam(team.id, team.name)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
