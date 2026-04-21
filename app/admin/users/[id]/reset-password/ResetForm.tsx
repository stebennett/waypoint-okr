"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function ResetForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    setPending(false)
    if (res.ok) {
      setDone(true)
      setTimeout(() => router.push("/admin/users"), 1500)
    } else {
      setError((await res.json()).error ?? "Failed")
    }
  }

  if (done) return <p className="text-green-600">Password reset. Existing sessions were invalidated.</p>

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-sm mb-1">New password</label>
        <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Set password</button>
    </form>
  )
}
