import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  // Pass the wrapped middleware straight through so we can call it directly.
  auth: (handler: (req: NextRequest) => unknown) => handler,
}))

import wrappedMiddleware from './middleware'

type AuthedRequest = NextRequest & { auth: { user?: unknown } | null }

// The mock above unwraps the auth() wrapper, so the export is the inner
// handler taking just the (augmented) request.
const middleware = wrappedMiddleware as unknown as (
  req: AuthedRequest
) => Promise<Response> | Response

function request(path: string, session: { user?: unknown } | null = null) {
  const url = new URL(`http://localhost:3000${path}`)
  return {
    nextUrl: url,
    auth: session,
    url: url.toString(),
    headers: new Headers({ host: 'localhost:3000' }),
  } as unknown as AuthedRequest
}

function configureAuth() {
  vi.stubEnv('AUTH_SLACK_ID', 'client-id')
  vi.stubEnv('AUTH_SLACK_SECRET', 'client-secret')
  vi.stubEnv('AUTH_SECRET', 'session-secret')
}

beforeEach(() => {
  vi.unstubAllEnvs()
})

describe('middleware', () => {
  it('passes everything through when auth is not configured', async () => {
    const res = (await middleware(request('/teams'))) as Response
    expect(res.status).toBe(200)
  })

  it('passes public paths through without a session', async () => {
    configureAuth()
    const res = (await middleware(request('/login'))) as Response
    expect(res.status).toBe(200)
  })

  it('passes authenticated requests through', async () => {
    configureAuth()
    const res = (await middleware(
      request('/teams', { user: { name: 'Steve' } })
    )) as Response
    expect(res.status).toBe(200)
  })

  it('returns 401 JSON for unauthenticated API requests', async () => {
    configureAuth()
    const res = (await middleware(request('/api/quarters'))) as Response
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('redirects unauthenticated page requests to /login with callbackUrl', async () => {
    configureAuth()
    const res = (await middleware(request('/teams?sort=name'))) as Response
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.origin).toBe('http://localhost:3000')
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toBe('/teams?sort=name')
  })

  it('builds the redirect from forwarded proxy headers when present', async () => {
    configureAuth()
    const req = request('/teams')
    req.headers.set('x-forwarded-host', 'okr.example.com')
    req.headers.set('x-forwarded-proto', 'https')
    const res = (await middleware(req)) as Response
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.origin).toBe('https://okr.example.com')
  })
})
