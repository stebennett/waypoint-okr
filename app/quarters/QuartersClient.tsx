'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface Quarter {
  id: string
  name: string
  startDate: Date | string
  endDate: Date | string
  status: string
  _count: { objectives: number }
}

export function QuartersClient({ initialQuarters }: { initialQuarters: Quarter[] }) {
  const [quarters, setQuarters] = useState(initialQuarters)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function createQuarter(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/quarters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create quarter')
      } else {
        setQuarters([{ ...data, _count: { objectives: 0 } }, ...quarters])
        setForm({ name: '', startDate: '', endDate: '' })
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function closeQuarter(id: string, name: string) {
    if (!confirm(`Close quarter "${name}"? This will mark it as closed.`)) return
    try {
      const res = await fetch(`/api/quarters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (res.ok) {
        setQuarters(quarters.map((q) => (q.id === id ? { ...q, status: 'closed' } : q)))
        router.refresh()
      }
    } catch {
      alert('Failed to close quarter')
    }
  }

  async function reopenQuarter(id: string) {
    try {
      const res = await fetch(`/api/quarters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        setQuarters(quarters.map((q) => (q.id === id ? { ...q, status: 'active' } : q)))
        router.refresh()
      }
    } catch {
      alert('Failed to reopen quarter')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quarters</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your planning quarters</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Create Quarter</h2>
        <form onSubmit={createQuarter} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Q2 2026"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create Quarter'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {quarters.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center">No quarters yet.</p>
        ) : (
          quarters.map((q) => (
            <div key={q.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quarters/${q.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {q.name}
                    </Link>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(q.startDate)} – {formatDate(q.endDate)} · {q._count.objectives} objectives
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/quarters/${q.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    View →
                  </Link>
                  {q.status === 'active' ? (
                    <button
                      onClick={() => closeQuarter(q.id, q.name)}
                      className="text-xs text-amber-600 hover:text-amber-700"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      onClick={() => reopenQuarter(q.id)}
                      className="text-xs text-green-600 hover:text-green-700"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
