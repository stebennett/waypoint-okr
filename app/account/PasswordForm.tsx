"use client"
import { useState } from "react"

export default function PasswordForm() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (next !== confirm) {
      setMessage({ kind: "err", text: "New passwords do not match" })
      return
    }
    setPending(true)
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    setPending(false)
    if (res.ok) {
      setMessage({ kind: "ok", text: "Password updated." })
      setCurrent(""); setNext(""); setConfirm("")
    } else {
      setMessage({ kind: "err", text: (await res.json()).error ?? "Failed" })
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Current password</label>
        <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">New password</label>
        <input type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Confirm new password</label>
        <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      {message && (
        <p className={message.kind === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>{message.text}</p>
      )}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Update password</button>
    </form>
  )
}
