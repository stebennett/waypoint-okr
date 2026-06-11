import NextAuth from 'next-auth'
import Slack from 'next-auth/providers/slack'
import {
  getAuthConfig,
  getIdentityRestrictions,
  isAllowedIdentity,
  isPartialAuthConfig,
} from '@/lib/auth-config'

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
  callbacks: {
    // Gate sign-in on the optional workspace / email-domain allow-list. Slack
    // having authenticated the user is not enough on its own: a
    // workspace-installed app still lets in guests, and a distributed app lets
    // in any Slack account. Returning false denies the session.
    signIn({ profile }) {
      return isAllowedIdentity(
        {
          teamId: profile?.['https://slack.com/team_id'] as string | undefined,
          email: profile?.email as string | undefined,
          emailVerified: profile?.email_verified as boolean | undefined,
        },
        getIdentityRestrictions()
      )
    },
  },
})
