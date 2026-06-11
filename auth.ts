import NextAuth from 'next-auth'
import Slack from 'next-auth/providers/slack'
import { getAuthConfig } from '@/lib/auth-config'

const config = getAuthConfig()

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
