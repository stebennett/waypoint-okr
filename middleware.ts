import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next()
  }
  if (!req.auth?.user) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith("/admin")) {
    if ((req.auth.user as { role?: string }).role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Exclude static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
