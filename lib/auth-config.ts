export interface AuthConfig {
  clientId: string
  clientSecret: string
  secret: string
}

// Slack login is enabled only when all three variables are set, mirroring
// the optional JIRA integration in lib/jira.ts. With no config the app
// stays open, exactly as before auth existed.
export function getAuthConfig(
  env: Record<string, string | undefined> = process.env
): AuthConfig | null {
  const clientId = env.AUTH_SLACK_ID
  const clientSecret = env.AUTH_SLACK_SECRET
  const secret = env.AUTH_SECRET
  if (!clientId || !clientSecret || !secret) return null
  return { clientId, clientSecret, secret }
}

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/health']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}
