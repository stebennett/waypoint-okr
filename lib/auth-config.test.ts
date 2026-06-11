import { describe, expect, it } from 'vitest'

import {
  getAuthConfig,
  getIdentityRestrictions,
  isAllowedIdentity,
  isPartialAuthConfig,
  isPublicPath,
} from './auth-config'

const fullEnv = {
  AUTH_SLACK_ID: 'client-id',
  AUTH_SLACK_SECRET: 'client-secret',
  AUTH_SECRET: 'session-secret',
}

describe('getAuthConfig', () => {
  it('returns the config when all variables are set', () => {
    expect(getAuthConfig(fullEnv)).toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      secret: 'session-secret',
    })
  })

  it.each(['AUTH_SLACK_ID', 'AUTH_SLACK_SECRET', 'AUTH_SECRET'])(
    'returns null when %s is missing',
    (key) => {
      const env = { ...fullEnv, [key]: undefined }
      expect(getAuthConfig(env)).toBeNull()
    }
  )

  it('returns null when a variable is empty', () => {
    expect(getAuthConfig({ ...fullEnv, AUTH_SECRET: '' })).toBeNull()
  })
})

describe('isPartialAuthConfig', () => {
  it('is false when nothing is set', () => {
    expect(isPartialAuthConfig({})).toBe(false)
  })

  it('is false when everything is set', () => {
    expect(isPartialAuthConfig(fullEnv)).toBe(false)
  })

  it('is true when only some variables are set', () => {
    expect(isPartialAuthConfig({ AUTH_SECRET: 'session-secret' })).toBe(true)
    expect(
      isPartialAuthConfig({ ...fullEnv, AUTH_SECRET: undefined })
    ).toBe(true)
  })
})

describe('getIdentityRestrictions', () => {
  it('returns no restrictions when nothing is set', () => {
    expect(getIdentityRestrictions({})).toEqual({
      allowedTeamId: undefined,
      allowedEmailDomains: undefined,
    })
  })

  it('reads the allowed team id', () => {
    expect(getIdentityRestrictions({ AUTH_SLACK_TEAM_ID: 'T123' })).toEqual({
      allowedTeamId: 'T123',
      allowedEmailDomains: undefined,
    })
  })

  it('parses, trims, lower-cases and strips @ from email domains', () => {
    expect(
      getIdentityRestrictions({
        AUTH_ALLOWED_EMAIL_DOMAINS: 'Example.com, @acme.io ,',
      })
    ).toEqual({
      allowedTeamId: undefined,
      allowedEmailDomains: ['example.com', 'acme.io'],
    })
  })
})

describe('isAllowedIdentity', () => {
  it('allows any identity when no restrictions are configured', () => {
    expect(
      isAllowedIdentity({ teamId: 'T999', email: 'a@anywhere.com' }, {})
    ).toBe(true)
  })

  describe('team restriction', () => {
    const restrictions = { allowedTeamId: 'T123' }

    it('allows a matching team', () => {
      expect(isAllowedIdentity({ teamId: 'T123' }, restrictions)).toBe(true)
    })

    it('rejects a different team', () => {
      expect(isAllowedIdentity({ teamId: 'T999' }, restrictions)).toBe(false)
    })

    it('rejects a missing team claim', () => {
      expect(isAllowedIdentity({}, restrictions)).toBe(false)
    })
  })

  describe('email domain restriction', () => {
    const restrictions = { allowedEmailDomains: ['example.com'] }

    it('allows a verified email in an allowed domain', () => {
      expect(
        isAllowedIdentity(
          { email: 'user@Example.com', emailVerified: true },
          restrictions
        )
      ).toBe(true)
    })

    it('rejects an allowed domain when the email is unverified', () => {
      expect(
        isAllowedIdentity(
          { email: 'user@example.com', emailVerified: false },
          restrictions
        )
      ).toBe(false)
    })

    it('rejects a domain that is not allowed', () => {
      expect(
        isAllowedIdentity(
          { email: 'user@evil.com', emailVerified: true },
          restrictions
        )
      ).toBe(false)
    })

    it('rejects a missing email', () => {
      expect(isAllowedIdentity({ emailVerified: true }, restrictions)).toBe(
        false
      )
    })
  })

  it('requires every configured restriction to pass', () => {
    const restrictions = {
      allowedTeamId: 'T123',
      allowedEmailDomains: ['example.com'],
    }
    expect(
      isAllowedIdentity(
        { teamId: 'T123', email: 'user@example.com', emailVerified: true },
        restrictions
      )
    ).toBe(true)
    // Right domain, wrong workspace.
    expect(
      isAllowedIdentity(
        { teamId: 'T999', email: 'user@example.com', emailVerified: true },
        restrictions
      )
    ).toBe(false)
  })
})

describe('isPublicPath', () => {
  it.each([
    '/login',
    '/api/auth/signin',
    '/api/auth/callback/slack',
    '/api/health',
  ])('treats %s as public', (path) => {
    expect(isPublicPath(path)).toBe(true)
  })

  it.each(['/', '/teams', '/api/quarters', '/api/authx', '/loginx'])(
    'treats %s as protected',
    (path) => {
      expect(isPublicPath(path)).toBe(false)
    }
  )
})
