"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

type U = { id: string; email: string; name: string | null; role: string }

export default function EditUserForm({ user }: { user: U }) {
  const router = useRouter()
  const [name, setName] = useState(user.name ?? "")
  const [role, setRole] = useState(user.role)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || null, role }),
    })
    setPending(false)
    if (res.ok) router.push("/admin/users")
    else setError((await res.json()).error ?? "Failed")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded px-3 py-2">
          <option value="viewer">Viewer</option>
          <option value="okr_manager">OKR manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Save</button>
    </form>
  )
}
