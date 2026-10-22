import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { getAuthConfig } from '@/lib/auth-config'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (session) redirect('/')

  const { callbackUrl } = await searchParams
  const configured = Boolean(getAuthConfig())

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 w-full max-w-sm text-center">
        <span className="text-4xl">🎯</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Waypoint</h1>
        <p className="text-sm text-gray-600 mt-1 mb-8">
          Sign in to manage your Objectives and Key Results
        </p>
        {configured ? (
          <form
            action={async () => {
              'use server'
              await signIn('slack', { redirectTo: callbackUrl ?? '/' })
            }}
          >
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 122.8 122.8" aria-hidden="true">
                <path
                  d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
                  fill="#e01e5a"
                />
                <path
                  d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
                  fill="#36c5f0"
                />
                <path
                  d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
                  fill="#2eb67d"
                />
                <path
                  d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
                  fill="#ecb22e"
                />
              </svg>
              Sign in with Slack
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">
            Slack login is not configured. Set <code>AUTH_SLACK_ID</code>,{' '}
            <code>AUTH_SLACK_SECRET</code> and <code>AUTH_SECRET</code> to
            enable it.
          </p>
        )}
      </div>
    </div>
  )
}
