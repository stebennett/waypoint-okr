"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginForm({
  callbackUrl,
  error,
  slackEnabled,
}: {
  callbackUrl: string
  error?: string
  slackEnabled: boolean
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(
    error ? "Invalid email or password" : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setLocalError(null)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    })
    setPending(false)
    if (res?.error) {
      setLocalError("Invalid email or password")
    } else {
      window.location.href = res?.url ?? callbackUrl
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      {localError && <p className="text-red-600 text-sm">{localError}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {slackEnabled && (
        <button
          type="button"
          onClick={() => signIn("slack", { callbackUrl })}
          className="w-full border rounded py-2"
        >
          Continue with Slack
        </button>
      )}
    </form>
  )
}
