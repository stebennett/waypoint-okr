'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProgressBar } from '@/app/components/ProgressBar'
import { TagBadge } from '@/app/components/TagBadge'
import { formatDate } from '@/lib/utils'

interface CheckIn {
  id: string
  progress: number
  confidence: number
  notes?: string | null
  createdAt: string | Date
}

interface KeyResult {
  id: string
  title: string
  description?: string | null
  checkIns: CheckIn[]
  finalScore?: number | null
  closeNote?: string | null
}

interface Tag {
  tag: { id: string; name: string; color: string }
}

interface ChildObjective {
  id: string
  title: string
  team: { id: string; name: string } | null
  keyResults: { id: string; checkIns: { progress: number; confidence: number }[] }[]
}

interface Objective {
  id: string
  title: string
  description?: string | null
  level: string
  status: string
  quarter: { id: string; name: string }
  team: { id: string; name: string } | null
  tags: Tag[]
  parent: { id: string; title: string; level: string } | null
  children: ChildObjective[]
  keyResults: KeyResult[]
  closeNote?: string | null
  closedAt?: string | Date | null
}

export function ObjectiveDetailClient({ objective: initial, role }: { objective: Objective; role: string }) {
  const [objective, setObjective] = useState(initial)
  const [showAddKR, setShowAddKR] = useState(false)
  const [newKRTitle, setNewKRTitle] = useState('')
  const [newKRDesc, setNewKRDesc] = useState('')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [checkInData, setCheckInData] = useState<
    Record<string, { progress: number; confidence: number; notes: string }>
  >(() => {
    const data: Record<string, { progress: number; confidence: number; notes: string }> = {}
    initial.keyResults.forEach((kr) => {
      const latest = kr.checkIns[0]
      data[kr.id] = {
        progress: latest?.progress ?? 0,
        confidence: latest?.confidence ?? 50,
        notes: '',
      }
    })
    return data
  })
  const [closeNote, setCloseNote] = useState('')
  const [closingKRScores, setClosingKRScores] = useState<Record<string, string>>(() => {
    const scores: Record<string, string> = {}
    initial.keyResults.forEach((kr) => {
      const latest = kr.checkIns[0]
      scores[kr.id] = String(latest?.progress ?? 0)
    })
    return scores
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const canMutate = role === 'okr_manager' || role === 'admin'

  async function addKR(e: React.FormEvent) {
    e.preventDefault()
    if (!newKRTitle.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/objectives/${objective.id}/key-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newKRTitle, description: newKRDesc || null }),
      })
      if (res.ok) {
        const kr = await res.json()
        setObjective((o) => ({ ...o, keyResults: [...o.keyResults, kr] }))
        setCheckInData((d) => ({ ...d, [kr.id]: { progress: 0, confidence: 50, notes: '' } }))
        setClosingKRScores((s) => ({ ...s, [kr.id]: '0' }))
        setNewKRTitle('')
        setNewKRDesc('')
        setShowAddKR(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function deleteKR(krId: string) {
    if (!confirm('Delete this key result?')) return
    await fetch(`/api/key-results/${krId}`, { method: 'DELETE' })
    setObjective((o) => ({ ...o, keyResults: o.keyResults.filter((kr) => kr.id !== krId) }))
    router.refresh()
  }

  async function submitCheckIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const checkIns = objective.keyResults.map((kr) => ({
        keyResultId: kr.id,
        progress: checkInData[kr.id]?.progress ?? 0,
        confidence: checkInData[kr.id]?.confidence ?? 50,
        notes: checkInData[kr.id]?.notes || null,
      }))
      const res = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIns }),
      })
      if (res.ok) {
        // Refresh objective data
        const objRes = await fetch(`/api/objectives/${objective.id}`)
        if (objRes.ok) {
          const updated = await objRes.json()
          setObjective(updated)
          // Reset check-in form with new latest values
          const newData: typeof checkInData = {}
          updated.keyResults.forEach((kr: KeyResult) => {
            newData[kr.id] = {
              progress: kr.checkIns[0]?.progress ?? 0,
              confidence: kr.checkIns[0]?.confidence ?? 50,
              notes: '',
            }
          })
          setCheckInData(newData)
        }
        setShowCheckIn(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function closeObjective(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const keyResults = objective.keyResults.map((kr) => ({
        id: kr.id,
        finalScore: Number(closingKRScores[kr.id] ?? 0),
      }))
      const res = await fetch(`/api/objectives/${objective.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeNote, keyResults }),
      })
      if (res.ok) {
        const updated = await res.json()
        setObjective((o) => ({ ...o, ...updated }))
        setShowClose(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const latestCheckIns = objective.keyResults.map((kr) => ({
    kr,
    latest: kr.checkIns[0] ?? null,
  }))

  const avgProgress =
    latestCheckIns.filter((x) => x.latest).length
      ? Math.round(
          latestCheckIns.filter((x) => x.latest).reduce((s, x) => s + x.latest!.progress, 0) /
            latestCheckIns.filter((x) => x.latest).length
        )
      : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/" className="text-gray-400 hover:text-gray-600">Dashboard</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/quarters/${objective.quarter.id}`} className="text-gray-400 hover:text-gray-600">
          {objective.quarter.name}
        </Link>
        {objective.team && (
          <>
            <span className="text-gray-300">/</span>
            <Link href={`/teams/${objective.team.id}`} className="text-gray-400 hover:text-gray-600">
              {objective.team.name}
            </Link>
          </>
        )}
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 truncate max-w-[200px]">{objective.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  objective.level === 'company'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {objective.level === 'company' ? '🏢 Company' : `👥 ${objective.team?.name ?? 'Team'}`}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  objective.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {objective.status}
              </span>
              {objective.tags.map((t) => (
                <TagBadge key={t.tag.id} name={t.tag.name} color={t.tag.color} />
              ))}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{objective.title}</h1>
            {objective.description && (
              <p className="text-gray-500 text-sm mt-2">{objective.description}</p>
            )}
          </div>
        </div>

        {/* Alignment */}
        {objective.parent && (
          <div className="bg-indigo-50 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-indigo-600 font-medium mb-1">Aligned to Company Objective</p>
            <Link href={`/objectives/${objective.parent.id}`} className="text-sm text-indigo-800 hover:underline font-medium">
              {objective.parent.title}
            </Link>
          </div>
        )}

        {/* Overall progress */}
        {objective.keyResults.length > 0 && (
          <div className="mb-4">
            <ProgressBar value={avgProgress} label="Overall Progress" />
          </div>
        )}

        {/* Close note */}
        {objective.status === 'closed' && objective.closeNote && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-gray-500 font-medium mb-1">
              Closed {objective.closedAt ? formatDate(objective.closedAt) : ''}
            </p>
            <p className="text-sm text-gray-700">{objective.closeNote}</p>
          </div>
        )}

        {/* Actions — okr_manager and admin only */}
        {objective.status === 'active' && canMutate && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowCheckIn(!showCheckIn)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              ✓ Check In
            </button>
            <button
              onClick={() => setShowAddKR(!showAddKR)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              + Add Key Result
            </button>
            <button
              onClick={() => setShowClose(!showClose)}
              className="border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors ml-auto"
            >
              Close Objective
            </button>
          </div>
        )}
      </div>

      {/* Check-in modal */}
      {showCheckIn && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Check In</h2>
          <form onSubmit={submitCheckIn} className="space-y-5">
            {objective.keyResults.map((kr) => (
              <div key={kr.id} className="border border-gray-100 rounded-lg p-4">
                <p className="font-medium text-gray-800 text-sm mb-3">{kr.title}</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Progress: {checkInData[kr.id]?.progress ?? 0}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={checkInData[kr.id]?.progress ?? 0}
                      onChange={(e) =>
                        setCheckInData((d) => ({
                          ...d,
                          [kr.id]: { ...d[kr.id], progress: Number(e.target.value) },
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Confidence: {checkInData[kr.id]?.confidence ?? 50}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={checkInData[kr.id]?.confidence ?? 50}
                      onChange={(e) =>
                        setCheckInData((d) => ({
                          ...d,
                          [kr.id]: { ...d[kr.id], confidence: Number(e.target.value) },
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                <input
                  placeholder="Notes (optional)"
                  value={checkInData[kr.id]?.notes ?? ''}
                  onChange={(e) =>
                    setCheckInData((d) => ({
                      ...d,
                      [kr.id]: { ...d[kr.id], notes: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
            ))}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save Check-in'}
              </button>
              <button
                type="button"
                onClick={() => setShowCheckIn(false)}
                className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add KR form */}
      {showAddKR && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Add Key Result</h2>
          <form onSubmit={addKR} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={newKRTitle}
                onChange={(e) => setNewKRTitle(e.target.value)}
                placeholder="e.g. Increase NPS score to 50"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={newKRDesc}
                onChange={(e) => setNewKRDesc(e.target.value)}
                placeholder="Optional details"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Adding…' : 'Add Key Result'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddKR(false)}
                className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Close form */}
      {showClose && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Close Objective</h2>
          <p className="text-sm text-gray-500 mb-4">Set final scores and add a closing note.</p>
          <form onSubmit={closeObjective} className="space-y-4">
            {objective.keyResults.map((kr) => (
              <div key={kr.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{kr.title}</p>
                </div>
                <div className="shrink-0">
                  <label className="text-xs text-gray-500 mr-2">Final Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={closingKRScores[kr.id] ?? ''}
                    onChange={(e) => setClosingKRScores((s) => ({ ...s, [kr.id]: e.target.value }))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closing Note</label>
              <textarea
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="What did you learn? What was achieved?"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Closing…' : 'Close Objective'}
              </button>
              <button
                type="button"
                onClick={() => setShowClose(false)}
                className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Key Results */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Key Results ({objective.keyResults.length})
        </h2>
        {objective.keyResults.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 mb-2">No key results yet</p>
            {objective.status === 'active' && (
              <button
                onClick={() => setShowAddKR(true)}
                className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
              >
                + Add the first KR
              </button>
            )}
          </div>
        ) : (
          objective.keyResults.map((kr) => {
            const latest = kr.checkIns[0]
            return (
              <div key={kr.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{kr.title}</p>
                    {kr.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{kr.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {kr.finalScore !== null && kr.finalScore !== undefined && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        Final: {kr.finalScore}%
                      </span>
                    )}
                    {objective.status === 'active' && canMutate && (
                      <button
                        onClick={() => deleteKR(kr.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {latest ? (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <ProgressBar value={latest.progress} label="Progress" size="sm" />
                    <ProgressBar value={latest.confidence} label="Confidence" size="sm" />
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-4 italic">No check-ins yet</p>
                )}

                {/* Check-in history */}
                {kr.checkIns.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      History
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {kr.checkIns.map((ci) => (
                        <div key={ci.id} className="flex items-center gap-3 text-xs py-1.5 border-t border-gray-50">
                          <span className="text-gray-400 shrink-0 w-24">{formatDate(ci.createdAt)}</span>
                          <span className="text-gray-600">
                            Progress: <span className="font-medium text-gray-900">{ci.progress}%</span>
                          </span>
                          <span className="text-gray-600">
                            Confidence: <span className="font-medium text-gray-900">{ci.confidence}%</span>
                          </span>
                          {ci.notes && (
                            <span className="text-gray-500 italic truncate">{ci.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Aligned children */}
      {objective.children.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Aligned Team Objectives ({objective.children.length})
          </h2>
          <div className="space-y-3">
            {objective.children.map((child) => {
              const childLatest = child.keyResults.map((kr) => kr.checkIns[0]).filter(Boolean)
              const childAvg = childLatest.length
                ? Math.round(childLatest.reduce((s, ci) => s + ci!.progress, 0) / childLatest.length)
                : 0
              return (
                <Link
                  key={child.id}
                  href={`/objectives/${child.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="text-xs text-indigo-600 font-medium mb-0.5">{child.team?.name}</p>
                    <p className="font-medium text-gray-900 text-sm">{child.title}</p>
                  </div>
                  <div className="w-24 shrink-0">
                    <ProgressBar value={childAvg} showValue size="sm" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
