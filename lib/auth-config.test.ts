import { describe, expect, it } from 'vitest'

import { getAuthConfig, isPartialAuthConfig, isPublicPath } from './auth-config'

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
