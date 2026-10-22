import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAuthConfig, isPublicPath } from '@/lib/auth-config'

export default auth((req) => {
  if (!getAuthConfig()) return NextResponse.next()

  const { pathname, search } = req.nextUrl
  if (isPublicPath(pathname)) return NextResponse.next()
  if (req.auth) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Build the redirect from the client-facing host headers: req.nextUrl is
  // normalized to the server's internal origin, which breaks behind proxies.
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const loginUrl = new URL('/login', `${proto}://${host}`)
  loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
