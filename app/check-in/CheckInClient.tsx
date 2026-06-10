'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { progressColor, progressTextColor, progressBgLight } from '@/lib/utils'

interface Quarter {
  id: string
  name: string
  status: string
}

interface Team {
  id: string
  name: string
}

interface CheckIn {
  progress: number
  confidence: number
}

interface KeyResult {
  id: string
  title: string
  description?: string | null
  jiraJql?: string | null
  checkIns: CheckIn[]
}

interface Objective {
  id: string
  title: string
  description?: string | null
  keyResults: KeyResult[]
}

interface CheckInClientProps {
  quarters: Quarter[]
  teams: Team[]
  objectives: Objective[]
  activeQuarter: Quarter | null
  activeTeam: Team | null
}

type KRCheckIn = {
  progress: number
  confidence: number
  notes: string
}

export function CheckInClient({
  quarters,
  teams,
  objectives,
  activeQuarter,
  activeTeam,
}: CheckInClientProps) {
  const router = useRouter()
  const [checkedInBy, setCheckedInBy] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jiraEditId, setJiraEditId] = useState<string | null>(null)
  const [jiraDraft, setJiraDraft] = useState('')
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [jiraMsg, setJiraMsg] = useState<Record<string, { ok: boolean; text: string }>>({})
  // Local jiraJql edits, so saved queries show without waiting for a server refresh
  const [jqlOverrides, setJqlOverrides] = useState<Record<string, string | null>>({})

  // Build initial check-in state from all KRs
  const [krData, setKrData] = useState<Record<string, KRCheckIn>>(() => {
    const data: Record<string, KRCheckIn> = {}
    objectives.forEach((obj) => {
      obj.keyResults.forEach((kr) => {
        const latest = kr.checkIns[0]
        data[kr.id] = {
          progress: latest?.progress ?? 0,
          confidence: latest?.confidence ?? 50,
          notes: '',
        }
      })
    })
    return data
  })

  // Reset form when objectives change (team/quarter switch)
  useEffect(() => {
    const data: Record<string, KRCheckIn> = {}
    objectives.forEach((obj) => {
      obj.keyResults.forEach((kr) => {
        const latest = kr.checkIns[0]
        data[kr.id] = {
          progress: latest?.progress ?? 0,
          confidence: latest?.confidence ?? 50,
          notes: '',
        }
      })
    })
    setKrData(data)
    setSubmitted(false)
    setError('')
  }, [objectives])

  function updateKR(krId: string, field: keyof KRCheckIn, value: number | string) {
    setKrData((d) => ({ ...d, [krId]: { ...d[krId], [field]: value } }))
  }

  function jqlFor(kr: KeyResult): string | null {
    return jqlOverrides[kr.id] !== undefined ? jqlOverrides[kr.id] : kr.jiraJql ?? null
  }

  async function saveJiraJql(krId: string) {
    const res = await fetch(`/api/key-results/${krId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jiraJql: jiraDraft }),
    })
    if (res.ok) {
      const kr = await res.json()
      setJqlOverrides((o) => ({ ...o, [krId]: kr.jiraJql ?? null }))
      setJiraEditId(null)
      setJiraDraft('')
      setJiraMsg((m) => ({ ...m, [krId]: { ok: true, text: kr.jiraJql ? 'JIRA query linked' : 'JIRA query removed' } }))
      router.refresh()
    } else {
      setJiraMsg((m) => ({ ...m, [krId]: { ok: false, text: 'Failed to save JIRA query' } }))
    }
  }

  async function syncKR(krId: string) {
    setSyncingId(krId)
    setJiraMsg((m) => ({ ...m, [krId]: { ok: true, text: '' } }))
    try {
      const res = await fetch(`/api/key-results/${krId}/sync`, { method: 'POST' })
      const body = await res.json()
      if (res.ok) {
        updateKR(krId, 'progress', body.sync.progress)
        setJiraMsg((m) => ({
          ...m,
          [krId]: {
            ok: true,
            text: `Synced: ${body.sync.done} of ${body.sync.total} issues done (${body.sync.progress}%)`,
          },
        }))
        router.refresh()
      } else {
        setJiraMsg((m) => ({ ...m, [krId]: { ok: false, text: body.error ?? 'Sync failed' } }))
      }
    } catch {
      setJiraMsg((m) => ({ ...m, [krId]: { ok: false, text: 'Sync failed' } }))
    } finally {
      setSyncingId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const allKRs = objectives.flatMap((obj) => obj.keyResults)
    if (!allKRs.length) {
      setError('No key results to check in on.')
      return
    }

    setLoading(true)
    try {
      const checkIns = allKRs.map((kr) => ({
        keyResultId: kr.id,
        progress: krData[kr.id]?.progress ?? 0,
        confidence: krData[kr.id]?.confidence ?? 50,
        notes: krData[kr.id]?.notes || null,
      }))
      const res = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIns, checkedInBy }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to submit check-in')
      } else {
        setSubmitted(true)
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const totalKRs = objectives.reduce((s, o) => s + o.keyResults.length, 0)

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-in submitted!</h2>
        <p className="text-gray-500 mb-6">
          Great work. {totalKRs} key result{totalKRs !== 1 ? 's' : ''} updated for{' '}
          {activeTeam?.name}.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setSubmitted(false)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Check in again
          </button>
          <button
            onClick={() => router.push('/')}
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Check-in</h1>
        <p className="text-gray-500 text-sm mt-1">
          Update progress and confidence for your team&apos;s key results
        </p>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
            <select
              value={activeQuarter?.id ?? ''}
              onChange={(e) => {
                const params = new URLSearchParams()
                params.set('quarterId', e.target.value)
                if (activeTeam) params.set('teamId', activeTeam.id)
                router.push(`/check-in?${params.toString()}`)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 outline-none"
            >
              <option value="">Select quarter…</option>
              {quarters.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} {q.status === 'closed' ? '(closed)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <select
              value={activeTeam?.id ?? ''}
              onChange={(e) => {
                const params = new URLSearchParams()
                if (activeQuarter) params.set('quarterId', activeQuarter.id)
                if (e.target.value) params.set('teamId', e.target.value)
                router.push(`/check-in?${params.toString()}`)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 outline-none"
            >
              <option value="">Select team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!activeQuarter || !activeTeam ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400">Select a quarter and team to begin check-in</p>
        </div>
      ) : objectives.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-2">
            No active objectives for {activeTeam.name} in {activeQuarter.name}
          </p>
          <Link href="/objectives/new" className="text-indigo-600 text-sm font-medium hover:text-indigo-700">
            + Add objectives
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Your name */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={checkedInBy}
              onChange={(e) => setCheckedInBy(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Objectives and KRs */}
          {objectives.map((obj, objIndex) => (
            <div key={obj.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-white px-5 py-4 border-b border-gray-100">
                <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-0.5">
                  Objective {objIndex + 1}
                </p>
                <h3 className="font-semibold text-gray-900">{obj.title}</h3>
                {obj.description && (
                  <p className="text-xs text-gray-500 mt-1">{obj.description}</p>
                )}
              </div>

              {obj.keyResults.length === 0 ? (
                <p className="text-gray-400 text-sm p-5 italic">No key results — add some first.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {obj.keyResults.map((kr, krIndex) => {
                    const data = krData[kr.id] ?? { progress: 0, confidence: 50, notes: '' }
                    const progressColorClass = progressColor(data.progress)
                    const progressTextClass = progressTextColor(data.progress)
                    const progressBgClass = progressBgLight(data.progress)
                    const confidenceColorClass = progressColor(data.confidence)
                    const confidenceTextClass = progressTextColor(data.confidence)

                    return (
                      <div key={kr.id} className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                            {krIndex + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{kr.title}</p>
                            {kr.description && (
                              <p className="text-xs text-gray-400 mt-0.5">{kr.description}</p>
                            )}
                          </div>
                          {kr.checkIns[0] && (
                            <div className="text-xs text-gray-400 shrink-0">
                              Last: {kr.checkIns[0].progress}% / {kr.checkIns[0].confidence}%
                            </div>
                          )}
                        </div>

                        {/* JIRA link & sync */}
                        <div className="mb-4">
                          {jiraEditId === kr.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={jiraDraft}
                                onChange={(e) => setJiraDraft(e.target.value)}
                                placeholder='JQL, e.g. project = ABC AND fixVersion = "1.0" (leave empty to unlink)'
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-indigo-500 outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => saveJiraJql(kr.id)}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setJiraEditId(null)
                                  setJiraDraft('')
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : jqlFor(kr) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                                JIRA
                              </span>
                              <code className="text-xs text-gray-600 truncate flex-1" title={jqlFor(kr) ?? ''}>
                                {jqlFor(kr)}
                              </code>
                              <button
                                type="button"
                                onClick={() => syncKR(kr.id)}
                                disabled={syncingId === kr.id}
                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0"
                              >
                                {syncingId === kr.id ? 'Syncing…' : '⟳ Sync'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setJiraEditId(kr.id)
                                  setJiraDraft(jqlFor(kr) ?? '')
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setJiraEditId(kr.id)
                                setJiraDraft('')
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              🔗 Link JIRA query
                            </button>
                          )}
                          {jiraMsg[kr.id]?.text && (
                            <p className={`text-xs mt-1 ${jiraMsg[kr.id].ok ? 'text-green-600' : 'text-red-600'}`}>
                              {jiraMsg[kr.id].text}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                          {/* Progress */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-medium text-gray-600">Progress</label>
                              <span className={`text-sm font-bold ${progressTextClass}`}>
                                {data.progress}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={data.progress}
                              onChange={(e) => updateKR(kr.id, 'progress', Number(e.target.value))}
                              className="w-full h-2 rounded-full appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, ${
                                  data.progress <= 33 ? '#ef4444' : data.progress <= 66 ? '#f59e0b' : '#22c55e'
                                } ${data.progress}%, #e5e7eb ${data.progress}%)`,
                              }}
                            />
                            <div className="flex justify-between text-xs text-gray-300 mt-1">
                              <span>0</span><span>50</span><span>100</span>
                            </div>
                            {/* Number input fallback */}
                            <div className={`mt-2 flex items-center gap-2 rounded-lg p-2 ${progressBgClass}`}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={data.progress}
                                onChange={(e) =>
                                  updateKR(kr.id, 'progress', Math.min(100, Math.max(0, Number(e.target.value))))
                                }
                                className="w-16 rounded border border-gray-200 px-2 py-1 text-xs text-center focus:border-indigo-500 outline-none bg-white"
                              />
                              <div className={`flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200`}>
                                <div
                                  className={`h-full rounded-full transition-all ${progressColorClass}`}
                                  style={{ width: `${data.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Confidence */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-medium text-gray-600">Confidence</label>
                              <span className={`text-sm font-bold ${confidenceTextClass}`}>
                                {data.confidence}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={data.confidence}
                              onChange={(e) => updateKR(kr.id, 'confidence', Number(e.target.value))}
                              className="w-full h-2 rounded-full appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, ${
                                  data.confidence <= 33 ? '#ef4444' : data.confidence <= 66 ? '#f59e0b' : '#22c55e'
                                } ${data.confidence}%, #e5e7eb ${data.confidence}%)`,
                              }}
                            />
                            <div className="flex justify-between text-xs text-gray-300 mt-1">
                              <span>0</span><span>50</span><span>100</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 rounded-lg p-2 bg-gray-50">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={data.confidence}
                                onChange={(e) =>
                                  updateKR(kr.id, 'confidence', Math.min(100, Math.max(0, Number(e.target.value))))
                                }
                                className="w-16 rounded border border-gray-200 px-2 py-1 text-xs text-center focus:border-indigo-500 outline-none bg-white"
                              />
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
                                <div
                                  className={`h-full rounded-full transition-all ${confidenceColorClass}`}
                                  style={{ width: `${data.confidence}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <input
                          value={data.notes}
                          onChange={(e) => updateKR(kr.id, 'notes', e.target.value)}
                          placeholder="Notes for this week… (optional)"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 outline-none text-gray-700 placeholder-gray-300"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Summary bar */}
          <div className="bg-indigo-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Ready to submit?</p>
                <p className="text-indigo-200 text-sm">
                  {totalKRs} key result{totalKRs !== 1 ? 's' : ''} across {objectives.length} objective
                  {objectives.length !== 1 ? 's' : ''} for {activeTeam.name}
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-indigo-700 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors shrink-0"
              >
                {loading ? 'Submitting…' : 'Submit Check-in'}
              </button>
            </div>
            {error && <p className="text-red-200 text-sm mt-2">{error}</p>}
          </div>
        </form>
      )}
    </div>
  )
}
