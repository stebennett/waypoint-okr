"use client"
import { useEffect, useState } from "react"

type Entry = {
  id: string
  entityType: "Objective" | "KeyResult"
  entityId: string
  action: "create" | "update" | "delete"
  changes: Record<string, { from: unknown; to: unknown }> | Record<string, unknown>
  createdAt: string
  user: { id: string; name: string | null; email: string } | null
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return `"${v}"`
  return String(v)
}

function renderEntry(e: Entry): string {
  const who = e.user?.name ?? e.user?.email ?? "deleted user"
  const what = e.entityType === "Objective" ? "objective" : "key result"
  if (e.action === "create") return `${who} created this ${what}`
  if (e.action === "delete") return `${who} deleted this ${what}`
  const diff = e.changes as Record<string, { from: unknown; to: unknown }>
  const parts = Object.entries(diff).map(
    ([field, { from, to }]) => `${field}: ${formatValue(from)} → ${formatValue(to)}`
  )
  return `${who} changed ${parts.join(", ")}`
}

export default function HistoryPanel({ objectiveId }: { objectiveId: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/objectives/${objectiveId}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setEntries)
      .catch((e) => setError(String(e)))
  }, [objectiveId])

  if (error) return <p className="text-red-600 text-sm">Failed to load history: {error}</p>
  if (!entries) return <p className="text-gray-500 text-sm">Loading history…</p>
  if (entries.length === 0) return <p className="text-gray-500 text-sm">No changes yet.</p>

  return (
    <ul className="space-y-2 text-sm">
      {entries.map((e) => (
        <li key={e.id} className="border-l-2 border-gray-200 pl-3">
          <div>{renderEntry(e)}</div>
          <div className="text-xs text-gray-500">
            {new Date(e.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  )
}
