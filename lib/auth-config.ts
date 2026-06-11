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

// Some-but-not-all AUTH vars set is almost certainly a deployment mistake;
// callers use this to warn instead of silently running without auth.
export function isPartialAuthConfig(
  env: Record<string, string | undefined> = process.env
): boolean {
  const values = [env.AUTH_SLACK_ID, env.AUTH_SLACK_SECRET, env.AUTH_SECRET]
  const present = values.filter(Boolean).length
  return present > 0 && present < values.length
}

export interface IdentityRestrictions {
  // Slack workspace (team) the user must belong to, from AUTH_SLACK_TEAM_ID.
  allowedTeamId?: string
  // Verified email domains the user must match, from AUTH_ALLOWED_EMAIL_DOMAINS.
  allowedEmailDomains?: string[]
}

// Optional allow-list controls applied after a successful Slack sign-in. When
// neither variable is set, any identity Slack authenticates is allowed (the
// original behaviour). Setting either one tightens who may obtain a session:
// a workspace-installed app still admits single/multi-channel guests, and a
// distributed app admits any Slack account, unless these gate them out.
export function getIdentityRestrictions(
  env: Record<string, string | undefined> = process.env
): IdentityRestrictions {
  const allowedTeamId = env.AUTH_SLACK_TEAM_ID?.trim() || undefined
  const allowedEmailDomains = env.AUTH_ALLOWED_EMAIL_DOMAINS?.split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
  return {
    allowedTeamId,
    allowedEmailDomains:
      allowedEmailDomains && allowedEmailDomains.length > 0
        ? allowedEmailDomains
        : undefined,
  }
}

export interface SlackIdentity {
  teamId?: string
  email?: string
  emailVerified?: boolean
}

// Returns true only if the identity satisfies every configured restriction.
// Fails closed: when a restriction is configured but the corresponding claim
// is missing, the identity is rejected.
export function isAllowedIdentity(
  identity: SlackIdentity,
  restrictions: IdentityRestrictions
): boolean {
  if (restrictions.allowedTeamId) {
    if (identity.teamId !== restrictions.allowedTeamId) return false
  }

  if (restrictions.allowedEmailDomains) {
    if (!identity.email || identity.emailVerified !== true) return false
    const domain = identity.email.toLowerCase().split('@')[1]
    if (!domain || !restrictions.allowedEmailDomains.includes(domain)) {
      return false
    }
  }

  return true
}

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/health']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}
