"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function NewUserForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"viewer" | "okr_manager" | "admin">("viewer")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: name || undefined, password, role }),
    })
    setPending(false)
    if (res.ok) router.push("/admin/users")
    else setError((await res.json()).error ?? "Failed")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Initial password</label>
        <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as "viewer" | "okr_manager" | "admin")} className="w-full border rounded px-3 py-2">
          <option value="viewer">Viewer</option>
          <option value="okr_manager">OKR manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Create</button>
    </form>
  )
}
