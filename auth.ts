import NextAuth from 'next-auth'
import Slack from 'next-auth/providers/slack'
import { getAuthConfig, isPartialAuthConfig } from '@/lib/auth-config'

const config = getAuthConfig()

if (!config && isPartialAuthConfig()) {
  console.warn(
    'Slack login is DISABLED: AUTH_SLACK_ID, AUTH_SLACK_SECRET, and AUTH_SECRET must all be set to enable it.'
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The placeholder keeps NextAuth from throwing when auth is disabled;
  // in that state the middleware protects nothing, so it grants no access.
  secret: config?.secret ?? 'placeholder-secret-auth-disabled',
  trustHost: true,
  providers: config
    ? [Slack({ clientId: config.clientId, clientSecret: config.clientSecret })]
    : [],
  pages: {
    signIn: '/login',
  },
})
