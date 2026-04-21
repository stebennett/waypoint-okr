import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import LoginForm from "./LoginForm"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await getSession()
  const params = await searchParams
  if (session?.user) redirect(params.callbackUrl ?? "/")

  const slackEnabled = !!process.env.SLACK_CLIENT_ID
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-semibold mb-4">Sign in to Waypoint</h1>
        <LoginForm
          callbackUrl={params.callbackUrl ?? "/"}
          error={params.error}
          slackEnabled={slackEnabled}
        />
      </div>
    </div>
  )
}
