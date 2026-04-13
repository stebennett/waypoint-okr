'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#3b82f6', '#06b6d4',
  '#84cc16', '#f97316',
]

interface Tag {
  id: string
  name: string
  color: string
  _count: { objectives: number }
}

export function TagsClient({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState(initialTags)
  const [form, setForm] = useState({ name: '', color: '#6366f1' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function createTag(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create tag')
      } else {
        setTags([...tags, { ...data, _count: { objectives: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name)
        ))
        setForm({ name: '', color: '#6366f1' })
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTag(id: string, name: string) {
    if (!confirm(`Delete tag "${name}"?`)) return
    try {
      await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      setTags(tags.filter((t) => t.id !== id))
      router.refresh()
    } catch {
      alert('Failed to delete tag')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
        <p className="text-gray-500 text-sm mt-1">Categorise objectives with tags</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Create Tag</h2>
        <form onSubmit={createTag} className="space-y-4">
          <div className="flex gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tag name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              required
            />
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: form.color }}
              />
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-8 h-8 cursor-pointer border-none bg-transparent"
                title="Pick color"
              />
            </div>
          </div>

          {/* Preset colors */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick colors:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    form.color === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating…' : 'Create Tag'}
            </button>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: form.color }}
              >
                {form.name || 'Preview'}
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Tags list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {tags.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center">No tags yet. Create one above.</p>
        ) : (
          tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
                <span className="text-sm text-gray-400">
                  {tag._count.objectives} objective{tag._count.objectives !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {tag._count.objectives > 0 && (
                  <Link
                    href={`/?tagId=${tag.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    View objectives →
                  </Link>
                )}
                <button
                  onClick={() => deleteTag(tag.id, tag.name)}
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
