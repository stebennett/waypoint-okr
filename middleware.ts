import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { hasRole, type Role } from "@/lib/auth/rbac"

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"]

const ROLE_GATED_PREFIXES: { prefix: string; minRole: Role }[] = [
  { prefix: "/admin", minRole: "admin" },
  { prefix: "/teams", minRole: "admin" },
  { prefix: "/quarters", minRole: "admin" },
  { prefix: "/tags", minRole: "admin" },
  { prefix: "/check-in", minRole: "okr_manager" },
]

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
  const role = (req.auth.user as { role?: Role }).role
  for (const { prefix, minRole } of ROLE_GATED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (!hasRole(role, minRole)) {
        return NextResponse.redirect(new URL("/", req.url))
      }
      break
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
